import React, { useState, useEffect } from 'react';
import { 
  Music, Plus, Pin, Heart, Tag, Database, User, 
  BookOpen, Link2, Upload, Download, Sparkles, ChevronRight, X
} from 'lucide-react';
import { Song } from '../types';

interface SidebarProps {
  songs: Song[];
  activeView: 'library' | 'editor' | 'reader';
  setActiveView: (view: 'library' | 'editor' | 'reader') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewSong: () => void;
  onOpenChordRef: () => void;
  onOpenAuthModal: () => void;
  onOpenSqlModal: () => void;
  onOpenImportUrlModal: () => void;
  onTriggerFileUpload: () => void;
  onExportBackup: () => void;
  onLoadSamples: () => void;
  user: any;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  songs,
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  onNewSong,
  onOpenChordRef,
  onOpenAuthModal,
  onOpenSqlModal,
  onOpenImportUrlModal,
  onTriggerFileUpload,
  onExportBackup,
  onLoadSamples,
  user,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  // Local state for user's custom created tags
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chordflow_custom_sidebar_tags');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newTagInput, setNewTagInput] = useState('');

  // Persist custom tags
  useEffect(() => {
    localStorage.setItem('chordflow_custom_sidebar_tags', JSON.stringify(customTags));
  }, [customTags]);

  // Calculate category stats
  const pinnedCount = songs.filter((s) => s.pinned).length;
  const favoriteCount = songs.filter((s) => s.favorite).length;

  // Combine song tags with user's custom tags
  const songTags = songs.flatMap((s) => s.tags || []).filter((t): t is string => Boolean(t && typeof t === 'string' && t.trim()));
  const allUniqueTags = Array.from(new Set([...customTags, ...songTags]));

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = newTagInput.trim().replace(/^#/, '');
    if (cleaned && !allUniqueTags.includes(cleaned)) {
      setCustomTags((prev) => [...prev, cleaned]);
      setSearchQuery(cleaned);
    }
    setNewTagInput('');
  };

