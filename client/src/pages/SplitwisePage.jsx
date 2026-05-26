import { useState } from 'react';
import Header from '../components/Layout/Header';
import SplitwiseConnect from '../components/Splitwise/SplitwiseConnect';
import GroupSelector from '../components/Splitwise/GroupSelector';
import { useExpense } from '../context/ExpenseContext';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryDetector';
import { ArrowDownLeft } from 'lucide-react';

const TABS = ['Groups', 'All Expenses', 'Received'];

export default function SplitwisePage() {
  const { state, monthRange, monthlyTransactions } = useExpense();
  const { splitwiseExpenses: expenses, splitwiseUser, paymentsReceived = [] } = state;
  const [tab, setTab] = useState(0);

  // Filter payments received to current month
  const monthlyPayments = paymentsReceived.filter(p => {
    if (!p.date) return true;
    const d = p.date.substring(0, 10);
    return d >= monthRange.start && d <= monthRange.end;
  });

  const totalOwed     = expenses.reduce((s, e) => s + e.myOwedShare, 0);
  const totalPaid     = expenses.reduce((s, e) => s + e.myPaidShare, 0);
  const totalReceived = monthlyPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header title="Splitwise" showMonthNav />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-4 space-y-4">

          {/* Connection card */}
          <SplitwiseConnect />

          {/* Summary chips — 2×2 grid */}
          {splitwiseUser && expenses.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Expenses',  value: expenses.length,          color: 'text-white' },
                { label: 'My Share',  value: formatCurrency(totalOwed), color: 'text-violet-400' },
                { label: 'I Paid',    value: formatCurrency(totalPaid), color: 'text-orange-400' },
                { label: 'Received',  value: formatCurrency(totalReceived), color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 rounded-xl px-3 py-3 text-center">
                  <p className={`font-bold text-base ${color}`}>{value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          {splitwiseUser && (
            <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
              {TABS.map((label, i) => (
                <button key={i} onClick={() => setTab(i)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                    tab === i ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}>
                  {label}
                  {label === 'Received' && monthlyPayments.length > 0 && (
                    <span className="ml-1 bg-emerald-600 text-white text-xs rounded-full px-1.5 py-0.5">
                      {monthlyPayments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Groups tab ── */}
          {tab === 0 && splitwiseUser && <GroupSelector />}

          {/* ── All Expenses tab ── */}
          {tab === 1 && (
            <div className="bg-slate-900 rounded-2xl p-4">
              <h3 className="text-white font-semibold text-sm mb-3">
                All Expenses — {monthRange.label}
              </h3>
              {expenses.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No expenses — hit Sync</p>
              ) : (
                <div className="space-y-0.5">
                  {expenses.map(exp => (
                    <div key={exp.id} className="flex items-center gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
                      <div className="w-8 text-center text-base">{getCategoryIcon(exp.category)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{exp.description}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{exp.date?.substring(0, 10)} · {exp.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white text-sm font-semibold">{formatCurrency(exp.myOwedShare)}</p>
                        <p className="text-slate-500 text-xs">of {formatCurrency(exp.cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Received tab ── */}
          {tab === 2 && (
            <div className="space-y-3">
              {/* Total received card */}
              <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border border-emerald-700/30 rounded-2xl p-4">
                <p className="text-emerald-400 text-xs font-medium mb-1">TOTAL RECEIVED — {monthRange.label}</p>
                <p className="text-white text-3xl font-bold">{formatCurrency(totalReceived)}</p>
                <p className="text-slate-400 text-xs mt-1">
                  {monthlyPayments.length} payment{monthlyPayments.length !== 1 ? 's' : ''} from friends
                </p>
              </div>

              {/* Payment list */}
              <div className="bg-slate-900 rounded-2xl p-4">
                {monthlyPayments.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm">No payments received in {monthRange.label}</p>
                    <p className="text-slate-600 text-xs mt-1">Sync to load the latest data</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {monthlyPayments.map(p => (
                      <div key={p.id} className="flex items-center gap-3 py-3 border-b border-slate-800/50 last:border-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                          <ArrowDownLeft size={16} className="text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{p.paidBy} paid you</p>
                          <p className="text-slate-500 text-xs mt-0.5">{formatShortDate(p.date)}</p>
                        </div>
                        <p className="text-emerald-400 text-base font-bold flex-shrink-0">
                          +{formatCurrency(p.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
