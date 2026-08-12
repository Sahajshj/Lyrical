import React, { useState } from 'react';
import { X, Copy, Check, Database, ShieldCheck, Terminal } from 'lucide-react';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_SCHEMA = `-- Create the songs table for ChordFlow
create table if not exists public.songs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  artist text default '',
  key text default '',
  bpm integer,
  content text not null,
  favorite boolean default false,
  pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_viewed_at timestamp with time zone,
  tags text[] default '{}',
  original_chord_sheet_url text
);

-- Enable Row Level Security (RLS)
alter table public.songs enable row level security;

-- Policy: Users can view their own songs
drop policy if exists "Users can view own songs" on public.songs;
create policy "Users can view own songs" on public.songs
  for select using (auth.uid() = user_id);

-- Policy: Users can insert their own songs
drop policy if exists "Users can insert own songs" on public.songs;
create policy "Users can insert own songs" on public.songs
  for insert with check (auth.uid() = user_id);

-- Policy: Users can update their own songs
drop policy if exists "Users can update own songs" on public.songs;
create policy "Users can update own songs" on public.songs
  for update using (auth.uid() = user_id);

-- Policy: Users can delete their own songs
drop policy if exists "Users can delete own songs" on public.songs;
create policy "Users can delete own songs" on public.songs
  for delete using (auth.uid() = user_id);
`;

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-emerald-500/30 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative text-white max-h-[90vh] flex flex-col backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-emerald-200/60 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 shrink-0">
          <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Supabase Database Setup</h2>
            <p className="text-xs text-emerald-200/60 mt-0.5">Run this SQL in your Supabase SQL Editor to initialize the songs table & RLS policies</p>
          </div>
        </div>

        <div className="bg-[#121212] rounded-xl p-3 border border-emerald-500/20 mb-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-emerald-200/80">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Includes Row Level Security so users can only access their own songs.</span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#121212] p-4 rounded-xl border border-emerald-500/20 font-mono text-xs text-emerald-300 relative">
          <div className="flex items-center gap-1.5 text-emerald-200/50 mb-2 border-b border-emerald-500/20 pb-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>schema.sql</span>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed select-all">{SQL_SCHEMA}</pre>
        </div>

        <div className="mt-4 shrink-0 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-emerald-200 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