  const handleRemoveCustomTag = (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomTags((prev) => prev.filter((t) => t !== tagToRemove));
    if (searchQuery.toLowerCase().trim() === tagToRemove.toLowerCase().trim() || searchQuery.toLowerCase().trim() === `#${tagToRemove.toLowerCase().trim()}`) {
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-full lg:h-auto lg:min-h-screen lg:self-stretch w-72 lg:w-64 bg-[#0b1020] border-r border-white/[0.07] text-white flex flex-col transition-transform duration-300 ease-in-out shrink-0 ${
          isOpenMobile ? 'translate-x-0 shadow-[0_0_30px_rgba(16,185,129,0.25)]' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-emerald-500/20">
          {/* Header Brand */}
          <div className="flex items-center justify-between pt-1 pb-3 border-b border-emerald-500/20">
            <div
              onClick={() => {
                setActiveView('library');
                setSearchQuery('');
                setIsOpenMobile(false);
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-[0_0_18px_rgba(16,185,129,0.45)] group-hover:scale-105 transition-transform">
                <Music className="w-5 h-5 fill-slate-950 text-slate-950" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  Chord<span className="text-emerald-400">Flow</span>
                </span>
                <span className="block text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold">
                  Your song workspace
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpenMobile(false)}
              className="lg:hidden p-1.5 text-emerald-200/60 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CATEGORY 1: MASTER LIBRARY VIEWS */}
          <div className="space-y-1">
            <h3 className="px-2 text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-2">
              Library Navigation
            </h3>

            <button
              onClick={() => {
                setActiveView('library');
                setSearchQuery('');
                setIsOpenMobile(false);
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeView === 'library' && !searchQuery
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'text-slate-300 hover:bg-emerald-500/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Music className="w-4 h-4 text-emerald-400" />
                <span>All Songs</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#181818] text-[10px] text-emerald-300 font-mono">
                {songs.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveView('library');
                setSearchQuery('');
                setIsOpenMobile(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Pin className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                <span>Pinned Songs</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#181818] text-[10px] text-emerald-300 font-mono">
                {pinnedCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveView('library');
                setSearchQuery('');
                setIsOpenMobile(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-red-400 fill-red-400/20" />
                <span>Favorites</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#181818] text-[10px] text-emerald-300 font-mono">
                {favoriteCount}
              </span>
            </button>
          </div>

          {/* CATEGORY 2: CUSTOM TAG CREATOR & FILTERS */}
          <div className="space-y-2 pt-2 border-t border-emerald-500/15">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-400" />
                <span>Custom Tags</span>
              </h3>
              {allUniqueTags.length > 0 && (
                <span className="text-[10px] text-emerald-300/50 font-mono">
                  {allUniqueTags.length} tags
                </span>
              )}
            </div>

            {/* Add Custom Tag Form */}
            <form onSubmit={handleAddCustomTag} className="flex gap-1 px-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Create new tag..."
                className="flex-1 bg-[#181818] border border-emerald-500/30 focus:border-emerald-400 text-white placeholder-emerald-200/30 text-xs rounded-xl px-2.5 py-1.5 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!newTagInput.trim()}
                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-0.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add</span>
              </button>
            </form>

            {/* Tags Chip List */}
            {allUniqueTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 px-1 max-h-40 overflow-y-auto pt-1">
                {allUniqueTags.map((tag: string) => {
                  const isSelected =
                    searchQuery.toLowerCase().trim() === tag.toLowerCase().trim() ||
                    searchQuery.toLowerCase().trim() === `#${tag.toLowerCase().trim()}`;
                  return (
                    <div
                      key={tag}
                      onClick={() => {
                        setActiveView('library');
                        setSearchQuery(isSelected ? '' : tag);
                        setIsOpenMobile(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-emerald-400 border-emerald-300 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'bg-[#181818] hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-300 hover:text-white'
                      }`}
                    >
                      <span>#{tag}</span>
                      {customTags.includes(tag) && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveCustomTag(tag, e)}
                          className="hover:text-red-400 ml-0.5 cursor-pointer opacity-70 hover:opacity-100"
                          title="Remove custom tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-2 text-[11px] text-emerald-200/40 italic">
                No custom tags created yet. Type above to create your first tag!
              </p>
            )}
          </div>

          {/* CATEGORY 3: JAM TOOLS & IMPORT */}
          <div className="space-y-1 pt-2 border-t border-emerald-500/15">
            <h3 className="px-2 text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-2">
              Jam Tools & Import
            </h3>

            <button
              onClick={() => {
                onOpenChordRef();
                setIsOpenMobile(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Chord Reference Chart</span>
            </button>

            <button
              onClick={() => {
                onOpenImportUrlModal();
                setIsOpenMobile(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors cursor-pointer"
            >
              <Link2 className="w-4 h-4 text-emerald-400" />
              <span>Import Sheet from Link</span>
            </button>

            <button
              onClick={() => {
                onTriggerFileUpload();
                setIsOpenMobile(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import PDF / TXT File</span>
            </button>

            <button
              onClick={() => {
                onExportBackup();
                setIsOpenMobile(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Library Backup</span>
            </button>

            {songs.length === 0 && (
              <button
                onClick={() => {
                  onLoadSamples();
                  setIsOpenMobile(false);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Load Sample Songs</span>
              </button>
            )}
          </div>

          {/* CATEGORY 4: DATABASE & AUTH SETUP */}
          <div className="space-y-1 pt-2 border-t border-emerald-500/15">
            <h3 className="px-2 text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-2">
              Sync & Database
            </h3>

            <button
              onClick={() => {
                onOpenSqlModal();
                setIsOpenMobile(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Supabase SQL Setup</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400/50" />
            </button>

            <button
              onClick={() => {
                onOpenAuthModal();
                setIsOpenMobile(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-emerald-400" />
                <span>{user ? user.email : 'Account Login'}</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-stone-700'}`} />
            </button>
          </div>
        </div>

        {/* Sidebar Footer info */}
        <div className="p-3 border-t border-white/[0.06] bg-[#080c18] text-[10px] text-slate-500 flex items-center justify-between">
          <span>ChordFlow workspace</span>
          <span className="font-mono text-emerald-400/80">v2.5</span>
        </div>
      </aside>
    </>
  );
};
