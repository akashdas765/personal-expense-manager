import { useState } from 'react';
import Header from '../components/Layout/Header';
import StatementUpload from '../components/Statements/StatementUpload';
import ManualEntry from '../components/Statements/ManualEntry';
import MatchReview from '../components/Statements/MatchReview';
import { useExpense } from '../context/ExpenseContext';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryDetector';

const TABS = ['Upload', 'Manual Entry', 'Review', 'All Txns'];

export default function StatementsPage() {
  const { state, monthRange, monthlyTransactions } = useExpense();
  const [tab, setTab] = useState(0);

  const bankTxns    = monthlyTransactions.filter(t => !t.isSplitOnly);
  const unmatchedCt = bankTxns.filter(t => !t.isSplitwised).length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header title="Bank Statements" showMonthNav />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-4 space-y-4">

          {/* Stat bar */}
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-white font-semibold">{bankTxns.length}</p>
              <p className="text-slate-400 text-xs">This Month</p>
            </div>
            <div className="flex-1 bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-white font-semibold">{state.statements.length}</p>
              <p className="text-slate-400 text-xs">Statements</p>
            </div>
            <div className="flex-1 bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-white font-semibold">
                {formatCurrency(bankTxns.reduce((s, t) => s + (t.amount || 0), 0))}
              </p>
              <p className="text-slate-400 text-xs">Gross Total</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
            {TABS.map((label, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors relative ${
                  tab === i ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
                {/* Badge on Review tab when there are unmatched transactions */}
                {label === 'Review' && unmatchedCt > 0 && tab !== i && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white
                                   text-xs rounded-full flex items-center justify-center font-bold">
                    {unmatchedCt > 9 ? '9+' : unmatchedCt}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 0 && <StatementUpload onUploaded={() => setTab(2)} />}
          {tab === 1 && <ManualEntry />}
          {tab === 2 && <MatchReview />}
          {tab === 3 && (
            <div className="space-y-2">
              {state.bankTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No transactions loaded yet
                </div>
              ) : (
                state.bankTransactions.slice().reverse().map(txn => (
                  <div key={txn.id} className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2.5">
                    <span className="text-base">{getCategoryIcon(txn.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{txn.description}</p>
                      <p className="text-slate-500 text-xs">{formatShortDate(txn.date)} · {txn.source}</p>
                    </div>
                    <p className="text-white text-sm font-semibold">{formatCurrency(txn.amount)}</p>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
