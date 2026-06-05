import { useState } from 'react';
import { Link2, Unlink, CheckCircle2, AlertCircle, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { getCategoryIcon } from '../../utils/categoryDetector';
import { useExpense } from '../../context/ExpenseContext';
import SplitwisePicker from './SplitwisePicker';

export default function MatchReview() {
  const { state, dispatch, monthlyTransactions, monthRange } = useExpense();
  const [filter, setFilter]     = useState(0); // 0=All 1=Unmatched 2=Matched
  const [picker, setPicker]     = useState(null);
  const [expanded, setExpanded] = useState({});

  const groups    = state.splitwiseGroups;
  const groupName = id => groups.find(g => g.id === id)?.name;

  // Only real expense bank transactions
  const bankTxns  = monthlyTransactions.filter(t => !t.isSplitOnly && !t.isPayment);
  const matched   = bankTxns.filter(t => t.isSplitwised);
  const unmatched = bankTxns.filter(t => !t.isSplitwised);
  const displayed = filter === 1 ? unmatched : filter === 2 ? matched : bankTxns;

  // ── Live balance ──────────────────────────────────────────────────────────────
  const effectiveTotal = bankTxns.reduce((s, t) => s + (t.effectiveAmount || 0), 0);
  const grossTotal     = bankTxns.reduce((s, t) => s + (t.originalAmount  || t.amount || 0), 0);
  const savedTotal     = matched.reduce((s, t) => s + (t.savings || 0), 0);

  function unlink(txn) {
    dispatch({
      type: 'OVERRIDE_TRANSACTION',
      payload: { id: txn.id, data: { forcedUnmatched: true, splitwiseId: null } },
    });
  }

  function clearOverride(txn) {
    const overrides = { ...state.overrides };
    delete overrides[txn.id];
    dispatch({ type: 'HYDRATE', payload: { overrides } });
  }

  // Resolve Splitwise expense — check current month list first,
  // then fall back to stored expenseData in override (for cross-month links)
  function resolveSwExp(txn) {
    if (!txn.isSplitwised) return null;
    return (
      state.splitwiseExpenses.find(e => e.id === txn.splitwiseId) ||
      state.overrides[txn.id]?.expenseData ||
      null
    );
  }

  if (!bankTxns.length) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        <p>Upload a bank statement first,</p>
        <p className="mt-1">then come back here to review matches.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Live balance card ── */}
      <div className="bg-slate-800/80 border border-slate-700/40 rounded-2xl p-4">
        <p className="text-slate-400 text-xs font-medium mb-2">MY BALANCE — {monthRange.label}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white text-2xl font-bold">{formatCurrency(effectiveTotal)}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              of {formatCurrency(grossTotal)} gross
            </p>
          </div>
          {savedTotal > 0.5 && (
            <div className="text-right">
              <p className="text-emerald-400 text-sm font-semibold">-{formatCurrency(savedTotal)}</p>
              <p className="text-slate-500 text-xs">saved via splits</p>
            </div>
          )}
        </div>
        {/* Progress bar: effective vs gross */}
        {grossTotal > 0 && (
          <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${Math.min((effectiveTotal / grossTotal) * 100, 100)}%` }}
            />
          </div>
        )}
        <p className="text-slate-600 text-xs mt-1.5">
          {matched.length} matched · {unmatched.length} unmatched
        </p>
      </div>

      {/* ── Filter chips ── */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryChip label="All"          value={bankTxns.length} color="text-white"        active={filter === 0} onClick={() => setFilter(0)} />
        <SummaryChip label="✅ Matched"   value={matched.length}  color="text-emerald-400"  active={filter === 2} onClick={() => setFilter(2)} />
        <SummaryChip label="⚠️ Unmatched" value={unmatched.length} color="text-orange-400" active={filter === 1} onClick={() => setFilter(1)} />
      </div>

      {/* Hint */}
      {filter !== 2 && unmatched.length > 0 && (
        <p className="text-slate-500 text-xs">
          Tap <span className="text-brand-400">Link</span> on any unmatched transaction to connect it to a Splitwise expense.
        </p>
      )}

      {/* ── Transaction list ── */}
      <div className="space-y-2">
        {displayed.map(txn => {
          const isOpen      = expanded[txn.id];
          const isOverridden = !!state.overrides[txn.id];
          const sw           = resolveSwExp(txn);

          return (
            <div key={txn.id}
                 className={`rounded-2xl overflow-hidden border transition-colors ${
                   txn.isSplitwised
                     ? 'border-emerald-800/40 bg-slate-900'
                     : 'border-orange-800/30 bg-slate-900'
                 }`}>

              {/* Main row */}
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpanded(p => ({ ...p, [txn.id]: !p[txn.id] }))}
              >
                <div className="flex-shrink-0">
                  {txn.isSplitwised
                    ? <CheckCircle2 size={18} className="text-emerald-400" />
                    : <AlertCircle  size={18} className="text-orange-400" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{getCategoryIcon(txn.category)}</span>
                    <p className="text-white text-sm font-medium truncate">{txn.description}</p>
                    {isOverridden && (
                      <span className="text-xs bg-brand-900/50 text-brand-400 px-1.5 rounded-full flex-shrink-0">manual</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {formatShortDate(txn.date)}
                    {txn.isSplitwised && sw && (
                      <span className="ml-1.5 text-emerald-500">
                        · {sw.description}
                        {groupName(txn.groupId) ? ` · ${groupName(txn.groupId)}` : ''}
                      </span>
                    )}
                  </p>
                </div>

                {/* Amount — shows effective (split share or full) */}
                <div className="text-right flex-shrink-0 mr-1">
                  <p className="text-white text-sm font-semibold">{formatCurrency(txn.effectiveAmount)}</p>
                  {txn.isSplitwised && txn.savings > 0.5 && (
                    <p className="text-emerald-400 text-xs">-{formatCurrency(txn.savings)}</p>
                  )}
                </div>
                {isOpen
                  ? <ChevronUp   size={14} className="text-slate-500 flex-shrink-0" />
                  : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
                }
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-slate-800 px-3 pb-3 pt-2 space-y-2">
                  {txn.isSplitwised && sw ? (
                    <div className="bg-emerald-900/20 rounded-xl p-2.5 space-y-1">
                      <p className="text-emerald-400 text-xs font-medium">✅ Matched to Splitwise</p>
                      <Row label="Expense"    value={sw.description} />
                      <Row label="Total cost" value={formatCurrency(sw.cost)} />
                      <Row label="Your share" value={formatCurrency(sw.myOwedShare)} valueClass="text-emerald-400 font-semibold" />
                      <Row label="You save"   value={`-${formatCurrency(txn.savings)}`} valueClass="text-emerald-400" />
                      {groupName(txn.groupId) && <Row label="Group" value={groupName(txn.groupId)} />}
                      {!txn.manualOverride && (
                        <Row
                          label="Confidence"
                          value={`${txn.matchScore}%`}
                          valueClass={txn.matchScore >= 70 ? 'text-emerald-400' : txn.matchScore >= 50 ? 'text-yellow-400' : 'text-orange-400'}
                        />
                      )}
                    </div>
                  ) : txn.isSplitwised ? (
                    /* Linked but expense not in state (rare) */
                    <div className="bg-emerald-900/20 rounded-xl p-2.5">
                      <p className="text-emerald-400 text-xs">Linked · expense details loading…</p>
                    </div>
                  ) : (
                    <div className="bg-orange-900/20 rounded-xl p-2.5">
                      <p className="text-orange-400 text-xs">No Splitwise match — full amount counts as personal expense.</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {txn.isSplitwised ? (
                      <>
                        <button
                          onClick={() => { unlink(txn); setExpanded(p => ({ ...p, [txn.id]: false })); }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-orange-400
                                     border border-orange-800/40 rounded-xl py-2 hover:bg-orange-900/20 transition-colors"
                        >
                          <Unlink size={13} /> Unlink
                        </button>
                        <button
                          onClick={() => { setPicker(txn); setExpanded(p => ({ ...p, [txn.id]: false })); }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-brand-400
                                     border border-brand-800/40 rounded-xl py-2 hover:bg-brand-900/20 transition-colors"
                        >
                          <Pencil size={13} /> Change link
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setPicker(txn); setExpanded(p => ({ ...p, [txn.id]: false })); }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-brand-400
                                     border border-brand-800/40 rounded-xl py-2 hover:bg-brand-900/20 transition-colors"
                        >
                          <Link2 size={13} /> Link to Splitwise
                        </button>
                        {isOverridden && (
                          <button
                            onClick={() => clearOverride(txn)}
                            className="flex items-center justify-center gap-1 text-xs text-slate-400
                                       border border-slate-700 rounded-xl px-3 py-2 hover:bg-slate-800 transition-colors"
                          >
                            Auto
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {picker && (
        <SplitwisePicker transaction={picker} onClose={() => setPicker(null)} />
      )}
    </div>
  );
}

function Row({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function SummaryChip({ label, value, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-2 py-2.5 text-center transition-colors border ${
        active ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-transparent hover:border-slate-700'
      }`}
    >
      <p className={`font-bold text-base ${color}`}>{value}</p>
      <p className="text-slate-400 text-xs mt-0.5 leading-tight">{label}</p>
    </button>
  );
}
