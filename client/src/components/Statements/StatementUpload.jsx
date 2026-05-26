import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { parsePdfClient } from '../../utils/pdfParser';
import { parseCsv } from '../../utils/csvParser';
import { detectCategory } from '../../utils/categoryDetector';

function UploadZone({ onFiles, uploading }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  const process = files => { if (files?.length) onFiles(Array.from(files)); };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
        drag ? 'border-brand-500 bg-brand-900/20' : 'border-slate-700 hover:border-slate-600'
      } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input
        ref={ref}
        type="file"
        accept=".pdf,.csv"
        multiple
        className="hidden"
        onChange={e => process(e.target.files)}
      />
      <Upload size={28} className="text-slate-500 mx-auto mb-2" />
      <p className="text-white text-sm font-medium">
        {uploading ? 'Processing…' : 'Drop statements here'}
      </p>
      <p className="text-slate-500 text-xs mt-1">
        Supports CSV & PDF · Chase, BoA, Wells Fargo, Capital One, Citi, Amex
      </p>
    </div>
  );
}

export default function StatementUpload({ onUploaded }) {
  const { state, dispatch } = useExpense();
  const [uploading, setUploading]   = useState(false);
  const [results,   setResults]     = useState([]);   // [{ name, count, status, error, sourceId }]
  const [confirming, setConfirming] = useState(null); // statement id being confirmed
  const [toast,     setToast]       = useState(null); // { msg, type }

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  async function handleFiles(files) {
    setUploading(true);
    const newResults = [];

    for (const file of files) {
      const name     = file.name;
      const ext      = name.split('.').pop().toLowerCase();
      const sourceId = `${name}-${Date.now()}`;

      try {
        let transactions = [];

        if (ext === 'pdf') {
          const res = await parsePdfClient(file);
          transactions = (res.transactions || []).map(t => ({
            ...t,
            id:       `${sourceId}-${t.id}`,
            source:   sourceId,
            category: t.category || detectCategory(t.description),
          }));
        } else if (ext === 'csv') {
          const text = await file.text();
          const res  = await parseCsv(text, sourceId);
          transactions = res.transactions;
        } else {
          throw new Error('Unsupported format. Use CSV or PDF.');
        }

        if (!transactions.length) {
          newResults.push({ name, status: 'warn', msg: 'No transactions found — check format' });
          continue;
        }

        dispatch({ type: 'ADD_BANK_TRANSACTIONS', payload: transactions });
        dispatch({
          type:    'ADD_STATEMENT_META',
          payload: { id: sourceId, name, source: ext, count: transactions.length, date: new Date().toISOString() },
        });

        newResults.push({ name, status: 'ok', count: transactions.length, sourceId });
      } catch (e) {
        newResults.push({ name, status: 'error', msg: e.message });
      }
    }

    setResults(r => [...r, ...newResults]);
    setUploading(false);
    if (newResults.some(r => r.status === 'ok')) onUploaded?.();
  }

  function requestRemove(s) {
    // If already showing confirm for this statement, cancel it (toggle)
    setConfirming(id => id === s.id ? null : s.id);
  }

  function confirmRemove(s) {
    const expCount = state.bankTransactions.filter(t => t.source === s.id).length;
    const payCount = state.paymentTransactions?.filter(t => t.source === s.id).length ?? 0;
    const total    = expCount + payCount;

    dispatch({ type: 'REMOVE_STATEMENT', payload: s.id });
    setResults(r => r.filter(x => x.sourceId !== s.id));
    setConfirming(null);
    showToast(`Removed "${s.name}" — ${total} transaction${total !== 1 ? 's' : ''} cleared`);
  }

  function cancelRemove() {
    setConfirming(null);
  }

  return (
    <div className="space-y-4 relative">

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl
          flex items-center gap-2 text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
        >
          <CheckCircle2 size={15} />
          {toast.msg}
        </div>
      )}

      <UploadZone onFiles={handleFiles} uploading={uploading} />

      {/* Upload feedback */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
              r.status === 'ok'   ? 'bg-emerald-900/30 text-emerald-400' :
              r.status === 'warn' ? 'bg-yellow-900/30 text-yellow-400'  :
                                    'bg-red-900/30 text-red-400'
            }`}>
              {r.status === 'ok'
                ? <CheckCircle2 size={14} />
                : <AlertCircle  size={14} />
              }
              <span className="flex-1 truncate font-medium">{r.name}</span>
              {r.status === 'ok'
                ? <span>{r.count} transactions added</span>
                : <span>{r.msg}</span>
              }
            </div>
          ))}
        </div>
      )}

      {/* Loaded statements */}
      {state.statements.length > 0 && (
        <div>
          <p className="text-slate-400 text-xs font-medium mb-2">
            LOADED STATEMENTS ({state.statements.length})
          </p>
          <div className="space-y-2">
            {state.statements.map(s => {
              const isConfirming = confirming === s.id;
              const expCount = state.bankTransactions.filter(t => t.source === s.id).length;
              const payCount = (state.paymentTransactions || []).filter(t => t.source === s.id).length;
              const total    = expCount + payCount;

              return (
                <div key={s.id}
                  className={`rounded-xl overflow-hidden transition-all ${
                    isConfirming ? 'ring-2 ring-red-500/50' : ''
                  }`}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3 bg-slate-800 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <FileText size={15} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{s.name}</p>
                      <p className="text-slate-500 text-xs">
                        {expCount} expense{expCount !== 1 ? 's' : ''}
                        {payCount > 0 && ` · ${payCount} payment${payCount !== 1 ? 's' : ''}`}
                        {' · '}{s.source.toUpperCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => requestRemove(s)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isConfirming
                          ? 'text-red-400 bg-red-900/30'
                          : 'text-slate-500 hover:text-red-400 hover:bg-red-900/20'
                      }`}
                      title="Remove statement"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Inline confirm banner */}
                  {isConfirming && (
                    <div className="flex items-center gap-2 bg-red-950/60 border-t border-red-900/40 px-3 py-2.5">
                      <Trash2 size={13} className="text-red-400 flex-shrink-0" />
                      <p className="text-red-300 text-xs flex-1">
                        Remove {total} transaction{total !== 1 ? 's' : ''}?
                      </p>
                      <button
                        onClick={cancelRemove}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirmRemove(s)}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
