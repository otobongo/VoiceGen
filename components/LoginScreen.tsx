
import React, { useState } from 'react';
import { Mic, ArrowRight, Loader2, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    
    setIsSubmitting(true);
    await login(email, name);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-indigo-500/10 rounded-xl mb-4 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Mic className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight text-center">Voice<span className="text-indigo-500">Studio</span></h1>
          <p className="text-slate-400 text-sm mt-2 text-center">Professional AI Text-to-Speech Engine</p>
        </div>

        {authError && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-in slide-in-from-top-2">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Authorization Failed</h3>
              <p className="text-xs text-red-200/80 leading-relaxed">{authError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              placeholder="e.g. Sarah Connor"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full bg-slate-950/50 border rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 ${authError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'}`}
              placeholder="name@example.com"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || !email || !name}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-lg transition-all mt-6 flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-indigo-500/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Enter Studio <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-3">Authorized Beta Accounts</p>
           <div className="flex flex-wrap justify-center gap-2">
              {['demo@voicestudio.ai', 'user@example.com'].map(e => (
                 <code key={e} onClick={() => setEmail(e)} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-indigo-400 font-mono cursor-pointer hover:border-indigo-500/50 transition-colors">
                    {e}
                 </code>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
