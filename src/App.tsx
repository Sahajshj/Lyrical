import React, { useState, useEffect, useRef } from 'react';
import { Song, ViewMode, UserProfile } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SongLibrary } from './components/SongLibrary';
import { SongEditor } from './components/SongEditor';
import { SongReader } from './components/SongReader';
import { AuthModal } from './components/AuthModal';
import { SupabaseSqlModal } from './components/SupabaseSqlModal';
import { ChordReferenceModal } from './components/ChordReferenceModal';
import { ImportUrlModal } from './components/ImportUrlModal';
import { 
  fetchUserSongs, upsertSong, removeSong, 
  getSupabase
} from './lib/supabase';
import { INITIAL_SONGS } from './data/initialSongs';
import { 
  downloadLibraryBackupTxt, 
  parseTxtContentToSong, 
  parseMultiSongBackupTxt,
  parsePdfFileToSong
} from './utils/fileUtils';

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>('library');
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Sidebar mobile drawer state
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isChordModalOpen, setIsChordModalOpen] = useState(false);
  const [isImportUrlModalOpen, setIsImportUrlModalOpen] = useState(false);
  const [selectedChordName, setSelectedChordName] = useState('C');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const requireSignIn = () => {
    if (user) return true;
    setIsAuthModalOpen(true);
    return false;
  };

  const openNewSong = () => {
    if (!requireSignIn()) return;
    setActiveSong(null);
    setActiveView('editor');
  };

  // Load user session and songs on mount
  useEffect(() => {
    async function initApp() {
      setLoading(true);
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            setUser({
              id: data.session.user.id,
              email: data.session.user.email || '',
            });
          }

          // Auth state change listener
          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              setUser({ id: session.user.id, email: session.user.email || '' });
            } else {
              setUser(null);
            }
          });
        } catch (err) {
          console.warn('Supabase auth session error:', err);
        }
      }

      const { songs: loadedSongs, isRemote } = await fetchUserSongs(user?.id);
      setSongs(loadedSongs);
      setIsCloudSynced(isRemote);
      setLoading(false);
    }

    initApp();
  }, []);

  // Re-fetch songs when user logs in/out
  useEffect(() => {
    async function reloadSongs() {
      const { songs: reloaded, isRemote } = await fetchUserSongs(user?.id);
      setSongs(reloaded);
      setIsCloudSynced(isRemote);
    }
    reloadSongs();
  }, [user]);

  // CRUD Handlers
  const handleSaveSong = async (songData: Partial<Song>) => {
    if (!requireSignIn()) return;
    const saved = await upsertSong(songData, user?.id);
    setSongs((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    setActiveView('library');
    setActiveSong(null);
  };

  const handleDeleteSong = async (id: string) => {
    if (!requireSignIn()) return;
    await removeSong(id, user?.id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
    if (activeSong?.id === id) setActiveSong(null);
  };

  const handleToggleFavorite = async (id: string, currentFavorite: boolean) => {
    if (!requireSignIn()) return;
    const target = songs.find((s) => s.id === id);
    if (!target) return;
    const updated = { ...target, favorite: !currentFavorite };
    setSongs((prev) => prev.map((s) => (s.id === id ? updated : s)));
    await upsertSong(updated, user?.id);
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    if (!requireSignIn()) return;
    const target = songs.find((s) => s.id === id);
    if (!target) return;
    const updated = { ...target, pinned: !currentPinned };
    setSongs((prev) => prev.map((s) => (s.id === id ? updated : s)));
    await upsertSong(updated, user?.id);
  };

  const handleDuplicate = async (song: Song) => {
    if (!requireSignIn()) return;
    const duplicatedData: Partial<Song> = {
      title: `${song.title} (Copy)`,
      artist: song.artist,
      key: song.key,
      bpm: song.bpm,
      content: song.content,
      tags: song.tags,
      original_chord_sheet_url: song.original_chord_sheet_url,
      favorite: false,
      pinned: false,
    };
    const newSong = await upsertSong(duplicatedData, user?.id);
    setSongs((prev) => [newSong, ...prev]);
  };

  const handleImportTxt = async (title: string, content: string, artist?: string, key?: string, bpm?: number) => {
    if (!requireSignIn()) return;
    const importedData: Partial<Song> = {
      title,
      artist,
      key,
      bpm,
      content,
      favorite: false,
      pinned: false,
    };
    const newSong = await upsertSong(importedData, user?.id);
    setSongs((prev) => [newSong, ...prev]);
  };

  const handleBatchImportSongs = async (importedList: Partial<Song>[]) => {
    if (!requireSignIn()) return;
    const created: Song[] = [];
    for (const item of importedList) {
      if (item.title && item.content) {
        const saved = await upsertSong(item, user?.id);
        created.push(saved);
      }
    }
    if (created.length > 0) {
      setSongs((prev) => [...created, ...prev]);
    }
  };

  const handleImportUrlSong = async (
    songData: Partial<Song>,
    openMode: 'library' | 'reader' | 'editor' = 'library'
  ) => {
    if (!requireSignIn()) return;
    const importedData: Partial<Song> = {
      title: songData.title || 'Untitled Song',
      artist: songData.artist || '',
      key: songData.key || 'C',
      bpm: songData.bpm || 120,
      content: songData.content || '',
      tags: songData.tags || [],
      original_chord_sheet_url: songData.original_chord_sheet_url || undefined,
      favorite: false,
      pinned: false,
    };
    const saved = await upsertSong(importedData, user?.id);
    setSongs((prev) => [saved, ...prev]);

    if (openMode === 'reader') {
      setActiveSong(saved);
      setActiveView('reader');
    } else if (openMode === 'editor') {
      setActiveSong(saved);
      setActiveView('editor');
    }
  };

  const handleLoadSamples = async () => {
    if (!requireSignIn()) return;
    for (const sample of INITIAL_SONGS) {
      const { id: _sampleId, user_id: _sampleUserId, ...sampleData } = sample;
      await upsertSong(sampleData, user?.id);
    }
    const { songs: reloaded } = await fetchUserSongs(user?.id);
    setSongs(reloaded);
  };

  const handleOpenReadMode = (song: Song) => {
    setActiveSong(song);
    setActiveView('reader');

    // Update last_viewed_at timestamp
    const updated = { ...song, last_viewed_at: new Date().toISOString() };
    if (user) upsertSong(updated, user.id).catch(console.warn);
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setActiveSong(null);
    setActiveView('library');
  };

  const handleOpenChordModal = (chordName: string = 'C') => {
    setSelectedChordName(chordName);
    setIsChordModalOpen(true);
  };

  // Process files selected via hidden input triggered from Sidebar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requireSignIn()) {
      e.target.value = '';
      return;
    }
    if (!e.target.files || e.target.files.length === 0) return;
    const fileArray = Array.from(e.target.files) as File[];
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

          const multiParsed = parseMultiSongBackupTxt(text);
          if (multiParsed.length > 1) {
            allParsedSongs.push(...multiParsed);
          } else {
            const single = parseTxtContentToSong(text, file.name);
            allParsedSongs.push(single);
          }
        }
      } catch (err) {
        console.error('File parsing error:', err);
      }
    }

    if (allParsedSongs.length > 0) {
      await handleBatchImportSongs(allParsedSongs);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#070b17] text-white flex flex-col font-sans selection:bg-indigo-400 selection:text-slate-950">
      {/* Hidden File Input for Sidebar/Header File Imports */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.pdf,text/plain,application/pdf"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Reader Mode is Full-Screen Stage */}
      {activeView === 'reader' && activeSong ? (
        <SongReader
          song={activeSong}
          songs={songs}
          onSelectSong={(nextSong) => setActiveSong(nextSong)}
          onExit={() => setActiveView('library')}
          onOpenChordModal={handleOpenChordModal}
        />
      ) : (
        <div className="flex flex-1 min-h-screen bg-[radial-gradient(circle_at_70%_0%,rgba(99,102,241,0.07),transparent_34%)]">
          {/* Categorized Persistent Sidebar */}
          <Sidebar
            songs={songs}
            activeView={activeView}
            setActiveView={setActiveView}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNewSong={openNewSong}
            onOpenChordRef={() => handleOpenChordModal('C')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
            onOpenImportUrlModal={() => {
              if (requireSignIn()) setIsImportUrlModalOpen(true);
            }}
            onTriggerFileUpload={() => {
              if (requireSignIn()) fileInputRef.current?.click();
            }}
            onExportBackup={() => downloadLibraryBackupTxt(songs)}
            onLoadSamples={handleLoadSamples}
            user={user}
            isOpenMobile={isSidebarMobileOpen}
            setIsOpenMobile={setIsSidebarMobileOpen}
          />

          {/* Main Content Pane */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header
              activeView={activeView}
              setActiveView={setActiveView}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onNewSong={openNewSong}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenSqlModal={() => setIsSqlModalOpen(true)}
              onOpenChordRef={() => handleOpenChordModal('C')}
              onToggleSidebarMobile={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
              user={user}
              onLogout={handleLogout}
              isSupabaseConnected={isCloudSynced}
            />

            <main className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-sky-400">
                  <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-sky-200/60">
                    Loading ChordFlow Library...
                  </span>
                </div>
              ) : activeView === 'editor' ? (
                <SongEditor
                  song={activeSong}
                  onSave={handleSaveSong}
                  onCancel={() => setActiveView('library')}
                />
              ) : activeView === 'chords' ? (
                <div className="max-w-4xl mx-auto px-4 py-8">
                  <button
                    onClick={() => setActiveView('library')}
                    className="mb-4 text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1"
                  >
                    ← Back to Song Library
                  </button>
                  <div className="bg-[#09182a] border border-sky-500/20 rounded-2xl p-6 shadow-2xl">
                    <h2 className="text-xl font-bold mb-4 text-white">Guitar Chords Quick Reference</h2>
                    <ChordReferenceModal
                      isOpen={true}
                      onClose={() => setActiveView('library')}
                      selectedChordName="C"
                    />
                  </div>
                </div>
              ) : (
                <SongLibrary
                  songs={songs}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onRead={handleOpenReadMode}
                  onEdit={(song) => {
                    if (!requireSignIn()) return;
                    setActiveSong(song);
                    setActiveView('editor');
                  }}
                  onDelete={handleDeleteSong}
                  onToggleFavorite={handleToggleFavorite}
                  onTogglePin={handleTogglePin}
                  onDuplicate={handleDuplicate}
                  onNewSong={openNewSong}
                  onImportTxt={handleImportTxt}
                  onBatchImportSongs={handleBatchImportSongs}
                  onImportUrlSong={handleImportUrlSong}
                  onLoadSamples={handleLoadSamples}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        setUser={setUser}
      />

      <SupabaseSqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      <ChordReferenceModal
        isOpen={isChordModalOpen}
        onClose={() => setIsChordModalOpen(false)}
        selectedChordName={selectedChordName}
      />

      <ImportUrlModal
        isOpen={isImportUrlModalOpen}
        onClose={() => setIsImportUrlModalOpen(false)}
        onImportSuccess={(songData, openMode) => {
          handleImportUrlSong(songData, openMode);
        }}
      />
    </div>
  );
}
