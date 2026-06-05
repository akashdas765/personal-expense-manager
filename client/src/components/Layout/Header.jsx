import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { prevMonth, nextMonth, getMonthRange } from '../../utils/formatters';
import { format } from 'date-fns';

export default function Header({ title, showMonthNav = false }) {
  const { state, dispatch, monthRange } = useExpense();
  const [showClearMenu, setShowClearMenu] = useState(false);

  const handlePrev = () =>
    dispatch({ type: 'SET_MONTH', payload: prevMonth(state.currentMonth) });
  const handleNext = () =>
    dispatch({ type: 'SET_MONTH', payload: nextMonth(state.currentMonth) });
  const isFuture = state.currentMonth > new Date();

  function clearAll() {
    dispatch({ type: 'CLEAR_ALL' });
    localStorage.clear();
    setShowClearMenu(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
      <div className="px-4 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">{title}</h1>
            {state.splitwiseUser && (
              <p className="text-slate-400 text-xs">
                {state.splitwiseUser.first_name} {state.splitwiseUser.last_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Avatar — tap to reveal clear button */}
            <div className="relative">
              <button
                onClick={() => setShowClearMenu(v => !v)}
                className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold"
              >
                {state.splitwiseUser?.first_name?.[0] || 'U'}
              </button>

              {showClearMenu && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowClearMenu(false)} />
                  <div className="absolute right-0 top-10 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-44 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-700">
                      <p className="text-white text-xs font-medium truncate">
                        {state.splitwiseUser?.first_name} {state.splitwiseUser?.last_name}
                      </p>
                      <p className="text-slate-500 text-xs">{state.splitwiseUser?.email}</p>
                    </div>
                    <button
                      onClick={clearAll}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-red-900/20 transition-colors text-sm"
                    >
                      <Trash2 size={14} />
                      Clear all data
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Month navigation */}
        {showMonthNav && (
          <div className="flex items-center justify-between mt-2 bg-slate-800 rounded-xl px-2 py-1.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-white font-medium text-sm">{monthRange.label}</span>
            <button
              onClick={handleNext}
              disabled={isFuture}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
