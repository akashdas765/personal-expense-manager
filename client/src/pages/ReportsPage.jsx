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

  // ── True totals ───────────────────────────────────────────────────────────────
  // Split share = all Splitwise expenses' myOwedShare for the month
  const splitwiseOwed = useMemo(() =>
    (state.splitwiseExpenses || []).reduce((s, e) => s + (e.myOwedShare || 0), 0),
    [state.splitwiseExpenses]
  );

  // Personal = bank transactions NOT matched to Splitwise
  const personalTotal = useMemo(() =>
    txns.filter(t => !t.isSplitwised && !t.isSplitOnly)
        .reduce((s, t) => s + (t.effectiveAmount || 0), 0),
    [txns]
  );

  // Savings = only from bank-matched rows (isSplitOnly inflates this massively)
  const realSavings = useMemo(() =>
    txns.filter(t => !t.isSplitOnly)
        .reduce((s, t) => s + (t.savings || 0), 0),
    [txns]
  );

  // Grand total this month
  const totalSpend = splitwiseOwed + personalTotal;

  // ── Category data ─────────────────────────────────────────────────────────────
  // Use ALL txns (including splitwise-only) so every expense is categorised
  const { categoryData, categoryTotal } = useMemo(() => {
    const map = groupByCategory(txns);
    const data = Object.entries(map)
      .map(([cat, { total }]) => ({ cat, total: parseFloat(total.toFixed(2)) }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
    const catTotal = data.reduce((s, d) => s + d.total, 0);
    return { categoryData: data.slice(0, 8), categoryTotal: catTotal };
  }, [txns]);

  // ── Weekly trend ──────────────────────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    const weeks = {};
    for (const t of txns) {
      if (!t.date) continue;
      const d    = new Date(t.date);
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

  const matchedCount = txns.filter(t => t.isSplitwised && !t.isSplitOnly).length;
  const bankCount    = txns.filter(t => !t.isSplitOnly).length;

  // Split vs Personal comparison bars — use true values
  const comparisonData = [
    { name: 'Splitwise Share', value: parseFloat(splitwiseOwed.toFixed(2)), fill: '#7c3aed' },
    { name: 'Personal Only',   value: parseFloat(personalTotal.toFixed(2)), fill: '#ea580c' },
    { name: 'Saved via Split', value: parseFloat(realSavings.toFixed(2)),   fill: '#10b981' },
  ];

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

              {/* Total spend banner */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600/40 rounded-2xl p-4">
                <p className="text-slate-400 text-xs font-medium mb-1">TOTAL SPEND — {monthRange.label}</p>
                <p className="text-white text-3xl font-bold">{formatCurrency(totalSpend)}</p>
                <p className="text-slate-400 text-xs mt-1">
                  {formatCurrency(splitwiseOwed)} splits &nbsp;+&nbsp; {formatCurrency(personalTotal)} personal
                </p>
              </div>

              {/* Split vs Personal bars */}
              <div className="bg-slate-900 rounded-2xl p-4">
                <h3 className="text-white font-semibold text-sm mb-4">Split vs Personal</h3>
                <div className="space-y-3.5">
                  {comparisonData.map(({ name, value, fill }) => {
                    const max = Math.max(...comparisonData.map(d => d.value), 1);
                    const pct = (value / max) * 100;
                    const pctOfTotal = totalSpend > 0 && name !== 'Saved via Split'
                      ? Math.round((value / totalSpend) * 100) : null;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-400">{name}</span>
                          <div className="flex items-center gap-2">
                            {pctOfTotal !== null && (
                              <span className="text-slate-500">{pctOfTotal}%</span>
                            )}
                            <span className="text-white font-medium">{formatCurrency(value)}</span>
                          </div>
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
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">Spending by Category</h3>
                  <span className="text-slate-400 text-xs">{formatCurrency(categoryTotal)} total</span>
                </div>
                {categoryData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 32)}>
                      <BarChart data={categoryData} layout="vertical"
                                margin={{ left: 8, right: 8, top: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }}
                               tickLine={false} axisLine={false}
                               tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`} />
                        <YAxis type="category" dataKey="cat" tick={{ fill: '#94a3b8', fontSize: 11 }}
                               tickLine={false} axisLine={false} width={90}
                               tickFormatter={v => `${getCategoryIcon(v)} ${v.split(' ')[0]}`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                        <Bar dataKey="total" name="Spent" radius={[0, 4, 4, 0]}>
                          {categoryData.map(entry => (
                            <Cell key={entry.cat} fill={getCategoryColor(entry.cat)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Category legend — % of TOTAL SPEND */}
                    <div className="mt-4 space-y-2.5">
                      {categoryData.map(({ cat, total }) => {
                        const pct = totalSpend > 0 ? Math.round((total / totalSpend) * 100) : 0;
                        const barPct = categoryData[0]?.total > 0
                          ? (total / categoryData[0].total) * 100 : 0;
                        return (
                          <div key={cat}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                   style={{ background: getCategoryColor(cat) }} />
                              <span className="text-slate-300 text-xs flex-1">
                                {getCategoryIcon(cat)} {cat}
                              </span>
                              <span className="text-slate-500 text-xs w-8 text-right">{pct}%</span>
                              <span className="text-white text-xs font-medium w-16 text-right">
                                {formatCurrency(total)}
                              </span>
                            </div>
                            {/* mini progress bar */}
                            <div className="ml-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                   style={{ width: `${barPct}%`, background: getCategoryColor(cat) }} />
                            </div>
                          </div>
                        );
                      })}
                      {/* Show remaining if more than 8 categories */}
                      {(() => {
                        const shownTotal = categoryData.reduce((s, d) => s + d.total, 0);
                        const remaining = totalSpend - shownTotal;
                        if (remaining > 1) {
                          const pct = Math.round((remaining / totalSpend) * 100);
                          return (
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-600 flex-shrink-0" />
                              <span className="text-slate-500 text-xs flex-1">Other categories</span>
                              <span className="text-slate-500 text-xs w-8 text-right">{pct}%</span>
                              <span className="text-slate-500 text-xs font-medium w-16 text-right">
                                {formatCurrency(remaining)}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
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
                <p className="text-white text-2xl font-bold">{formatCurrency(realSavings)}</p>
                <p className="text-slate-400 text-xs mt-1">
                  saved in {monthRange.label} via Splitwise — only your fair share counted.
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  {matchedCount} of {bankCount} bank transactions matched to Splitwise
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
