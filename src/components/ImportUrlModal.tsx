import React, { useState } from 'react';
import { 
  X, Link2, Globe, Sparkles, AlertCircle, 
  CheckCircle2, Loader2, Music, Play, Edit3, Clipboard, FileText
} from 'lucide-react';
import { Song } from '../types';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (song: Partial<Song>, openMode?: 'library' | 'reader' | 'editor') => void;
}

export const ImportUrlModal: React.FC<ImportUrlModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [extractedSong, setExtractedSong] = useState<Partial<Song> | null>(null);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // Clipboard access disallowed or unavailable
    }
  };

  const handleExtract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);
    setExtractedSong(null);
    setLoadingStep('Fetching webpage and extracting chords...');

    try {
      const response = await fetch('/api/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          response.ok
            ? 'The import service returned an invalid response.'
            : `The import service is unavailable (${response.status}). Please check the deployment configuration.`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract song data from link.');
      }

      setLoadingStep('Song extracted successfully!');
      setExtractedSong(data.song);
    } catch (err: any) {
      console.error('Import URL error:', err);
      let errMsg = err?.message || 'Could not import song from link. Please verify the URL and try again.';
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        errMsg = 'API Rate Limit Reached (429). Please wait a few seconds and try again.';
      } else if (errMsg.startsWith('{') && errMsg.endsWith('}')) {
        try {
          const parsedErr = JSON.parse(errMsg);
          if (parsedErr?.error?.message) {
            errMsg = parsedErr.error.message;
            if (parsedErr.error.code === 429) {
              errMsg = 'API Rate Limit Reached (429). Please wait a few seconds and try again.';
            }
          }
        } catch { }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = (openMode: 'library' | 'reader' | 'editor' = 'library') => {
    if (extractedSong) {
      onImportSuccess(extractedSong, openMode);
      onClose();
      setUrl('');
      setExtractedSong(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181818]/95 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 max-w-xl w-full text-white relative shadow-[0_0_40px_rgba(16,185,129,0.2)] space-y-5 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-emerald-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Import Song from Web Link</h2>
              <p className="text-xs text-emerald-200/70 mt-0.5">
                Paste any song or tab webpage link to auto-parse chords & lyrics
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              setExtractedSong(null);
              setError(null);
            }}
            className="p-1.5 text-emerald-200/60 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input & Form Area */}
        {!extractedSong ? (
          <form onSubmit={handleExtract} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-100 mb-1.5 flex items-center justify-between">
                <span>Website Chord or Lyrics URL</span>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Paste Clipboard</span>
                </button>
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. https://www.ultimate-guitar.com/tab/..."
                  className="w-full bg-[#121212] border border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-emerald-200/40 outline-none transition-all font-sans"
                />
                <Link2 className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Quick Source Examples Badges */}
            <div className="bg-[#121212]/80 border border-emerald-500/20 rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-wider block">
                Supported Sources:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#27272a] border border-emerald-500/20 text-emerald-200">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chord Websites & Tabs</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#27272a] border border-emerald-500/20 text-emerald-200">
                  <FileText className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Song Lyrics & Blogs</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#27272a] border border-emerald-500/20 text-emerald-200">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guitar / Ukulele Tabs</span>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{loadingStep || 'Analyzing Link with AI...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Extract & Parse Song Data</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Extracted Song Preview & Confirm Actions */
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/15 border border-emerald-400/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Song extracted & formatted successfully!</span>
            </div>

            {/* Extracted Card Details */}
            <div className="bg-[#121212] border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">{extractedSong.title}</h3>
                  <p className="text-xs text-emerald-200/70 mt-0.5">{extractedSong.artist || 'Unknown Artist'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {extractedSong.key && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                      Key: {extractedSong.key}
                    </span>
                  )}
                  {extractedSong.bpm && (
                    <span className="text-xs font-mono text-emerald-200 bg-[#27272a] border border-emerald-500/20 px-2 py-0.5 rounded">
                      {extractedSong.bpm} BPM
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Content Snippet */}
              <div className="max-h-36 overflow-y-auto bg-[#090a0f] p-3 rounded-lg border border-emerald-500/20 text-xs font-mono text-slate-100/90 leading-relaxed whitespace-pre-wrap">
                {extractedSong.content?.slice(0, 400)}
                {(extractedSong.content?.length || 0) > 400 && '...'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleConfirmSave('library')}
                className="py-2.5 px-3 bg-[#27272a] hover:bg-[#3f3f46] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Save to Library</span>
              </button>

              <button
                onClick={() => handleConfirmSave('reader')}
                className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.35)]"
              >
                <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Save & Play Reader</span>
              </button>

              <button
                onClick={() => handleConfirmSave('editor')}
                className="py-2.5 px-3 bg-[#27272a] hover:bg-[#3f3f46] text-emerald-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/20"
              >
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Edit First</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
