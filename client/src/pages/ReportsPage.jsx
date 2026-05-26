import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import Header from '../components/Layout/Header';
import ExpenseTable from '../components/Reports/ExpenseTable';
import { useExpense } from '../context/ExpenseContext';
import { formatCurrency, groupByCategory } from '../utils/formatters';
import { getCategoryColor, getCategoryIcon } from '../utils/categoryDetector';

const TABS = ['Summary', 'Table', 'Trends'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { state, monthRange, monthlyTransactions: txns, monthlySummary } = useExpense();
  const [tab, setTab] = useState(0);

  // Category bar chart data
  const categoryData = useMemo(() => {
    const map = groupByCategory(txns);
    return Object.entries(map)
      .map(([cat, { total }]) => ({ cat, total: parseFloat(total.toFixed(2)) }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [txns]);

  // Split vs Personal comparison
  const comparisonData = useMemo(() => {
    const split    = txns.filter(t => t.isSplitwised && !t.isSplitOnly).reduce((s,t) => s + (t.effectiveAmount||0), 0);
    const personal = txns.filter(t => !t.isSplitwised).reduce((s,t) => s + (t.effectiveAmount||0), 0);
    const saved    = txns.reduce((s,t) => s + (t.savings||0), 0);
    return [
      { name: 'Split Share',     value: parseFloat(split.toFixed(2)),    fill: '#7c3aed' },
      { name: 'Personal',        value: parseFloat(personal.toFixed(2)), fill: '#ea580c' },
      { name: 'Saved via Split', value: parseFloat(saved.toFixed(2)),    fill: '#10b981' },
    ];
  }, [txns]);

  // Weekly trend
  const weeklyData = useMemo(() => {
    const weeks = {};
    for (const t of txns) {
      if (!t.date) continue;
      const d = new Date(t.date);
      const week = `W${Math.ceil(d.getDate() / 7)}`;
      if (!weeks[week]) weeks[week] = { week, split: 0, personal: 0 };
      if (t.isSplitwised) weeks[week].split    += t.effectiveAmount || 0;
      else                weeks[week].personal += t.effectiveAmount || 0;
    }
    return Object.values(weeks).map(w => ({
      ...w,
      split:    parseFloat(w.split.toFixed(2)),
      personal: parseFloat(w.personal.toFixed(2)),
    }));
  }, [txns]);

  const totalSavings = txns.reduce((s,t) => s + (t.savings||0), 0);
  const matchedCount = txns.filter(t => t.isSplitwised && !t.isSplitOnly).length;
  const bankCount    = txns.filter(t => !t.isSplitOnly).length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header title="Reports" showMonthNav />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-4 space-y-4">

          {/* Tabs */}
          <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
            {TABS.map((label, i) => (
              <button key={i} onClick={() => setTab(i)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  tab === i ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── SUMMARY TAB ── */}
          {tab === 0 && (
            <div className="space-y-4">
              {/* Split vs Personal bars */}
              <div className="bg-slate-900 rounded-2xl p-4">
                <h3 className="text-white font-semibold text-sm mb-4">Split vs Personal</h3>
                <div className="space-y-3.5">
                  {comparisonData.map(({ name, value, fill }) => {
                    const max = Math.max(...comparisonData.map(d => d.value), 1);
                    const pct = (value / max) * 100;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-400">{name}</span>
                          <span className="text-white font-medium">{formatCurrency(value)}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                               style={{ width: `${pct}%`, background: fill }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category bar chart */}
              <div className="bg-slate-900 rounded-2xl p-4">
                <h3 className="text-white font-semibold text-sm mb-3">Spending by Category</h3>
                {categoryData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={categoryData} layout="vertical"
                                margin={{ left: 8, right: 8, top: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }}
                               tickLine={false} axisLine={false}
                               tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`} />
                        <YAxis type="category" dataKey="cat" tick={{ fill: '#94a3b8', fontSize: 11 }}
                               tickLine={false} axisLine={false} width={82}
                               tickFormatter={v => `${getCategoryIcon(v)} ${v.split(' ')[0]}`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                        <Bar dataKey="total" name="Spent" radius={[0, 4, 4, 0]}>
                          {categoryData.map(entry => (
                            <Cell key={entry.cat} fill={getCategoryColor(entry.cat)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Category legend list */}
                    <div className="mt-3 space-y-2">
                      {categoryData.map(({ cat, total }) => {
                        const totalAll = categoryData.reduce((s, d) => s + d.total, 0);
                        const pct = totalAll ? Math.round((total / totalAll) * 100) : 0;
                        return (
                          <div key={cat} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                 style={{ background: getCategoryColor(cat) }} />
                            <span className="text-slate-300 text-xs flex-1">{getCategoryIcon(cat)} {cat}</span>
                            <span className="text-slate-500 text-xs">{pct}%</span>
                            <span className="text-white text-xs font-medium">{formatCurrency(total)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-6">No expense data yet</p>
                )}
              </div>
            </div>
          )}

          {/* ── TABLE TAB ── */}
          {tab === 1 && <ExpenseTable transactions={txns} />}

          {/* ── TRENDS TAB ── */}
          {tab === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-2xl p-4">
                <h3 className="text-white font-semibold text-sm mb-3">Weekly Spending — {monthRange.label}</h3>
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false}
                             tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                      <Bar dataKey="split"    name="Split Share" stackId="a" fill="#7c3aed" radius={[0,0,0,0]} />
                      <Bar dataKey="personal" name="Personal"    stackId="a" fill="#ea580c" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-6">No transaction data yet</p>
                )}
              </div>

              {/* Savings insight */}
              <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-700/30 rounded-2xl p-4">
                <h3 className="text-emerald-400 font-semibold text-sm mb-2">💰 Savings Insight</h3>
                <p className="text-white text-2xl font-bold">{formatCurrency(totalSavings)}</p>
                <p className="text-slate-400 text-xs mt-1">
                  saved in {monthRange.label} via Splitwise — only your fair share counted.
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  {matchedCount} of {bankCount} transactions matched to Splitwise expenses
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
