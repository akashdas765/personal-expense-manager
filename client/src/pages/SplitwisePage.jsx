import Header from '../components/Layout/Header';
import SplitwiseConnect from '../components/Splitwise/SplitwiseConnect';
import GroupSelector from '../components/Splitwise/GroupSelector';
import { useExpense } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryDetector';

export default function SplitwisePage() {
  const { state, monthRange } = useExpense();
  const { splitwiseExpenses: expenses, splitwiseUser } = state;

  const totalOwed = expenses.reduce((s, e) => s + e.myOwedShare, 0);
  const totalPaid = expenses.reduce((s, e) => s + e.myPaidShare, 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header title="Splitwise" showMonthNav />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-4 space-y-5">

          {/* Connection card */}
          <SplitwiseConnect />

          {/* Summary chips */}
          {splitwiseUser && expenses.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Expenses', value: expenses.length },
                { label: 'My Share',  value: formatCurrency(totalOwed) },
                { label: 'I Paid',    value: formatCurrency(totalPaid) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-white font-semibold text-sm">{value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Groups + expense list */}
          {splitwiseUser && <GroupSelector />}

          {/* All expenses flat list */}
          {expenses.length > 0 && (
            <div className="bg-slate-900 rounded-2xl p-4">
              <h3 className="text-white font-semibold text-sm mb-3">
                All Expenses — {monthRange.label}
              </h3>
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
