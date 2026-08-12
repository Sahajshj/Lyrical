import React, { useState } from 'react';
import { X, Lock, Mail, Key, Database, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { getSupabase, saveCustomSupabaseConfig, getSupabaseConfig } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  setUser,
}) => {
  const [tab, setTab] = useState<'login' | 'signup' | 'config'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customUrl, setCustomUrl] = useState(getSupabaseConfig().url);
  const [customKey, setCustomKey] = useState(getSupabaseConfig().anonKey);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const supabase = getSupabase();

    if (!supabase) {
      setMessage({
        type: 'error',
        text: 'Supabase client is not configured. Please set your Supabase URL & Anon Key in the Database tab below.',
      });
      setLoading(false);
      return;
    }

    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email || '' });
          setMessage({ type: 'success', text: 'Successfully logged in!' });
          setTimeout(() => {
            onClose();
          }, 800);
        }
      } else if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email || '' });
          setMessage({
            type: 'success',
            text: 'Account created! You are now logged in.',
          });
          setTimeout(() => {
            onClose();
          }, 800);
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomSupabaseConfig(customUrl.trim(), customKey.trim());
    setMessage({
      type: 'success',
      text: 'Supabase credentials saved! Client re-initialized.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-emerald-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-white backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-emerald-200/60 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Supabase Account</h2>
            <p className="text-xs text-emerald-200/60 mt-0.5">Sign in to sync your song library across devices</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#121212] p-1 rounded-xl mb-5 border border-emerald-500/20">
          <button
            type="button"
            onClick={() => { setTab('login'); setMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'login' ? 'bg-[#27272a] text-emerald-300 border border-emerald-500/30 shadow' : 'text-emerald-200/60 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'signup' ? 'bg-[#27272a] text-emerald-300 border border-emerald-500/30 shadow' : 'text-emerald-200/60 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setTab('config'); setMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tab === 'config' ? 'bg-[#27272a] text-emerald-300 border border-emerald-500/30 shadow' : 'text-emerald-200/60 hover:text-white'
            }`}
          >
            <Database className="w-3 h-3" />
            Config
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-start gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                : 'bg-red-950/50 border-red-500/50 text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {(tab === 'login' || tab === 'signup') && (
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-200/70 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="musician@chordflow.app"
                  className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-emerald-200/30 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/70 mb-1">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-emerald-200/30 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Sign In to ChordFlow' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {tab === 'config' && (
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              If environment variables are not set in deployment, you can paste your Supabase Project URL and Public Anon Key directly below:
            </p>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/70 mb-1">Supabase Project URL</label>
              <input
                type="url"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-200/30 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/70 mb-1">Supabase Anon Key</label>
              <textarea
                required
                rows={3}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 rounded-xl p-3 text-xs text-white placeholder-emerald-200/30 outline-none font-mono transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            >
              Save Credentials & Connect
            </button>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-emerald-500/20 text-center">
          <p className="text-[11px] text-emerald-200/50">
            Don't have Supabase credentials yet? Songs will automatically save locally in offline mode!
          </p>
        </div>
      </div>
    </div>
  );
};
