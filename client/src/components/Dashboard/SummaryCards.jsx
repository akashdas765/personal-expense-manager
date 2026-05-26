import { TrendingDown, Split, Wallet, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

function Card({ icon: Icon, label, value, sub, color, trend }) {
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
  const { totalEffective, totalOriginal, totalSavings, splitCount, personalCount } = summary;
  const splitwiseTotal = transactions
    .filter(t => t.isSplitwised && !t.isSplitOnly)
    .reduce((s, t) => s + (t.effectiveAmount || 0), 0);
  const personalTotal = transactions
    .filter(t => !t.isSplitwised)
    .reduce((s, t) => s + (t.effectiveAmount || 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card
        icon={Wallet}
        label="Total My Expenses"
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
        label="Splitwise Share"
        value={formatCurrency(splitwiseTotal)}
        sub="after splits applied"
        color="bg-gradient-to-br from-violet-600 to-violet-800 text-white"
      />
      <Card
        icon={TrendingDown}
        label="Personal Expenses"
        value={formatCurrency(personalTotal)}
        sub={`${personalCount} full-cost txns`}
        color="bg-gradient-to-br from-orange-500 to-orange-700 text-white"
      />
    </div>
  );
}
