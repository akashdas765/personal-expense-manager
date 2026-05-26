import { useExpense } from '../context/ExpenseContext';
import Header from '../components/Layout/Header';
import SummaryCards from '../components/Dashboard/SummaryCards';
import CategoryChart from '../components/Dashboard/CategoryChart';
import SpendingTrend from '../components/Dashboard/SpendingTrend';
import RecentTransactions from '../components/Dashboard/RecentTransactions';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

export default function HomePage() {
  const { state, monthRange } = useExpense();
  const { matchedTransactions: txns, summary, splitwiseUser, bankTransactions } = state;

  const noData = !bankTransactions.length && !state.splitwiseExpenses.length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header title="Dashboard" showMonthNav />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-4 space-y-5">

          {/* Onboarding nudge */}
          {noData && (
            <div className="bg-gradient-to-r from-brand-900 to-violet-900 rounded-2xl p-4 border border-brand-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-brand-300" />
                <p className="text-white font-semibold text-sm">Get Started</p>
              </div>
              <p className="text-slate-300 text-xs mb-3">
                Connect Splitwise and upload your bank statements to automatically calculate your true monthly expenses.
              </p>
              <div className="flex gap-2">
                <Link to="/splitwise"
                  className="flex-1 text-center text-xs bg-brand-600 text-white rounded-lg py-2 font-medium">
                  Connect Splitwise
                </Link>
                <Link to="/statements"
                  className="flex-1 text-center text-xs bg-slate-700 text-white rounded-lg py-2 font-medium">
                  Upload Statements
                </Link>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <SummaryCards summary={summary} transactions={txns} />

          {/* Spending trend */}
          {txns.length > 0 && (
            <div className="bg-slate-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold text-sm">Daily Spending</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-600 inline-block"/>Split</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block"/>Personal</span>
                </div>
              </div>
              <SpendingTrend transactions={txns} currentMonth={state.currentMonth} />
            </div>
          )}

          {/* Category breakdown */}
          <div className="bg-slate-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">By Category</h2>
              {txns.length > 0 && (
                <Link to="/reports" className="text-brand-400 text-xs flex items-center gap-1">
                  Details <ArrowRight size={12} />
                </Link>
              )}
            </div>
            <CategoryChart transactions={txns} />
          </div>

          {/* Recent transactions */}
          <div className="bg-slate-900 rounded-2xl p-4">
            <h2 className="text-white font-semibold text-sm mb-3">Recent Transactions</h2>
            <RecentTransactions transactions={txns} />
          </div>

        </div>
      </div>
    </div>
  );
}
