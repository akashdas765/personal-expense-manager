import { useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';
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

export default function StatementUpload() {
  const { state, dispatch } = useExpense();
  const [uploading, setUploading] = useState(false);
  const [results, setResults]     = useState([]); // [{ name, count, status, error }]

  async function handleFiles(files) {
    setUploading(true);
    const newResults = [];

    for (const file of files) {
      const name = file.name;
      const ext  = name.split('.').pop().toLowerCase();
      const sourceId = `${name}-${Date.now()}`;

      try {
        let transactions = [];

        if (ext === 'pdf') {
          const res = await parsePdfClient(file);
          transactions = (res.transactions || []).map(t => ({
            ...t,
            id:     `${sourceId}-${t.id}`,
            source: sourceId,
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
          type: 'ADD_STATEMENT_META',
          payload: { id: sourceId, name, source: ext, count: transactions.length, date: new Date().toISOString() },
        });

        newResults.push({ name, status: 'ok', count: transactions.length, sourceId });
      } catch (e) {
        newResults.push({ name, status: 'error', msg: e.message });
      }
    }

    setResults(r => [...r, ...newResults]);
    setUploading(false);
  }

  function removeStatement(s) {
    dispatch({ type: 'REMOVE_STATEMENT', payload: s.id });
    setResults(r => r.filter(x => x.sourceId !== s.id));
  }

  return (
    <div className="space-y-4">
      <UploadZone onFiles={handleFiles} uploading={uploading} />

      {/* Upload feedback */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
              r.status === 'ok'    ? 'bg-emerald-900/30 text-emerald-400' :
              r.status === 'warn'  ? 'bg-yellow-900/30 text-yellow-400'  :
                                     'bg-red-900/30 text-red-400'
            }`}>
              {r.status === 'ok'
                ? <CheckCircle2 size={14} />
                : <AlertCircle size={14} />
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
          <p className="text-slate-400 text-xs font-medium mb-2">LOADED STATEMENTS</p>
          <div className="space-y-2">
            {state.statements.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                  <FileText size={15} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.name}</p>
                  <p className="text-slate-500 text-xs">{s.count} transactions · {s.source.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => removeStatement(s)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
