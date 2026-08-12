export interface Song {
  id: string;
  user_id?: string;
  title: string;
  artist?: string;
  key?: string;
  bpm?: number;
  content: string;
  created_at: string;
  updated_at: string;
  favorite: boolean;
  pinned: boolean;
  last_viewed_at?: string;
  tags?: string[];
  original_chord_sheet_url?: string;
}

export interface ReaderSettings {
  fontSize: number; // in px, e.g. 18 - 48
  lineSpacing: number; // e.g. 1.4 - 2.4
  scrollSpeed: number; // 1 - 100
  fontFamily: 'monospace' | 'sans' | 'serif';
  transposition: number; // semitones offset (-12 to +12)
  highlightChords: boolean;
  showCountdown: boolean;
  leadInSeconds: number;
}

export interface UserProfile {
  id: string;
  email: string;
}

export type ViewMode = 'library' | 'editor' | 'reader' | 'chords';

export type SortOption = 'newest' | 'oldest' | 'title' | 'artist' | 'recently_viewed';
