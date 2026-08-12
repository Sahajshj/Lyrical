import { Song } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extract text from a PDF file and parse it into a Partial<Song> object
 */
export async function parsePdfFileToSong(file: File): Promise<Partial<Song>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let extractedPages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item && 'str' in item ? item.str : ''))
        .join(' ');
      extractedPages.push(pageText);
    }

    const fullPdfText = extractedPages.join('\n\n');
    return parseTxtContentToSong(fullPdfText, file.name);
  } catch (err: any) {
    console.error('Failed to parse PDF:', err);
    throw new Error('Failed to parse PDF file. Please ensure it contains readable text.');
  }
}

/**
 * Format a Song object into a standard TXT format with metadata headers
 */
export function formatSongToTxt(song: Song): string {
  const metaLines: string[] = [];
  metaLines.push(`Title: ${song.title}`);
  if (song.artist) metaLines.push(`Artist: ${song.artist}`);
  if (song.key) metaLines.push(`Key: ${song.key}`);
  if (song.bpm) metaLines.push(`BPM: ${song.bpm}`);

  return `${metaLines.join('\n')}\n\n${song.content}`;
}

/**
 * Trigger browser download for a single song TXT file
 */
export function downloadSongTxt(song: Song): void {
  const txtContent = formatSongToTxt(song);
  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Clean filename: remove special chars
  const safeFilename = `${song.title.replace(/[/\\?%*:|"<>]/g, '_')}${song.artist ? ` - ${song.artist.replace(/[/\\?%*:|"<>]/g, '_')}` : ''}.txt`;
  
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all songs into a single structured backup TXT file
 */
export function downloadLibraryBackupTxt(songs: Song[]): void {
  if (songs.length === 0) return;
  
  const blocks = songs.map((song, idx) => {
    return `========================================\n# SONG ${idx + 1}: ${song.title}\n========================================\n${formatSongToTxt(song)}\n`;
  });

  const fullContent = `CHORDFLOW SONG LIBRARY BACKUP\nTotal Songs: ${songs.length}\nExport Date: ${new Date().toLocaleDateString()}\n\n${blocks.join('\n\n')}`;
  
  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `ChordFlow_Library_Backup_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse a raw string from a .txt file into a Partial<Song> object.
 * Detects headers like Title:, Artist:, Key:, BPM: at the start of file.
 */
export function parseTxtContentToSong(rawText: string, fallbackFileName?: string): Partial<Song> {
  const lines = rawText.split(/\r?\n/);
  let title = '';
  let artist = '';
  let key = '';
  let bpm: number | undefined = undefined;
  
  let contentStartIdx = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      // Empty line after metadata headers often marks start of content
      if (title || artist || key || bpm) {
        contentStartIdx = i + 1;
        break;
      }
      continue;
    }
    
    // Check for Metadata Key-Value pairs
    const titleMatch = line.match(/^(?:Title|Song|Name)\s*[:=]\s*(.+)$/i);
    const artistMatch = line.match(/^(?:Artist|Band|By)\s*[:=]\s*(.+)$/i);
    const keyMatch = line.match(/^(?:Key|Tuning)\s*[:=]\s*(.+)$/i);
    const bpmMatch = line.match(/^(?:BPM|Tempo)\s*[:=]\s*(\d+)$/i);
    
    if (titleMatch) {
      title = titleMatch[1].trim();
      contentStartIdx = i + 1;
    } else if (artistMatch) {
      artist = artistMatch[1].trim();
      contentStartIdx = i + 1;
    } else if (keyMatch) {
      key = keyMatch[1].trim();
      contentStartIdx = i + 1;
    } else if (bpmMatch) {
      bpm = parseInt(bpmMatch[1], 10);
      contentStartIdx = i + 1;
    } else {
      // Non-metadata line encountered: check if fallback title can be parsed from filename or first line
      if (!title && i === 0 && !line.includes('[') && line.length < 60 && !line.includes('---')) {
        // First line looks like a title
        title = line;
        contentStartIdx = 1;
      } else {
        // End of headers section
        break;
      }
    }
  }

  // Fallback to filename if no title parsed
  if (!title && fallbackFileName) {
    const cleanName = fallbackFileName.replace(/\.txt$/i, '');
    // Check if filename is "Artist - Title" format
    if (cleanName.includes(' - ')) {
      const parts = cleanName.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    } else {
      title = cleanName.trim();
    }
  }

  if (!title) {
    title = 'Imported Song';
  }

  // Content is everything after header section
  const content = lines.slice(contentStartIdx).join('\n').trim();

  return {
    title,
    artist: artist || undefined,
    key: key || undefined,
    bpm: bpm || undefined,
    content: content || rawText.trim(),
  };
}

/**
 * Parse a backup file containing multiple songs separated by dividers
 */
export function parseMultiSongBackupTxt(rawText: string): Partial<Song>[] {
  if (!rawText.includes('========================================') && !rawText.includes('CHORDFLOW SONG LIBRARY BACKUP')) {
    // Single song file
    return [parseTxtContentToSong(rawText)];
  }

  const songBlocks = rawText.split(/========================================\r?\n(?:# SONG \d+: .*\r?\n========================================)?/g);
  const parsedSongs: Partial<Song>[] = [];

  for (const block of songBlocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('CHORDFLOW SONG LIBRARY BACKUP')) continue;
    const song = parseTxtContentToSong(trimmed);
    if (song.title && song.content) {
      parsedSongs.push(song);
    }
  }

  return parsedSongs;
}
