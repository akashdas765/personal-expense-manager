import { useState, useEffect } from 'react';
import { RefreshCw, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { fetchSplitwiseGroups, fetchSplitwiseExpenses } from '../../services/apiService';
import { formatCurrency } from '../../utils/formatters';

export default function GroupSelector() {
  const { state, dispatch, monthRange } = useExpense();
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading]   = useState(false);
  const [syncing, setSyncing]   = useState(false);

  const { splitwiseApiKey: apiKey, splitwiseGroups: groups, splitwiseExpenses: expenses } = state;

  // Load groups on connect
  useEffect(() => {
    if (apiKey && !groups.length) loadGroups();
  }, [apiKey]);

  async function loadGroups() {
    setLoading(true);
    try {
      const grps = await fetchSplitwiseGroups(apiKey);
      // Filter out the "non-group" (group with id 0 is individual debts)
      dispatch({ type: 'SET_SPLITWISE_GROUPS', payload: grps.filter(g => g.id !== 0) });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', key: 'splitwise', value: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function syncExpenses() {
    if (!apiKey) return;
    setSyncing(true);
    dispatch({ type: 'SET_ERROR', key: 'splitwise', value: null });
    try {
      const { expenses: exps } = await fetchSplitwiseExpenses(apiKey, {
        datedAfter:  monthRange.start,
        datedBefore: monthRange.end,
      });
      dispatch({ type: 'SET_SPLITWISE_EXPENSES', payload: exps });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', key: 'splitwise', value: e.message });
    } finally {
      setSyncing(false);
    }
  }

  if (!apiKey) return null;

  return (
    <div className="space-y-3">
      {/* Sync button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Groups ({groups.length})</p>
          <p className="text-slate-400 text-xs">{expenses.length} expenses loaded for {monthRange.label}</p>
        </div>
        <button
          onClick={syncExpenses}
          disabled={syncing}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60
                     text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {/* Error */}
      {state.errors.splitwise && (
        <div className="text-red-400 text-xs bg-red-900/20 rounded-lg px-3 py-2">
          {state.errors.splitwise}
        </div>
      )}

      {/* Group list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(group => {
            const groupExpenses = expenses.filter(e => e.group_id === group.id);
            const myShare = groupExpenses.reduce((s, e) => s + e.myOwedShare, 0);
            const isOpen  = expanded[group.id];

            return (
              <div key={group.id} className="bg-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(p => ({ ...p, [group.id]: !p[group.id] }))}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center">
                    <Users size={16} className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{group.name}</p>
                    <p className="text-slate-400 text-xs">
                      {groupExpenses.length} expenses · My share: {formatCurrency(myShare)}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {isOpen && groupExpenses.length > 0 && (
                  <div className="border-t border-slate-700 divide-y divide-slate-700/50">
                    {groupExpenses.map(exp => (
                      <div key={exp.id} className="flex items-start gap-3 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{exp.description}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{exp.date?.substring(0,10)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white text-xs">{formatCurrency(exp.myOwedShare)}</p>
                          <p className="text-slate-500 text-xs">of {formatCurrency(exp.cost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && groupExpenses.length === 0 && (
                  <div className="px-3 py-2 text-slate-500 text-xs border-t border-slate-700">
                    No expenses in {monthRange.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
