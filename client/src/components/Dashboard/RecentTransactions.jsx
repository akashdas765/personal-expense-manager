import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { getCategoryIcon, getCategoryColor } from '../../utils/categoryDetector';

export default function RecentTransactions({ transactions }) {
  const recent = transactions.slice(0, 6);

  if (!recent.length) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        No transactions yet — upload a bank statement
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recent.map(txn => (
        <div key={txn.id} className="flex items-center gap-3 py-2">
          {/* Icon */}
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base"
               style={{ background: getCategoryColor(txn.category) + '30' }}>
            {getCategoryIcon(txn.category)}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{txn.description}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-500 text-xs">{formatShortDate(txn.date)}</span>
              {txn.isSplitwised && (
                <span className="text-violet-400 text-xs bg-violet-900/30 px-1.5 py-0.5 rounded-full">
                  Split
                </span>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <p className="text-white text-sm font-semibold">{formatCurrency(txn.effectiveAmount)}</p>
            {txn.isSplitwised && txn.savings > 0.5 && (
              <p className="text-emerald-400 text-xs">-{formatCurrency(txn.savings)}</p>
            )}
          </div>
        </div>
      ))}

      <Link
        to="/reports"
        className="flex items-center justify-center gap-2 text-brand-400 text-sm py-2 hover:text-brand-300 transition-colors"
      >
        View all transactions <ArrowRight size={14} />
      </Link>
    </div>
  );
}
