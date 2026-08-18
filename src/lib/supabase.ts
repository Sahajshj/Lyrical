import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Song } from '../types';
import { INITIAL_SONGS } from '../data/initialSongs';

// Storage keys for custom client config and offline persistent cache
const SUPABASE_URL_KEY = 'chordflow_supabase_url';
const SUPABASE_KEY_KEY = 'chordflow_supabase_key';
const LOCAL_SONGS_KEY = 'chordflow_user_songs_v1';
const PENDING_SONGS_KEY = 'chordflow_pending_song_ids_v1';
const PENDING_DELETES_KEY = 'chordflow_pending_delete_ids_v1';

let supabaseClient: SupabaseClient | null = null;

function normalizeSupabaseUrl(value: string): string {
  const trimmed = value.trim();

  // Supabase dashboards often expose the project ref separately from the URL.
  // Accept that shorthand and turn it into the canonical project URL.
  if (/^[a-z0-9]{20}$/.test(trimmed)) {
    return `https://${trimmed}.supabase.co`;
  }

  return trimmed;
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_URL_KEY) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_KEY_KEY) || '' : '';

  return {
    url: normalizeSupabaseUrl(envUrl || storedUrl),
    anonKey: (envKey || storedKey).trim(),
  };
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SUPABASE_URL_KEY, normalizeSupabaseUrl(url));
    localStorage.setItem(SUPABASE_KEY_KEY, anonKey.trim());
  }
  supabaseClient = null; // reset client to re-initialize
}

function isValidHttpUrl(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  try {
    const parsed = new URL(str);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !str.includes('YOUR_SUPABASE');
  } catch {
    return false;
  }
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const { url, anonKey } = getSupabaseConfig();

  if (url && anonKey && isValidHttpUrl(url)) {
    try {
      supabaseClient = createClient(url, anonKey);
      return supabaseClient;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
}

export function isSupabaseConnected(): boolean {
  return getSupabase() !== null;
}

// ================= LOCAL STORAGE FALLBACK HELPERS ================= //

function getLocalSongs(userId: string): Song[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(`${LOCAL_SONGS_KEY}:${userId}`);
  if (!data) return [];
  try {
    const songs = JSON.parse(data);
    return Array.isArray(songs) ? songs : [];
  } catch {
    return [];
  }
}

function saveLocalSongs(userId: string, songs: Song[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${LOCAL_SONGS_KEY}:${userId}`, JSON.stringify(songs));
  }
}

function getPendingIds(storageKey: string, userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const value = JSON.parse(localStorage.getItem(`${storageKey}:${userId}`) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function savePendingIds(storageKey: string, userId: string, ids: Set<string>) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${storageKey}:${userId}`, JSON.stringify(Array.from(ids)));
  }
}

function setPendingId(storageKey: string, userId: string, id: string, pending: boolean) {
  const ids = getPendingIds(storageKey, userId);
  if (pending) ids.add(id);
  else ids.delete(id);
  savePendingIds(storageKey, userId, ids);
}

function upsertLocalSong(userId: string, song: Song, pending: boolean) {
  const current = getLocalSongs(userId);
  const index = current.findIndex((item) => item.id === song.id);
  const updated = [...current];
  if (index >= 0) updated[index] = song;
  else updated.unshift(song);
  saveLocalSongs(userId, updated);
  setPendingId(PENDING_SONGS_KEY, userId, song.id, pending);
}

function toDatabaseSong(song: Song, userId: string) {
  return {
    id: song.id,
    user_id: userId,
    title: song.title,
    artist: song.artist || '',
    key: song.key || '',
    bpm: song.bpm ?? null,
    content: song.content,
    favorite: song.favorite,
    pinned: song.pinned,
    created_at: song.created_at,
    updated_at: song.updated_at,
    last_viewed_at: song.last_viewed_at ?? null,
    tags: song.tags || [],
    original_chord_sheet_url: song.original_chord_sheet_url ?? null,
  };
}

// ================= CRUD FUNCTIONS (SUPABASE WITH LOCAL FALLBACK) ================= //

export async function fetchUserSongs(userId?: string): Promise<{ songs: Song[]; isRemote: boolean }> {
  // Guests can browse the sample library, but only authenticated users have a
  // personal persisted library.
  if (!userId) {
    return { songs: INITIAL_SONGS, isRemote: false };
  }

  const supabase = getSupabase();

  if (supabase) {
    try {
      const query = supabase
        .from('songs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (!error && data) {
        // Map database records
        const mappedSongs: Song[] = data.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          title: item.title,
          artist: item.artist || '',
          key: item.key || '',
          bpm: item.bpm || undefined,
          content: item.content || '',
          favorite: Boolean(item.favorite),
          pinned: Boolean(item.pinned),
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          last_viewed_at: item.last_viewed_at || undefined,
          tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? JSON.parse(item.tags) : []),
          original_chord_sheet_url: item.original_chord_sheet_url || undefined,
        }));
        const localSongs = getLocalSongs(userId);
        const remoteById = new Map(mappedSongs.map((song) => [song.id, song]));
        const pendingIds = getPendingIds(PENDING_SONGS_KEY, userId);
        const pendingDeleteIds = getPendingIds(PENDING_DELETES_KEY, userId);
        const pendingSongs = localSongs.filter((localSong) => {
          if (!pendingIds.has(localSong.id)) return false;
          const remoteSong = remoteById.get(localSong.id);
          return !remoteSong || new Date(localSong.updated_at).getTime() > new Date(remoteSong.updated_at).getTime();
        });

        if (pendingDeleteIds.size > 0) {
          const deleteIds = Array.from(pendingDeleteIds);
          const { error: deleteError } = await supabase
            .from('songs')
            .delete()
            .eq('user_id', userId)
            .in('id', deleteIds);
          if (!deleteError) savePendingIds(PENDING_DELETES_KEY, userId, new Set());
          deleteIds.forEach((id) => remoteById.delete(id));
        }

        // Upload work that was saved while the database/network was unavailable.
        if (pendingSongs.length > 0) {
          const { error: syncError } = await supabase
            .from('songs')
            .upsert(pendingSongs.map((song) => toDatabaseSong(song, userId)));

          if (syncError) {
            console.warn('Supabase background sync failed:', syncError.message);
          } else {
            pendingSongs.forEach((song) => {
              remoteById.set(song.id, song);
              pendingIds.delete(song.id);
            });
          }
        }
        // A newer remote version resolves any stale local pending marker.
        pendingIds.forEach((id) => {
          if (!pendingSongs.some((song) => song.id === id)) pendingIds.delete(id);
        });
        savePendingIds(PENDING_SONGS_KEY, userId, pendingIds);

        // Only genuine unsynced edits may override the remote collection.
        localSongs.forEach((localSong) => {
          if (!pendingIds.has(localSong.id)) return;
          const remoteSong = remoteById.get(localSong.id);
          if (!remoteSong || new Date(localSong.updated_at).getTime() > new Date(remoteSong.updated_at).getTime()) {
            remoteById.set(localSong.id, localSong);
          }
        });
        const reconciledSongs = Array.from(remoteById.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        saveLocalSongs(userId, reconciledSongs);
        return {
          songs: reconciledSongs,
          isRemote: true,
        };
      } else if (error) {
        console.warn('Supabase fetch query error (falling back to local):', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local storage:', err);
    }
  }

  // This cache is scoped by user ID, so accounts never share offline songs.
  return { songs: getLocalSongs(userId), isRemote: false };
}

