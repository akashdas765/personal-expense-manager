import { useState, useMemo } from 'react';
import { Search, Filter, Download, ChevronUp, ChevronDown, Trash2, Unlink } from 'lucide-react';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { getCategoryIcon, getCategoryColor, getCategoryLight, ALL_CATEGORIES } from '../../utils/categoryDetector';
import { useExpense } from '../../context/ExpenseContext';

const SORT_FIELDS = { date: 'Date', effectiveAmount: 'Amount', description: 'Name', category: 'Category' };

export default function ExpenseTable({ transactions }) {
  const { dispatch } = useExpense();
  const [search, setSearch]   = useState('');
  const [category, setCat]    = useState('');
  const [type, setType]       = useState(''); // '' | 'split' | 'personal'
  const [sortBy, setSortBy]   = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilter, setShowFilter] = useState(false);

  const sorted = useMemo(() => {
    let rows = [...transactions];

    // Filters
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.description?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
      );
    }
    if (category) rows = rows.filter(r => r.category === category);
    if (type === 'split')    rows = rows.filter(r => r.isSplitwised);
    if (type === 'personal') rows = rows.filter(r => !r.isSplitwised);

    // Sort
    rows.sort((a, b) => {
      let va = a[sortBy]; let vb = b[sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 :  1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    return rows;
  }, [transactions, search, category, type, sortBy, sortDir]);

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  }

  function exportCsv() {
    const header = 'Date,Description,Category,Original Amount,Effective Amount,Savings,Type';
    const rows   = sorted.map(r =>
      [r.date, `"${r.description}"`, r.category,
       r.originalAmount?.toFixed(2), r.effectiveAmount?.toFixed(2),
       (r.savings || 0).toFixed(2),
       r.isSplitwised ? 'Splitwise' : 'Personal'
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const totalEffective = sorted.reduce((s, t) => s + (t.effectiveAmount || 0), 0);
  const totalSavings   = sorted.reduce((s, t) => s + (t.savings || 0), 0);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5
                       text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <button
          onClick={() => setShowFilter(s => !s)}
          className={`p-2.5 rounded-xl border transition-colors ${
            showFilter || category || type
              ? 'bg-brand-600 border-brand-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <Filter size={16} />
        </button>
        <button
          onClick={exportCsv}
          className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Filter row */}
      {showFilter && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
          >
            <option value="">All types</option>
            <option value="split">Split only</option>
            <option value="personal">Personal only</option>
          </select>
          <select
            value={category}
            onChange={e => setCat(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
          >
            <option value="">All categories</option>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(category || type) && (
            <button onClick={() => { setCat(''); setType(''); }}
                    className="text-red-400 text-xs px-2">Clear</button>
          )}
        </div>
      )}

      {/* Summary row */}
      <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2">
        <span className="text-slate-400 text-xs">{sorted.length} transactions</span>
        <div className="flex items-center gap-3">
          {totalSavings > 0 && (
            <span className="text-emerald-400 text-xs">Saved {formatCurrency(totalSavings)}</span>
          )}
          <span className="text-white text-sm font-semibold">{formatCurrency(totalEffective)}</span>
        </div>
      </div>

      {/* Sort header */}
      <div className="grid grid-cols-12 gap-1 px-1 text-slate-500 text-xs font-medium">
        <button className="col-span-3 flex items-center gap-1" onClick={() => toggleSort('date')}>
          Date <SortIcon field="date" />
        </button>
        <button className="col-span-5 flex items-center gap-1" onClick={() => toggleSort('description')}>
          Description <SortIcon field="description" />
        </button>
        <button className="col-span-4 flex items-center gap-1 justify-end" onClick={() => toggleSort('effectiveAmount')}>
          Amount <SortIcon field="effectiveAmount" />
        </button>
      </div>

      {/* Rows */}
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No transactions match your filters</div>
      ) : (
        <div className="space-y-1">
          {sorted.map(txn => (
            <TransactionRow key={txn.id} txn={txn} onDelete={() =>
              dispatch({ type: 'REMOVE_TRANSACTION', payload: txn.id })
            } />
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionRow({ txn, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full grid grid-cols-12 gap-1 items-center px-3 py-2.5 text-left"
        onClick={() => setExpanded(s => !s)}
      >
        {/* Date */}
        <div className="col-span-3">
          <p className="text-slate-400 text-xs">{formatShortDate(txn.date)}</p>
          <div className="mt-0.5">
            {txn.isSplitwised
              ? <span className="text-violet-400 text-xs">Split</span>
              : <span className="text-orange-400 text-xs">Personal</span>
            }
          </div>
        </div>

        {/* Description + category */}
        <div className="col-span-5 min-w-0">
          <p className="text-white text-xs font-medium truncate">{txn.description}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs">{getCategoryIcon(txn.category)}</span>
            <span className="text-slate-500 text-xs truncate">{txn.category}</span>
          </div>
        </div>

        {/* Amounts */}
        <div className="col-span-4 text-right">
          <p className="text-white text-sm font-semibold">{formatCurrency(txn.effectiveAmount)}</p>
          {txn.savings > 0.5 && (
            <p className="text-emerald-400 text-xs">-{formatCurrency(txn.savings)}</p>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-700 px-3 py-2.5 space-y-1.5">
          <DetailRow label="Original amount" value={formatCurrency(txn.originalAmount)} />
          {txn.isSplitwised && (
            <>
              <DetailRow label="Your share"    value={formatCurrency(txn.effectiveAmount)} className="text-violet-400" />
              <DetailRow label="You saved"     value={formatCurrency(txn.savings)} className="text-emerald-400" />
              {txn.splitwiseDesc && (
                <DetailRow label="Splitwise desc" value={txn.splitwiseDesc} />
              )}
              {txn.matchScore && (
                <DetailRow label="Match confidence" value={`${txn.matchScore}%`} />
              )}
            </>
          )}
          <DetailRow label="Source" value={txn.source || '—'} />
          <div className="flex items-center justify-end mt-2">
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-red-400 text-xs hover:text-red-300 transition-colors"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, className }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-xs font-medium ${className || 'text-white'}`}>{value}</span>
    </div>
  );
}
