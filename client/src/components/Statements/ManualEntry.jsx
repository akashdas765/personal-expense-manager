import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { detectCategory, ALL_CATEGORIES } from '../../utils/categoryDetector';

const BLANK = { date: '', description: '', amount: '', category: '' };

export default function ManualEntry() {
  const { dispatch } = useExpense();
  const [form, setForm]     = useState(BLANK);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors]   = useState({});

  function validate() {
    const errs = {};
    if (!form.date)        errs.date   = 'Required';
    if (!form.description) errs.description = 'Required';
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      errs.amount = 'Enter a valid positive amount';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const txn = {
      id:          `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date:        form.date,
      description: form.description.trim(),
      amount:      parseFloat(form.amount),
      category:    form.category || detectCategory(form.description),
      source:      'manual',
    };

    dispatch({ type: 'ADD_BANK_TRANSACTIONS', payload: [txn] });
    setForm(BLANK);
    setErrors({});
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Date + Amount row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1">Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className={`w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-white text-sm
                       focus:outline-none focus:border-brand-500 transition-colors ${
                         errors.date ? 'border-red-500' : 'border-slate-700'
                       }`}
          />
          {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">Amount (USD) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
            className={`w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-white text-sm
                       focus:outline-none focus:border-brand-500 transition-colors ${
                         errors.amount ? 'border-red-500' : 'border-slate-700'
                       }`}
          />
          {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-slate-400 text-xs mb-1">Description *</label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Trader Joe's, Uber, Netflix…"
          className={`w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-white text-sm
                     focus:outline-none focus:border-brand-500 transition-colors ${
                       errors.description ? 'border-red-500' : 'border-slate-700'
                     }`}
        />
        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Category (optional — auto-detected) */}
      <div>
        <label className="block text-slate-400 text-xs mb-1">
          Category <span className="text-slate-600">(auto-detected if blank)</span>
        </label>
        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5
                     text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
        >
          <option value="">Auto-detect</option>
          {ALL_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className={`w-full flex items-center justify-center gap-2 font-semibold rounded-xl
                   py-3 transition-colors text-sm ${
                     success
                       ? 'bg-emerald-600 text-white'
                       : 'bg-brand-600 hover:bg-brand-500 text-white'
                   }`}
      >
        {success ? <><Check size={16} /> Added!</> : <><Plus size={16} /> Add Transaction</>}
      </button>
    </form>
  );
}
