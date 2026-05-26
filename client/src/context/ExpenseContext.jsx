import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { getMonthRange, prevMonth, nextMonth } from '../utils/formatters';
import { matchTransactions, computeSummary } from '../utils/matcher';
import { fetchSplitwiseUser, DEFAULT_API_KEY } from '../services/apiService';

const LS_KEY = 'expense_mgr_v1';

// ── State shape ───────────────────────────────────────────────────────────────
const initialState = {
  // Auth — key is hardcoded; app auto-connects on first load
  splitwiseApiKey: DEFAULT_API_KEY,
  splitwiseUser:   null,
  splitwiseGroups: [],

  // Date range
  currentMonth: new Date(),

  // Raw data
  splitwiseExpenses: [],  // fetched from Splitwise
  bankTransactions:  [],  // uploaded / manually entered

  // Computed
  matchedTransactions: [],
  summary: { totalOriginal: 0, totalEffective: 0, totalSavings: 0, splitCount: 0, personalCount: 0 },

  // UI state
  loading: { splitwise: false, bank: false },
  errors:  { splitwise: null, bank: null },

  // Statements list (per upload session)
  statements: [], // [{ id, name, source, count, date }]

  // Manual overrides: { txnId: { isSplitwised, category, effectiveAmount } }
  overrides: {},
};

// ── Actions ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, splitwiseApiKey: action.payload };

    case 'SET_SPLITWISE_USER':
      return { ...state, splitwiseUser: action.payload };

    case 'SET_SPLITWISE_GROUPS':
      return { ...state, splitwiseGroups: action.payload };

    case 'SET_SPLITWISE_EXPENSES': {
      const expenses = action.payload;
      const matched  = matchTransactions(state.bankTransactions, expenses, state.overrides);
      return {
        ...state,
        splitwiseExpenses:   expenses,
        matchedTransactions: matched,
        summary:             computeSummary(matched),
      };
    }

    case 'ADD_BANK_TRANSACTIONS': {
      const existing = state.bankTransactions.filter(t => !action.payload.some(n => n.id === t.id));
      const combined = [...existing, ...action.payload];
      const matched  = matchTransactions(combined, state.splitwiseExpenses, state.overrides);
      return {
        ...state,
        bankTransactions:    combined,
        matchedTransactions: matched,
        summary:             computeSummary(matched),
      };
    }

    case 'REMOVE_STATEMENT': {
      const updated = state.bankTransactions.filter(t => t.source !== action.payload);
      const matched = matchTransactions(updated, state.splitwiseExpenses, state.overrides);
      return {
        ...state,
        bankTransactions:    updated,
        statements:          state.statements.filter(s => s.id !== action.payload),
        matchedTransactions: matched,
        summary:             computeSummary(matched),
      };
    }

    case 'ADD_STATEMENT_META':
      return { ...state, statements: [...state.statements.filter(s => s.id !== action.payload.id), action.payload] };

    case 'OVERRIDE_TRANSACTION': {
      const overrides = { ...state.overrides, [action.payload.id]: action.payload.data };
      const matched   = matchTransactions(state.bankTransactions, state.splitwiseExpenses, overrides);
      return {
        ...state,
        overrides,
        matchedTransactions: matched,
        summary:             computeSummary(matched),
      };
    }

    case 'REMOVE_TRANSACTION': {
      const updated = state.bankTransactions.filter(t => t.id !== action.payload);
      const matched = matchTransactions(updated, state.splitwiseExpenses, state.overrides);
      return {
        ...state,
        bankTransactions:    updated,
        matchedTransactions: matched,
        summary:             computeSummary(matched),
      };
    }

    case 'SET_MONTH': {
      return { ...state, currentMonth: action.payload };
    }

    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, [action.key]: action.value } };

    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.key]: action.value } };

    case 'CLEAR_ALL':
      return { ...initialState, splitwiseApiKey: state.splitwiseApiKey, splitwiseUser: state.splitwiseUser };

    case 'HYDRATE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const ExpenseContext = createContext(null);

export function ExpenseProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from localStorage + auto-connect Splitwise
  useEffect(() => {
    async function init() {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (saved.overrides)       dispatch({ type: 'HYDRATE', payload: { overrides: saved.overrides } });
        if (saved.statements)      dispatch({ type: 'HYDRATE', payload: { statements: saved.statements } });
        if (saved.bankTransactions?.length) {
          dispatch({ type: 'ADD_BANK_TRANSACTIONS', payload: saved.bankTransactions });
        }

        // Auto-connect: use saved user or fetch fresh
        const user = saved.splitwiseUser || null;
        if (user) {
          dispatch({ type: 'SET_SPLITWISE_USER', payload: user });
        } else {
          // First visit — auto-connect with hardcoded key
          try {
            const freshUser = await fetchSplitwiseUser(DEFAULT_API_KEY);
            dispatch({ type: 'SET_SPLITWISE_USER', payload: freshUser });
          } catch { /* silently fail if offline or key invalid */ }
        }
      } catch { /* ignore */ }
    }
    init();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        splitwiseApiKey:  state.splitwiseApiKey,
        splitwiseUser:    state.splitwiseUser,
        overrides:        state.overrides,
        statements:       state.statements,
        bankTransactions: state.bankTransactions,
      }));
    } catch { /* ignore */ }
  }, [state.splitwiseApiKey, state.splitwiseUser, state.overrides, state.statements, state.bankTransactions]);

  const monthRange = getMonthRange(state.currentMonth);

  // Filter matched transactions to ONLY the selected month
  const monthlyTransactions = state.matchedTransactions.filter(t => {
    if (!t.date) return false;
    const d = t.date.substring(0, 10);
    return d >= monthRange.start && d <= monthRange.end;
  });

  // Re-compute summary for the filtered month only
  const monthlySummary = computeSummary(monthlyTransactions);

  return (
    <ExpenseContext.Provider value={{ state, dispatch, monthRange, monthlyTransactions, monthlySummary }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpense() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpense must be used inside <ExpenseProvider>');
  return ctx;
}
