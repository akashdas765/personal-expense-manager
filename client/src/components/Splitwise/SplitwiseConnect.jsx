import { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { fetchSplitwiseUser } from '../../services/apiService';

export default function SplitwiseConnect() {
  const { state, dispatch } = useExpense();
  const [input, setInput]   = useState(state.splitwiseApiKey || '');
  const [show, setShow]     = useState(false);
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [errMsg, setErrMsg] = useState('');

  const connected = !!state.splitwiseUser;

  async function handleConnect() {
    if (!input.trim()) return;
    setStatus('loading');
    setErrMsg('');
    try {
      const user = await fetchSplitwiseUser(input.trim());
      dispatch({ type: 'SET_API_KEY', payload: input.trim() });
      dispatch({ type: 'SET_SPLITWISE_USER', payload: user });
      setStatus('success');
    } catch (e) {
      setErrMsg(e.response?.data?.error || e.message || 'Connection failed');
      setStatus('error');
    }
  }

  function handleDisconnect() {
    dispatch({ type: 'SET_API_KEY', payload: '' });
    dispatch({ type: 'SET_SPLITWISE_USER', payload: null });
    dispatch({ type: 'SET_SPLITWISE_GROUPS', payload: [] });
    setInput('');
    setStatus(null);
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          connected ? 'bg-emerald-600' : 'bg-slate-700'
        }`}>
          {connected ? <CheckCircle2 size={20} className="text-white" />
                     : <KeyRound size={20} className="text-slate-300" />}
        </div>
        <div>
          <h3 className="text-white font-semibold">Splitwise API Key</h3>
          <p className="text-slate-400 text-xs">
            {connected
              ? `Connected as ${state.splitwiseUser.first_name} ${state.splitwiseUser.last_name}`
              : 'Connect to import your group expenses'}
          </p>
        </div>
      </div>

      {!connected ? (
        <>
          {/* Key input */}
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="Paste your Splitwise API key…"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-10
                         text-white placeholder-slate-500 text-sm focus:outline-none
                         focus:border-brand-500 transition-colors"
            />
            <button
              onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 rounded-lg px-3 py-2">
              <AlertCircle size={14} /> {errMsg}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={!input.trim() || status === 'loading'}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white
                       font-semibold rounded-xl py-3 transition-colors text-sm"
          >
            {status === 'loading' ? 'Connecting…' : 'Connect Splitwise'}
          </button>

          <a
            href="https://secure.splitwise.com/apps/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-brand-400 text-xs hover:text-brand-300"
          >
            <ExternalLink size={12} /> Get your API key from Splitwise
          </a>
        </>
      ) : (
        <button
          onClick={handleDisconnect}
          className="w-full text-red-400 border border-red-900/50 hover:bg-red-900/20
                     font-medium rounded-xl py-2.5 transition-colors text-sm"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}
