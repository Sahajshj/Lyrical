import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Song } from '../types';
import { INITIAL_SONGS } from '../data/initialSongs';

// Storage keys for custom client config and offline persistent cache
const SUPABASE_URL_KEY = 'chordflow_supabase_url';
const SUPABASE_KEY_KEY = 'chordflow_supabase_key';
const LOCAL_SONGS_KEY = 'chordflow_local_songs_v1';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_URL_KEY) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_KEY_KEY) || '' : '';

  return {
    url: envUrl || storedUrl,
    anonKey: envKey || storedKey,
  };
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SUPABASE_URL_KEY, url);
    localStorage.setItem(SUPABASE_KEY_KEY, anonKey);
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

function getLocalSongs(): Song[] {
  if (typeof window === 'undefined') return INITIAL_SONGS;
  const data = localStorage.getItem(LOCAL_SONGS_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(INITIAL_SONGS));
    return INITIAL_SONGS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_SONGS;
  }
}

function saveLocalSongs(songs: Song[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(songs));
  }
}

// ================= CRUD FUNCTIONS (SUPABASE WITH LOCAL FALLBACK) ================= //

export async function fetchUserSongs(userId?: string): Promise<{ songs: Song[]; isRemote: boolean }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase.from('songs').select('*').order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

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
        return { songs: mappedSongs, isRemote: true };
      } else if (error) {
        console.warn('Supabase fetch query error (falling back to local):', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local storage:', err);
    }
  }

  // Fallback to local storage
  return { songs: getLocalSongs(), isRemote: false };
}

export async function upsertSong(songData: Partial<Song>, userId?: string): Promise<Song> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const songToSave: Song = {
    id: songData.id || `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId || songData.user_id || 'demo-user',
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

      if (userId) {
        payload.user_id = userId;
      }

      const { data, error } = await supabase.from('songs').upsert(payload).select().single();

      if (!error && data) {
        return {
          ...songToSave,
          id: data.id,
        };
      } else if (error) {
        console.warn('Supabase upsert error (saving locally):', error.message);
      }
    } catch (err) {
      console.warn('Supabase save failed, saving locally:', err);
    }
  }

  // Local storage save
  const current = getLocalSongs();
  const existingIdx = current.findIndex(s => s.id === songToSave.id);
  let updatedList: Song[];

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = songToSave;
  } else {
    updatedList = [songToSave, ...current];
  }

  saveLocalSongs(updatedList);
  return songToSave;
}

export async function removeSong(id: string, userId?: string): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase.from('songs').delete().eq('id', id);
      if (userId) query = query.eq('user_id', userId);
      const { error } = await query;
      if (error) {
        console.warn('Supabase delete error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete failed:', err);
    }
  }

  // Always sync local storage
  const current = getLocalSongs();
  const filtered = current.filter(s => s.id !== id);
  saveLocalSongs(filtered);
  return true;
}
