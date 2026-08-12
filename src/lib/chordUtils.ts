// Chromatic scale for chord transposition
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const COMMON_CHORDS = [
  'C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'E', 'Bm', 'Dm',
  'C7', 'G7', 'D7', 'A7', 'E7', 'B7', 'F#m', 'C#m', 'Cadd9', 'Dsus4'
];

/**
 * Transposes a single note (e.g. 'C#', 'Bb') by given semitones
 */
export function transposeNote(note: string, semitones: number): string {
  if (!note || semitones === 0) return note;

  let isFlat = note.includes('b');
  let index = SHARP_NOTES.indexOf(note);
  if (index === -1) {
    index = FLAT_NOTES.indexOf(note);
    isFlat = true;
  }

  if (index === -1) return note; // Return as-is if note not found

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  const scale = isFlat ? FLAT_NOTES : SHARP_NOTES;
  return scale[newIndex];
}

/**
 * Transposes a single chord string (e.g. 'Cadd9', 'F#m7', 'D/F#') by semitones
 */
export function transposeChord(chord: string, semitones: number): string {
  if (!chord || semitones === 0) return chord;

  // Regex to match root note and optional bass note after slash
  // Matches Root (A-G + #/b), quality/suffix, and optional /BassNote
  const chordRegex = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;
  const match = chord.match(chordRegex);

  if (!match) return chord;

  const [, root, suffix, bass] = match;
  const newRoot = transposeNote(root, semitones);
  const newBass = bass ? transposeNote(bass, semitones) : '';

  return `${newRoot}${suffix}${newBass ? '/' + newBass : ''}`;
}

/**
 * Transposes all bracketed chords in a text string
 * Example: "[C] Hello [D/F#] World" -> "[D] Hello [E/G#] World" (for +2 semitones)
 */
export function transposeTextContent(content: string, semitones: number): string {
  if (semitones === 0) return content;

  return content.replace(/\[([A-G][#b]?[^\]]*)\]/g, (_, chord) => {
    const transposed = transposeChord(chord.trim(), semitones);
    return `[${transposed}]`;
  });
}

export interface ParsedSegment {
  type: 'text' | 'chord' | 'header';
  text: string;
}

export interface ParsedLine {
  isHeader: boolean;
  isTab: boolean;
  segments: ParsedSegment[];
  originalText: string;
}

/**
 * Parses a song line with bracketed chords e.g. "I [C]love guitar [G]music"
 * into structured visual segments for display.
 */
export function parseSongLine(line: string, transposition = 0): ParsedLine {
  const originalText = line;

  // Check if line is a header like [Intro], [Verse 1], [Chorus], etc.
  const isSectionHeader = /^\[(Intro|Verse|Chorus|Bridge|Outro|Solo|Pre-Chorus|Capo|Refrain)[^\]]*\]/i.test(line.trim());
  const isTab = /^[a-gA-G1-6]?\|[0-9x\-hpsb/~\s]+\|?$/i.test(line.trim());

  if (isSectionHeader) {
    return {
      isHeader: true,
      isTab: false,
      segments: [{ type: 'header', text: line.trim() }],
      originalText
    };
  }

  const segments: ParsedSegment[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Text before chord
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        text: line.substring(lastIndex, match.index)
      });
    }

    // Chord
    const chordRaw = match[1].trim();
    const transposedChord = transposition !== 0 ? transposeChord(chordRaw, transposition) : chordRaw;
    segments.push({
      type: 'chord',
      text: transposedChord
    });

    lastIndex = regex.lastIndex;
  }

  // Remaining text after last chord
  if (lastIndex < line.length) {
    segments.push({
      type: 'text',
      text: line.substring(lastIndex)
    });
  }

  // If no brackets found, check if the entire line looks like a chord line (e.g., "C     G     Am    F")
  if (segments.length === 0) {
    const isPureChordLine = isChordLine(line);
    if (isPureChordLine) {
      const parts = line.split(/(\s+)/);
      for (const part of parts) {
        if (/^\s+$/.test(part)) {
          segments.push({ type: 'text', text: part });
        } else if (part.length > 0) {
          const transposed = transposition !== 0 ? transposeChord(part, transposition) : part;
          segments.push({ type: 'chord', text: transposed });
        }
      }
    } else {
      segments.push({ type: 'text', text: line });
    }
  }

  return {
    isHeader: false,
    isTab,
    segments,
    originalText
  };
}

