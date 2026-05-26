import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { formatCurrency } from '../../utils/formatters';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function SpendingTrend({ transactions, currentMonth }) {
  // Build daily spending data for the current month
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyMap = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    dailyMap[key] = { splitwise: 0, personal: 0 };
  }

  for (const t of transactions) {
    if (!t.date) continue;
    const key = t.date.substring(0, 10);
    if (!dailyMap[key]) continue;
    if (t.isSplitwised && !t.isSplitOnly) {
      dailyMap[key].splitwise += t.effectiveAmount || 0;
    } else if (!t.isSplitwised) {
      dailyMap[key].personal += t.effectiveAmount || 0;
    }
  }

  const chartData = Object.entries(dailyMap)
    .map(([date, vals]) => ({
      date,
      label: format(parseISO(date), 'd'),
      splitwise: parseFloat(vals.splitwise.toFixed(2)),
      personal:  parseFloat(vals.personal.toFixed(2)),
      total:     parseFloat((vals.splitwise + vals.personal).toFixed(2)),
    }))
    .filter((_, i, arr) => {
      // Show every 3rd day or active days for cleaner x-axis
      return true;
    });

  // Filter to only show days with activity or every 5th label
  const visibleData = chartData.filter(d => d.total > 0 || parseInt(d.label) % 5 === 0 || parseInt(d.label) === 1 || parseInt(d.label) === daysInMonth);

  if (!transactions.length) {
    return (
      <div className="flex items-center justify-center h-36 text-slate-500 text-sm">
        Upload statements to see spending trend
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
        <Bar dataKey="splitwise" name="Split Share" stackId="a" fill="#7c3aed" radius={[0,0,0,0]} />
        <Bar dataKey="personal"  name="Personal"   stackId="a" fill="#ea580c" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
