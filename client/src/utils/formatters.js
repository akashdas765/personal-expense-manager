import { format, parseISO, isValid, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

export function formatCurrency(amount, currency = 'USD') {
  if (isNaN(amount) || amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'MMM d');
  } catch {
    return dateStr;
  }
}

export function getMonthRange(date = new Date()) {
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end:   format(endOfMonth(date),   'yyyy-MM-dd'),
    label: format(date, 'MMMM yyyy'),
  };
}

export function prevMonth(date) { return subMonths(date, 1); }
export function nextMonth(date) { return addMonths(date, 1); }

export function parseDate(str) {
  if (!str) return null;
  try {
    const d = parseISO(str);
    return isValid(d) ? d : new Date(str);
  } catch {
    return null;
  }
}

export function groupByDate(transactions) {
  const map = {};
  for (const t of transactions) {
    const key = t.date?.substring(0, 10) || 'unknown';
    if (!map[key]) map[key] = [];
    map[key].push(t);
  }
  return map;
}

export function groupByCategory(transactions) {
  const map = {};
  for (const t of transactions) {
    const cat = t.category || 'Other';
    if (!map[cat]) map[cat] = { total: 0, count: 0, items: [] };
    map[cat].total += t.effectiveAmount || t.amount || 0;
    map[cat].count++;
    map[cat].items.push(t);
  }
  return map;
}

export function percentOf(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
