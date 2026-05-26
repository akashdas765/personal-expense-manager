import { TrendingDown, Split, Wallet, PiggyBank, Receipt } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useExpense } from '../../context/ExpenseContext';

function Card({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={`rounded-2xl p-4 ${color} relative overflow-hidden`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
        <div className="p-2 rounded-xl bg-white/10">
          <Icon size={18} />
        </div>
      </div>
      {/* decorative circle */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
    </div>
  );
}

export default function SummaryCards({ summary, transactions }) {
  const { state } = useExpense();
  const { totalEffective, totalSavings, splitCount, personalCount } = summary;

  // True Splitwise share = sum of myOwedShare across ALL Splitwise expenses
  const splitwiseOwed = (state.splitwiseExpenses || [])
    .reduce((s, e) => s + (e.myOwedShare || 0), 0);

  // Personal-only spend = bank transactions NOT matched to Splitwise
  const personalTotal = transactions
    .filter(t => !t.isSplitwised && !t.isSplitOnly)
    .reduce((s, t) => s + (t.effectiveAmount || 0), 0);

  // Total spend = everything you owe this month
  const totalSpend = splitwiseOwed + personalTotal;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Full-width total at the top */}
      <div className="col-span-2 bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl p-4 relative overflow-hidden border border-slate-600/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Total Spend This Month</p>
            <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {formatCurrency(splitwiseOwed)} splits &nbsp;+&nbsp; {formatCurrency(personalTotal)} personal
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10">
            <Receipt size={22} className="text-white" />
          </div>
        </div>
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/5" />
      </div>

      <Card
        icon={Wallet}
        label="My Actual Spend"
        value={formatCurrency(totalEffective)}
        sub={`${splitCount + personalCount} transactions`}
        color="bg-gradient-to-br from-brand-600 to-brand-800 text-white"
      />
      <Card
        icon={PiggyBank}
        label="Saved via Splits"
        value={formatCurrency(totalSavings)}
        sub={`${splitCount} split txns`}
        color="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white"
      />
      <Card
        icon={Split}
        label="Splitwise My Share"
        value={formatCurrency(splitwiseOwed)}
        sub={`${state.splitwiseExpenses?.length || 0} group expenses`}
        color="bg-gradient-to-br from-violet-600 to-violet-800 text-white"
      />
      <Card
        icon={TrendingDown}
        label="Personal Only"
        value={formatCurrency(personalTotal)}
        sub={`${personalCount} unmatched txns`}
        color="bg-gradient-to-br from-orange-500 to-orange-700 text-white"
      />
    </div>
  );
}
