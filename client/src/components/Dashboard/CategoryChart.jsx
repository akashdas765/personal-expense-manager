import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { groupByCategory } from '../../utils/formatters';
import { getCategoryColor, getCategoryIcon } from '../../utils/categoryDetector';
import { formatCurrency } from '../../utils/formatters';

const RADIAN = Math.PI / 180;

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r   = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x   = cx + r * Math.cos(-midAngle * RADIAN);
  const y   = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
          fontSize={11} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-white font-semibold text-sm">{getCategoryIcon(name)} {name}</p>
      <p className="text-brand-300 text-sm">{formatCurrency(value)}</p>
    </div>
  );
}

export default function CategoryChart({ transactions }) {
  const byCategory = groupByCategory(transactions);
  const data = Object.entries(byCategory)
    .map(([cat, { total }]) => ({ name: cat, value: parseFloat(total.toFixed(2)) }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        No expense data yet
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={CustomLabel}
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={getCategoryColor(entry.name)} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend list */}
      <div className="space-y-2 mt-2">
        {data.map(({ name, value }) => {
          const total = data.reduce((s, d) => s + d.value, 0);
          const pct   = total ? Math.round((value / total) * 100) : 0;
          return (
            <div key={name} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                   style={{ background: getCategoryColor(name) }} />
              <span className="text-slate-300 text-sm flex-1">{getCategoryIcon(name)} {name}</span>
              <span className="text-slate-400 text-xs">{pct}%</span>
              <span className="text-white text-sm font-medium w-20 text-right">{formatCurrency(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
