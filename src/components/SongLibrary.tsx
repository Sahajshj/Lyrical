import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, Heart, Pin, ArrowUpDown, 
  LayoutGrid, List, Upload, Download, Music, Sparkles,
  CheckCircle2, Smartphone, Link2, Search, X, Tag, Library, Headphones, Clock3
} from 'lucide-react';
import { Song, SortOption } from '../types';
import { SongCard } from './SongCard';
import { ImportUrlModal } from './ImportUrlModal';
import { 
  downloadLibraryBackupTxt, 
  parseTxtContentToSong, 
  parseMultiSongBackupTxt,
  parsePdfFileToSong
} from '../utils/fileUtils';

interface SongLibraryProps {
  songs: Song[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRead: (song: Song) => void;
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onTogglePin: (id: string, current: boolean) => void;
  onDuplicate: (song: Song) => void;
  onNewSong: () => void;
  onImportTxt: (title: string, content: string, artist?: string, key?: string, bpm?: number) => void;
  onBatchImportSongs?: (importedList: Partial<Song>[]) => void;
  onImportUrlSong?: (songData: Partial<Song>, openMode?: 'library' | 'reader' | 'editor') => void;
  onLoadSamples: () => void;
}

export const SongLibrary: React.FC<SongLibraryProps> = ({
  songs,
  searchQuery,
  setSearchQuery,
  onRead,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTogglePin,
  onDuplicate,
  onNewSong,
  onImportTxt,
  onBatchImportSongs,
  onImportUrlSong,
  onLoadSamples,
}) => {
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isCompactList, setIsCompactList] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isImportUrlModalOpen, setIsImportUrlModalOpen] = useState(false);

  // Swipe gesture tracking for mobile tab switching
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Extract all unique musical keys in library for filter dropdown
  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const song of songs) {
      if (song.key) keys.add(song.key.trim());
    }
    return Array.from(keys);
  }, [songs]);

  // Extract all unique tags in library
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    for (const song of songs) {
      if (song.tags && Array.isArray(song.tags)) {
        for (const t of song.tags) {
          if (t.trim()) tagsSet.add(t.trim());
        }
      }
    }
    return Array.from(tagsSet);
  }, [songs]);

  // Search Relevance Score Calculator with Tag, Title, Artist, Lyrics Matching
  const calculateSearchRelevance = (song: Song, query: string): number => {
    if (!query) return 0;
    const q = query.toLowerCase().trim().replace(/^#/, '');
    const title = song.title.toLowerCase();
    const artist = (song.artist || '').toLowerCase();
    const content = song.content.toLowerCase();
    const tags = song.tags || [];

    let score = 0;

    // Tag matches (Highest priority match when query matches a tag)
    for (const tag of tags) {
      const tagLower = tag.toLowerCase();
      if (tagLower === q) score += 120;
      else if (tagLower.startsWith(q)) score += 90;
      else if (tagLower.includes(q)) score += 70;
    }

    // Title matches
    if (title === q) score += 100;
    else if (title.startsWith(q)) score += 80;
    else if (title.includes(q)) score += 60;

    // Artist matches
    if (artist === q) score += 50;
    else if (artist.startsWith(q)) score += 40;
    else if (artist.includes(q)) score += 30;

    // Lyrics/Chords content match
    if (content.includes(q)) score += 15;

    return score;
  };

  // Filter & Sort Songs with Relevance Ranking
  const processedSongs = useMemo(() => {
    let result = [...songs];
    const q = searchQuery.trim().toLowerCase();

    // Search filter & scoring
    if (q) {
      result = result
        .map((s) => ({ song: s, score: calculateSearchRelevance(s, q) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.song);
    }

    // Favorite filter
    if (filterFavorite) {
      result = result.filter((s) => s.favorite);
    }

    // Key filter
    if (selectedKey !== 'all') {
      result = result.filter((s) => s.key === selectedKey);
    }

    // Sort (if not searching, apply standard sort option)
    if (!q) {
      result.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'title':
            return a.title.localeCompare(b.title);
          case 'artist':
            return (a.artist || '').localeCompare(b.artist || '');
          case 'recently_viewed':
            return (
              new Date(b.last_viewed_at || b.updated_at).getTime() -
              new Date(a.last_viewed_at || a.updated_at).getTime()
            );
          default:
            return 0;
        }
      });
    }

    return result;
  }, [songs, searchQuery, filterFavorite, selectedKey, sortBy]);

  // Process text and PDF files for single or batch import
  const processUploadedFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) => f.name.endsWith('.txt') || f.name.endsWith('.pdf') || f.type.includes('text') || f.type.includes('pdf')
    );
    if (fileArray.length === 0) return;

    const allParsedSongs: Partial<Song>[] = [];

    for (const file of fileArray) {
      try {
        if (file.name.endsWith('.pdf') || file.type.includes('pdf')) {
          const parsedPdf = await parsePdfFileToSong(file);
          if (parsedPdf.title && parsedPdf.content) {
            allParsedSongs.push(parsedPdf);
          }
        } else {
          const text = await file.text();
          if (!text.trim()) continue;

          // Check if file is a multi-song backup
          const multiParsed = parseMultiSongBackupTxt(text);
          if (multiParsed.length > 1) {
            allParsedSongs.push(...multiParsed);
          } else {
            const single = parseTxtContentToSong(text, file.name);
            allParsedSongs.push(single);
          }
        }
      } catch (err) {
        console.error('Error reading file:', file.name, err);
      }
    }

    if (allParsedSongs.length > 0) {
      if (onBatchImportSongs) {
        onBatchImportSongs(allParsedSongs);
      } else {
        for (const songData of allParsedSongs) {
          if (songData.title && songData.content) {
            onImportTxt(songData.title, songData.content, songData.artist, songData.key, songData.bpm);
          }
        }
      }
      showToast(`Successfully imported ${allParsedSongs.length} song${allParsedSongs.length > 1 ? 's' : ''}!`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  // Mobile Touch Swipe Navigation across filter tabs
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 75 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        if (!filterFavorite) {
          setFilterFavorite(true);
          showToast('Swiped Left: Showing Favorites Only');
        }
      } else {
        if (filterFavorite) {
          setFilterFavorite(false);
          showToast('Swiped Right: Showing All Songs');
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const pinnedSongs = processedSongs.filter((s) => s.pinned);
  const otherSongs = processedSongs.filter((s) => !s.pinned);
  const favoriteCount = songs.filter((song) => song.favorite).length;
  const recentlyUpdated = [...songs].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0] ?? null;

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`max-w-7xl mx-auto px-4 py-5 sm:px-8 text-white space-y-5 relative transition-all ${
        isDragging ? 'ring-4 ring-sky-500 bg-sky-500/10 rounded-2xl' : ''
      }`}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md border-2 border-dashed border-emerald-400 rounded-2xl flex flex-col items-center justify-center gap-3 text-center p-6">
          <Upload className="w-12 h-12 text-emerald-400 animate-bounce" />
          <h2 className="text-xl font-bold text-white">Drop .PDF or .TXT Song Files Here</h2>
          <p className="text-xs text-emerald-200/80">PDF files and TXT song sheets will be parsed automatically</p>
        </div>
      )}

      {/* Workspace overview */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.16] via-[#11182a] to-[#0b1020] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-indigo-300">
              <Headphones className="h-4 w-4" />
              <span>Your music workspace</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ready for your next session?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Keep every chord sheet close, build your setlist, and open distraction-free reader mode when it is time to play.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={onNewSong}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300"
              >
                <Plus className="h-4 w-4" /> Create a song
              </button>
              <button
                onClick={() => setIsImportUrlModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.09]"
              >
                <Link2 className="h-4 w-4 text-indigo-300" /> Import from link
              </button>
              {recentlyUpdated && (
                <button
                  onClick={() => onRead(recentlyUpdated)}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:text-white"
                >
                  <Clock3 className="h-4 w-4" /> Continue {recentlyUpdated.title}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:w-[360px]">
            {[
              { label: 'Songs', value: songs.length, icon: Library },
              { label: 'Favorites', value: favoriteCount, icon: Heart },
              { label: 'Pinned', value: songs.filter((song) => song.pinned).length, icon: Pin },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:p-4">
                <Icon className="mb-3 h-4 w-4 text-indigo-300" />
                <div className="text-xl font-semibold text-white">{value}</div>
                <div className="text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONCISE HIGH-EFFICIENCY SEARCH TOOLBAR */}
      <div className="w-full bg-[#101728]/80 border border-white/[0.08] rounded-2xl p-2.5 sm:p-3 backdrop-blur-xl flex flex-col md:flex-row items-center gap-2.5">
        {/* Search Input */}
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, lyrics, or tags (#pop)..."
            className="w-full bg-[#080d19] border border-white/[0.09] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 rounded-xl pl-9 pr-16 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none font-sans transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-emerald-300 hover:text-white font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-300/40 font-mono hidden sm:inline">
              {songs.length} songs
            </span>
          )}
        </div>

        {/* Compact Filters Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0 w-full md:w-auto justify-between md:justify-end">
          {/* Favorites Filter Toggle */}
          <button
            onClick={() => setFilterFavorite(!filterFavorite)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              filterFavorite
                ? 'bg-red-950/80 border-red-500/50 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                : 'bg-[#121212] border-emerald-500/20 text-slate-300 hover:text-white hover:border-emerald-400/30'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${filterFavorite ? 'fill-red-400 text-red-400' : ''}`} />
            <span>Favorites</span>
          </button>

          {/* Key Filter Dropdown */}
          {availableKeys.length > 0 && (
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="bg-[#121212] border border-emerald-500/20 text-slate-300 rounded-xl px-2 py-1.5 text-xs font-medium outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="all">All Keys</option>
              {availableKeys.map((k) => (
                <option key={k} value={k} className="bg-[#181818]">
                  Key: {k}
                </option>
              ))}
            </select>
          )}

          {/* Sort Dropdown */}
          <div className="flex items-center bg-[#121212] border border-emerald-500/20 rounded-xl px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-slate-300 text-xs font-medium outline-none cursor-pointer"
            >
              <option value="newest" className="bg-[#181818]">Sort: Newest</option>
              <option value="oldest" className="bg-[#181818]">Sort: Oldest</option>
              <option value="title" className="bg-[#181818]">Sort: Title A-Z</option>
              <option value="artist" className="bg-[#181818]">Sort: Artist</option>
              <option value="recently_viewed" className="bg-[#181818]">Sort: Last Played</option>
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex bg-[#121212] p-1 rounded-xl border border-emerald-500/20">
            <button
              onClick={() => setIsCompactList(false)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                !isCompactList ? 'bg-emerald-500/25 text-emerald-300' : 'text-emerald-300/40 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCompactList(true)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isCompactList ? 'bg-emerald-500/25 text-emerald-300' : 'text-emerald-300/40 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input for drag & drop or programmatic import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.pdf,text/plain,application/pdf"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Tag Chips Filter Row */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-emerald-200/60 shrink-0 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filter Tags:</span>
          </span>
          {availableTags.map((t) => {
            const isSelected =
              searchQuery.toLowerCase().trim() === t.toLowerCase().trim() ||
              searchQuery.toLowerCase().trim() === `#${t.toLowerCase().trim()}`;
            return (
              <button
                key={t}
                onClick={() => {
                  if (isSelected) {
                    setSearchQuery('');
                  } else {
                    setSearchQuery(t);
                  }
                }}
                className={`px-2.5 py-0.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-emerald-400 border-emerald-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-[#181818]/80 hover:bg-[#222222] border-emerald-500/20 text-emerald-300 hover:border-emerald-400/40'
                }`}
              >
                <span>#{t}</span>
                {isSelected && <X className="w-3 h-3 text-slate-950 ml-0.5" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {processedSongs.length === 0 && (
        <div className="bg-[#181818]/80 border border-emerald-500/25 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto backdrop-blur-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <Music className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">No songs found</h3>
            <p className="text-xs text-emerald-200/70 mt-1">
              {searchQuery || filterFavorite
                ? 'Try clearing your search query or filters to view songs.'
                : 'Your library is empty. Drag & drop PDF/TXT files or create a new song!'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsImportUrlModalOpen(true)}
              className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Link2 className="w-4 h-4 text-emerald-400" />
              <span>Import Link</span>
            </button>
            {songs.length === 0 && (
              <button
                onClick={onLoadSamples}
                className="px-4 py-2 bg-[#121212] hover:bg-[#222222] border border-emerald-500/20 text-emerald-300 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Load Sample Songs</span>
              </button>
            )}
            <button
              onClick={onNewSong}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.35)]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Song</span>
            </button>
          </div>
        </div>
      )}

      {/* Pinned Songs Section */}
      {pinnedSongs.length > 0 && !searchQuery && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Pin className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>Pinned Songs ({pinnedSongs.length})</span>
          </div>
          <div
            className={
              isCompactList
                ? 'space-y-2'
                : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
            }
          >
            {pinnedSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onRead={onRead}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                onTogglePin={onTogglePin}
                onDuplicate={onDuplicate}
                onTagSelect={(tag) => setSearchQuery(tag)}
                isCompactList={isCompactList}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Songs Section */}
      {otherSongs.length > 0 && (
        <div className="space-y-2.5">
          {pinnedSongs.length > 0 && !searchQuery && (
            <div className="text-xs font-bold text-emerald-200/60 uppercase tracking-wider pt-2">
              All Songs ({otherSongs.length})
            </div>
          )}
          <div
            className={
              isCompactList
                ? 'space-y-2'
                : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
            }
          >
            {otherSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onRead={onRead}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                onTogglePin={onTogglePin}
                onDuplicate={onDuplicate}
                onTagSelect={(tag) => setSearchQuery(tag)}
                isCompactList={isCompactList}
              />
            ))}
          </div>
        </div>
      )}

      {/* Import URL Modal */}
      <ImportUrlModal
        isOpen={isImportUrlModalOpen}
        onClose={() => setIsImportUrlModalOpen(false)}
        onImportSuccess={(songData, openMode) => {
          if (onImportUrlSong) {
            onImportUrlSong(songData, openMode);
          } else if (songData.title && songData.content) {
            onImportTxt(songData.title, songData.content, songData.artist, songData.key, songData.bpm);
          }
          showToast(`Imported "${songData.title}" from link successfully!`);
        }}
      />
    </div>
  );
};