/**
 * Checks if a string line consists primarily of guitar chords separated by spaces
 */
export function isChordLine(line: string): boolean {
  if (!line || !line.trim()) return false;

  const tokens = line.trim().split(/\s+/);
  const chordRegex = /^([A-G][#b]?(m|maj|min|dim|aug|sus|add|m7|maj7|7|6|9|11|13|5)?(\/[A-G][#b]?)?)$/i;

  let validChordCount = 0;
  for (const token of tokens) {
    if (chordRegex.test(token)) {
      validChordCount++;
    }
  }

  return validChordCount > 0 && validChordCount / tokens.length >= 0.7;
}

/**
 * Extracts all unique chords present in a song's content
 */
export function extractUniqueChords(content: string): string[] {
  const chordsSet = new Set<string>();
  const bracketMatches = content.match(/\[([A-G][#b]?[^\]]*)\]/g);

  if (bracketMatches) {
    for (const match of bracketMatches) {
      const chord = match.replace(/[\[\]]/g, '').trim();
      if (chord && !['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro', 'Solo', 'Capo'].includes(chord)) {
        chordsSet.add(chord);
      }
    }
  }

  // Also check unbracketed lines
  const lines = content.split('\n');
  for (const line of lines) {
    if (isChordLine(line)) {
      const tokens = line.trim().split(/\s+/);
      for (const token of tokens) {
        if (/^[A-G][#b]?/.test(token)) {
          chordsSet.add(token);
        }
      }
    }
  }

  return Array.from(chordsSet);
}

/**
 * Exports song as a formatted .txt file
 */
export function downloadSongAsTxt(song: { title: string; artist?: string; key?: string; content: string }) {
  const header = `Title: ${song.title}\nArtist: ${song.artist || 'Unknown'}\nKey: ${song.key || 'N/A'}\n\n========================================\n\n`;
  const fileContent = header + song.content;
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}_Chords.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Guitar chord finger chart representations for top common chords
 * strings: 6th (low E) to 1st (high E) string fret numbers, -1 or 'x' for muted, 0 for open
 */
export interface GuitarChordChart {
  name: string;
  frets: (number | 'x')[]; // [E, A, D, G, B, e]
  fingers?: (number | 'x')[];
  baseFret?: number;
}

export const GUITAR_CHORD_CHARTS: Record<string, GuitarChordChart> = {
  'C': { name: 'C', frets: ['x', 3, 2, 0, 1, 0], fingers: ['x', 3, 2, 'x', 1, 'x'] },
  'G': { name: 'G', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 'x', 'x', 'x', 3] },
  'D': { name: 'D', frets: ['x', 'x', 0, 2, 3, 2], fingers: ['x', 'x', 'x', 1, 3, 2] },
  'Em': { name: 'Em', frets: [0, 2, 2, 0, 0, 0], fingers: ['x', 2, 3, 'x', 'x', 'x'] },
  'Am': { name: 'Am', frets: ['x', 0, 2, 2, 1, 0], fingers: ['x', 'x', 2, 3, 1, 'x'] },
  'F': { name: 'F', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1 },
  'A': { name: 'A', frets: ['x', 0, 2, 2, 2, 0], fingers: ['x', 'x', 1, 2, 3, 'x'] },
  'E': { name: 'E', frets: [0, 2, 2, 1, 0, 0], fingers: ['x', 2, 3, 1, 'x', 'x'] },
  'Bm': { name: 'Bm', frets: ['x', 2, 4, 4, 3, 2], fingers: ['x', 1, 3, 4, 2, 1], baseFret: 2 },
  'Dm': { name: 'Dm', frets: ['x', 'x', 0, 2, 3, 1], fingers: ['x', 'x', 'x', 2, 3, 1] },
  'C7': { name: 'C7', frets: ['x', 3, 2, 3, 1, 0] },
  'G7': { name: 'G7', frets: [3, 2, 0, 0, 0, 1] },
  'D7': { name: 'D7', frets: ['x', 'x', 0, 2, 1, 2] },
  'A7': { name: 'A7', frets: ['x', 0, 2, 0, 2, 0] },
  'E7': { name: 'E7', frets: [0, 2, 0, 1, 0, 0] },
  'Cadd9': { name: 'Cadd9', frets: ['x', 3, 2, 0, 3, 3] },
  'Dsus4': { name: 'Dsus4', frets: ['x', 'x', 0, 2, 3, 3] },
};

