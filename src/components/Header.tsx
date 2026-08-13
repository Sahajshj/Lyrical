import React from 'react';
import { Menu, Plus, BookOpen, Database, User, LogOut, Music } from 'lucide-react';
import { ViewMode, UserProfile } from '../types';

interface HeaderProps {
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  onNewSong: () => void;
  onOpenAuthModal: () => void;
  onOpenSqlModal: () => void;
  onOpenChordRef: () => void;
  onToggleSidebarMobile: () => void;
  user: UserProfile | null;
  onLogout: () => void;
  isSupabaseConnected: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onNewSong,
  onOpenAuthModal,
  onOpenSqlModal,
  onOpenChordRef,
  onToggleSidebarMobile,
  user,
  onLogout,
  isSupabaseConnected,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#090e1c]/85 backdrop-blur-xl border-b border-white/[0.07] px-2.5 sm:px-6 py-3 max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleSidebarMobile}
            className="lg:hidden p-1.5 bg-[#181818] hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 transition-colors cursor-pointer shrink-0"
            title="Toggle Sidebar Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div 
            onClick={() => setActiveView('library')} 
            className="flex lg:hidden items-center gap-2 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-slate-950 font-bold group-hover:scale-105 transition-transform shadow-[0_0_18px_rgba(16,185,129,0.4)]">
              <Music className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                Chord<span className="text-emerald-400">Flow</span>
              </span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold hidden xs:block">Song workspace</span>
            </div>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-sm font-semibold text-slate-100 capitalize">{activeView}</h1>
            <p className="text-[11px] text-slate-500">Your personal song collection</p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 justify-end">
          {/* Quick Chord Reference Modal Trigger */}
          <button
            onClick={onOpenChordRef}
            className="hidden md:flex px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold items-center gap-1.5 bg-[#181818] hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-100 hover:text-white transition-all cursor-pointer shrink-0"
            title="Open Chord Dictionary"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chords</span>
          </button>

          {/* Supabase Status / SQL Script button */}
          <button
            onClick={onOpenSqlModal}
            className={`px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer shrink-0 ${
              isSupabaseConnected
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                : 'bg-[#181818] border-emerald-500/25 text-slate-300 hover:text-white'
            }`}
            title="Supabase Database Status & Setup SQL"
          >
            <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-400 animate-pulse' : 'text-emerald-400/60'}`} />
            <span className="hidden md:inline">
              {isSupabaseConnected ? 'Synced' : 'Setup'}
            </span>
          </button>

          {/* User Auth */}
          {user ? (
            <div className="flex items-center gap-1 bg-[#181818] border border-emerald-500/30 rounded-xl p-1 pl-2 shrink-0">
              <span className="text-xs text-emerald-100 font-medium truncate max-w-[40px] sm:max-w-[100px]">
                {user.email.split('@')[0]}
              </span>
              <button
                onClick={onLogout}
                className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-300 hover:text-red-400 transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 bg-[#181818] hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Create Song Button */}
          <button
            onClick={onNewSong}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-[0_0_18px_rgba(16,185,129,0.35)] cursor-pointer shrink-0"
            title="Create New Song"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="whitespace-nowrap">New Song</span>
          </button>
        </div>
      </div>
    </header>
  );
};
