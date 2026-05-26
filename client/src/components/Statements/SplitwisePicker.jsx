import { useState, useMemo, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { getCategoryIcon } from '../../utils/categoryDetector';
import { useExpense } from '../../context/ExpenseContext';
import { fetchSplitwiseExpenses } from '../../services/apiService';

export default function SplitwisePicker({ transaction, onClose }) {
  const { state, dispatch } = useExpense();
  const [search, setSearch] = useState('');

  // Start with current month's expenses immediately, then load all in background
  const [allExpenses, setAllExpenses] = useState(state.splitwiseExpenses);
  const [loading, setLoading]         = useState(true);

  const groups    = state.splitwiseGroups;
  const groupName = id => groups.find(g => g.id === id)?.name;

  // Fetch ALL expenses (no date filter) so user can link to any month
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { expenses } = await fetchSplitwiseExpenses(state.splitwiseApiKey);
        if (!cancelled) setAllExpenses(expenses);
      } catch {
        // silently keep the current month's data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [state.splitwiseApiKey]);

  // Sort by amount proximity, then by date descending
  const sorted = useMemo(() => {
    const txnAmt = Math.abs(transaction.amount || 0);
    return [...allExpenses]
      .filter(e => {
        if (!search) return true;
        const q = search.toLowerCase();
        return e.description?.toLowerCase().includes(q) ||
               groupName(e.group_id)?.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const da = Math.abs(parseFloat(a.cost) - txnAmt);
        const db = Math.abs(parseFloat(b.cost) - txnAmt);
        if (Math.abs(da - db) < 1) {
          // If similarly priced, prefer more recent
          return (b.date || '').localeCompare(a.date || '');
        }
        return da - db;
      });
  }, [allExpenses, search, transaction.amount]);

  function handleSelect(exp) {
    dispatch({
      type: 'OVERRIDE_TRANSACTION',
      payload: {
        id:   transaction.id,
        data: { splitwiseId: exp.id, forcedUnmatched: false },
      },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-900 rounded-t-3xl max-h-[80vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-sm">Link to Splitwise</p>
                {loading && (
                  <Loader2 size={12} className="text-slate-400 animate-spin flex-shrink-0" />
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5 truncate">
                {transaction.description} · {formatCurrency(transaction.amount)}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Loading hint */}
          {loading && (
            <p className="text-slate-500 text-xs mt-1">Loading all expenses…</p>
          )}

          {/* Search */}
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search expenses…"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5
                         text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Count badge */}
        {!loading && (
          <div className="px-4 py-1.5 border-b border-slate-800/60">
            <p className="text-slate-500 text-xs">
              {sorted.length} expense{sorted.length !== 1 ? 's' : ''} — sorted by closest amount to {formatCurrency(transaction.amount)}
            </p>
          </div>
        )}

        {/* Expense list */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800">
          {sorted.length === 0 && !loading ? (
            <p className="text-slate-500 text-sm text-center py-8">No expenses found</p>
          ) : (
            sorted.map(exp => {
              const amtDiff = Math.abs(parseFloat(exp.cost) - Math.abs(transaction.amount || 0));
              const isClose = amtDiff < parseFloat(exp.cost) * 0.1;
              return (
                <button
                  key={exp.id}
                  onClick={() => handleSelect(exp)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="text-xl flex-shrink-0">{getCategoryIcon(exp.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{exp.description}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {formatShortDate(exp.date)}
                      {groupName(exp.group_id) && (
                        <span className="ml-1.5">· {groupName(exp.group_id)}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`text-sm font-semibold ${isClose ? 'text-emerald-400' : 'text-white'}`}>
                      {formatCurrency(exp.myOwedShare)}
                    </p>
                    <p className="text-slate-500 text-xs">of {formatCurrency(exp.cost)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Safe area spacer */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }} />
      </div>
    </div>
  );
}