export async function upsertSong(songData: Partial<Song>, userId?: string): Promise<Song> {
  if (!userId) {
    throw new Error('Please sign in before saving songs.');
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  const songToSave: Song = {
    id: songData.id || crypto.randomUUID(),
    user_id: userId,
    title: songData.title?.trim() || 'Untitled Song',
    artist: songData.artist?.trim() || '',
    key: songData.key?.trim() || '',
    bpm: songData.bpm || undefined,
    content: songData.content || '',
    favorite: songData.favorite ?? false,
    pinned: songData.pinned ?? false,
    created_at: songData.created_at || now,
    updated_at: now,
    last_viewed_at: songData.last_viewed_at || now,
    tags: songData.tags || [],
    original_chord_sheet_url: songData.original_chord_sheet_url?.trim() || undefined,
  };

  if (supabase) {
    try {
      const payload: any = {
        id: songToSave.id,
        title: songToSave.title,
        artist: songToSave.artist,
        key: songToSave.key,
        bpm: songToSave.bpm,
        content: songToSave.content,
        favorite: songToSave.favorite,
        pinned: songToSave.pinned,
        updated_at: songToSave.updated_at,
        created_at: songToSave.created_at,
        tags: songToSave.tags,
        original_chord_sheet_url: songToSave.original_chord_sheet_url,
      };

      payload.user_id = userId;

      const { data, error } = await supabase.from('songs').upsert(payload).select().single();

      if (!error && data) {
        const savedSong = {
          ...songToSave,
          id: data.id,
        };
        upsertLocalSong(userId, savedSong, false);
        return savedSong;
      } else if (error) {
        console.warn('Supabase upsert error (saving locally):', error.message);
      }
    } catch (err) {
      console.warn('Supabase save failed, saving locally:', err);
    }
  }

  // Preserve the user's work when cloud storage is unavailable. The cache is
  // private to this signed-in account on this browser.
  upsertLocalSong(userId, songToSave, true);
  return songToSave;
}

export async function removeSong(id: string, userId?: string): Promise<boolean> {
  if (!userId) return false;

  const supabase = getSupabase();
  let deletedRemotely = false;

  if (supabase) {
    try {
      let query = supabase.from('songs').delete().eq('id', id);
      if (userId) query = query.eq('user_id', userId);
      const { error } = await query;
      if (error) {
        console.warn('Supabase delete error:', error.message);
      } else {
        deletedRemotely = true;
      }
    } catch (err) {
      console.warn('Supabase delete failed:', err);
    }
  }

  saveLocalSongs(userId, getLocalSongs(userId).filter((song) => song.id !== id));
  setPendingId(PENDING_SONGS_KEY, userId, id, false);
  setPendingId(PENDING_DELETES_KEY, userId, id, !deletedRemotely);

  return true;
}
