import React, { useState, useEffect, useRef } from 'react';
import { Save, ArrowLeft, Eye, EyeOff, Sparkles, Music, FileText, Link2, Tag, Plus, X, ExternalLink } from 'lucide-react';
import { Song } from '../types';
import { COMMON_CHORDS, parseSongLine } from '../lib/chordUtils';
import { ImportUrlModal } from './ImportUrlModal';

interface SongEditorProps {
  song?: Song | null;
  onSave: (songData: Partial<Song>) => void;
  onCancel: () => void;
}

const POPULAR_TAG_SUGGESTIONS = ['Hindi', 'English', 'Acoustic', 'Rock', 'Pop', 'Bollywood', 'Sufi', 'Folk', 'Chords'];

export const SongEditor: React.FC<SongEditorProps> = ({ song, onSave, onCancel }) => {
  const [title, setTitle] = useState(song?.title || '');
  const [artist, setArtist] = useState(song?.artist || '');
  const [key, setKey] = useState(song?.key || 'G');
  const [bpm, setBpm] = useState<number | undefined>(song?.bpm);
  const [content, setContent] = useState(song?.content || '');
  const [originalChordSheetUrl, setOriginalChordSheetUrl] = useState(song?.original_chord_sheet_url || '');
  const [tags, setTags] = useState<string[]>(song?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save draft in localStorage
  useEffect(() => {
    const timer = setInterval(() => {
      if (title.trim() || content.trim()) {
        const draftKey = `chordflow_draft_${song?.id || 'new'}`;
        localStorage.setItem(draftKey, JSON.stringify({ title, artist, key, bpm, content, tags, originalChordSheetUrl }));
        const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastAutoSaved(dateStr);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [title, artist, key, bpm, content, tags, originalChordSheetUrl, song?.id]);

  // Tag helper handlers
  const handleAddTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.trim().replace(/^#/, '');
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Quick insert chord at textarea cursor position
  const insertChord = (chordName: string) => {
    if (!textareaRef.current) {
      setContent(prev => `${prev} [${chordName}]`);
      return;
    }

    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const insertText = `[${chordName}]`;

    const newContent = content.substring(0, start) + insertText + content.substring(end);
    setContent(newContent);

    // Restore focus and update selection cursor
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + insertText.length, start + insertText.length);
    }, 10);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: song?.id,
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim(),
      bpm: bpm ? Number(bpm) : undefined,
      content,
      tags,
      original_chord_sheet_url: originalChordSheetUrl.trim() || undefined,
      favorite: song?.favorite ?? false,
      pinned: song?.pinned ?? false,
      created_at: song?.created_at,
    });

    // Clear draft
    const draftKey = `chordflow_draft_${song?.id || 'new'}`;
    localStorage.removeItem(draftKey);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-white space-y-6">
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818]/80 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-emerald-500/20 rounded-xl text-emerald-200/70 hover:text-white transition-colors cursor-pointer"
            title="Cancel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">
              {song ? 'Edit Song' : 'Create New Song'}
            </h1>
            <p className="text-xs text-emerald-200/60 mt-0.5">
              Add lyrics with bracketed chords like <code className="text-emerald-300 font-mono">[Am]</code> or plain text
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          {lastAutoSaved && (
            <span className="text-[11px] text-emerald-200/50 hidden md:inline-block">
              Draft saved at {lastAutoSaved}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsUrlModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import from Web URL, PDF, or TXT file"
          >
            <Link2 className="w-4 h-4 text-emerald-400" />
            <span>Import Document / URL</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showPreview
                ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-300'
                : 'bg-[#121212] hover:bg-[#27272a] text-slate-200 border border-emerald-500/20'
            }`}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showPreview ? 'Edit Code' : 'Live Preview'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.35)]"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Save Song</span>
          </button>
        </div>
      </div>

      {/* Editor Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Song Metadata & Quick Chord Chips */}
        <div className="space-y-4 lg:col-span-1">
          {/* Metadata Card */}
          <div className="bg-[#181818]/80 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 space-y-3.5 backdrop-blur-xl">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-emerald-500/15 pb-2">
              <Music className="w-4 h-4 text-emerald-400" />
              <span>Song Metadata</span>
            </h3>

            {/* Song Title */}
            <div>
              <label className="block text-xs font-semibold text-emerald-200/80 mb-1">
                Song Title <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tum Hi Ho / Hotel California"
                className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-200/30 outline-none transition-all font-sans"
              />
            </div>

            {/* Artist */}
            <div>
              <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Artist / Band</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Arijit Singh / Eagles"
                className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-200/30 outline-none transition-all font-sans"
              />
            </div>

            {/* Key & BPM */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Musical Key</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g. Am, G, C#"
                  className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-emerald-200/30 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Tempo (BPM)</label>
                <input
                  type="number"
                  value={bpm || ''}
                  onChange={(e) => setBpm(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 120"
                  className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-emerald-200/30 outline-none transition-all"
                />
              </div>
            </div>

            {/* Original Chord Sheet Link */}
            <div>
              <label className="block text-xs font-semibold text-emerald-200/80 mb-1 flex items-center gap-1">
                <ExternalLink className="w-3 h-3 text-emerald-400" />
                <span>Original Chord Sheet URL</span>
              </label>
              <input
                type="url"
                value={originalChordSheetUrl}
                onChange={(e) => setOriginalChordSheetUrl(e.target.value)}
                placeholder="e.g. https://www.ultimate-guitar.com/..."
                className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-200/30 outline-none transition-all font-sans"
              />
              <p className="text-[10px] text-emerald-200/50 mt-1">
                Optional: Paste link to original chord sheet to open in 1-click anytime
              </p>
            </div>

            {/* Tags Manager */}
            <div className="pt-2 border-t border-emerald-500/15 space-y-2">
              <label className="block text-xs font-semibold text-emerald-200/80 flex items-center justify-between">
                <span>Song Tags</span>
                <span className="text-[10px] text-emerald-200/50">Used for search & filters</span>
              </label>

              {/* Added Tags */}
              <div className="flex items-center gap-1.5 flex-wrap min-h-[30px] p-2 bg-[#121212] border border-emerald-500/20 rounded-xl">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-emerald-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <span className="text-xs text-emerald-200/40 italic">No tags added...</span>
                )}
              </div>

              {/* Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="Type a tag & press enter (e.g. Hindi)..."
                  className="flex-1 bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder-emerald-200/30 outline-none font-sans"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add</span>
                </button>
              </div>

              {/* Tag Suggestions */}
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <span className="text-[10px] text-emerald-200/50 mr-1">Suggestions:</span>
                {POPULAR_TAG_SUGGESTIONS.filter((s) => !tags.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddTag(s)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300/80 hover:text-emerald-200 border border-emerald-500/15 cursor-pointer"
                  >
                    +{s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Chord Palette */}
          <div className="bg-[#181818]/80 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 space-y-3 backdrop-blur-xl">
            <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>1-Click Insert Chords</span>
            </h3>
            <p className="text-[11px] text-emerald-200/60">
              Click a chord button to insert <code className="text-emerald-300 font-mono">[Chord]</code> directly into lyrics at cursor position
            </p>

            <div className="grid grid-cols-4 gap-1.5">
              {COMMON_CHORDS.slice(0, 16).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => insertChord(c)}
                  className="py-1.5 px-2 bg-[#121212] hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-400/40 rounded-xl text-xs font-mono font-bold text-emerald-300 transition-colors text-center cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Area: Text Area Code Editor or Live Rendered Preview */}
        <div className="lg:col-span-2 bg-[#181818]/80 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 backdrop-blur-xl flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-500/15 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-white">
                {showPreview ? 'Live Song Sheet Preview' : 'Song Sheet Text Editor'}
              </span>
            </div>

            <div className="text-xs text-emerald-200/60 font-mono">
              {content.split('\n').length} Lines
            </div>
          </div>

          {!showPreview ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Paste your song lyrics or chords here...

[Verse 1]
[G]Sun raho hain na tu [Em]ro raha hoon main
[C]Apne karam ki kar [D]adaayein

[Chorus]
[G]Kyunki tum hi ho, [Em]ab tum hi ho
[C]Zindagi ab [D]tum hi ho...`}
              className="w-full flex-1 bg-[#121212] border border-emerald-500/20 focus:border-emerald-400 rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-100 placeholder-emerald-200/30 outline-none resize-none leading-relaxed transition-all"
            />
          ) : (
            <div className="flex-1 bg-[#121212] border border-emerald-500/20 rounded-xl p-4 overflow-y-auto space-y-2 font-mono text-xs sm:text-sm leading-relaxed">
              {content.split('\n').map((line, idx) => {
                const parsed = parseSongLine(line, 0);

                if (parsed.isHeader) {
                  return (
                    <div key={idx} className="text-emerald-400 font-bold uppercase text-xs pt-2 font-sans border-b border-emerald-500/20 pb-1">
                      {line}
                    </div>
                  );
                }

                return (
                  <div key={idx} className="whitespace-pre-wrap">
                    {parsed.segments.map((seg, sIdx) => {
                      if (seg.type === 'chord') {
                        return (
                          <span
                            key={sIdx}
                            className="inline-block text-emerald-300 font-bold bg-emerald-500/20 px-1 py-0.5 rounded border border-emerald-400/35 mr-1"
                          >
                            {seg.text}
                          </span>
                        );
                      }
                      return <span key={sIdx} className="text-slate-100/90">{seg.text}</span>;
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* URL Import Modal */}
      <ImportUrlModal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        onImportSuccess={(songData) => {
          if (songData.title) setTitle(songData.title);
          if (songData.artist) setArtist(songData.artist);
          if (songData.key) setKey(songData.key);
          if (songData.bpm) setBpm(songData.bpm);
          if (songData.content) setContent(songData.content);
        }}
      />
    </div>
  );
};
