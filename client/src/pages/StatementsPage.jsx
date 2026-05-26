import { useState } from 'react';
import Header from '../components/Layout/Header';
import StatementUpload from '../components/Statements/StatementUpload';
import ManualEntry from '../components/Statements/ManualEntry';
import { useExpense } from '../context/ExpenseContext';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryDetector';

const TABS = ['Upload', 'Manual Entry', 'Transactions'];

export default function StatementsPage() {
  const { state } = useExpense();
  const [tab, setTab] = useState(0);

  const allBankTxns = state.bankTransactions;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header title="Bank Statements" />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-4 space-y-4">

          {/* Stat bar */}
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-white font-semibold">{allBankTxns.length}</p>
              <p className="text-slate-400 text-xs">Total Transactions</p>
            </div>
            <div className="flex-1 bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-white font-semibold">{state.statements.length}</p>
              <p className="text-slate-400 text-xs">Statements</p>
            </div>
            <div className="flex-1 bg-slate-800 rounded-xl px-3 py-2.5">
              <p className="text-white font-semibold">
                {formatCurrency(allBankTxns.reduce((s, t) => s + t.amount, 0))}
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
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  tab === i ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 0 && <StatementUpload />}
          {tab === 1 && <ManualEntry />}
          {tab === 2 && (
            <div className="space-y-2">
              {allBankTxns.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No transactions loaded yet
                </div>
              ) : (
                allBankTxns.slice().reverse().map(txn => (
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
