import React, { useState } from 'react';
import { Play, Heart, Pin, Edit3, Trash2, Copy, Download, Music2, ExternalLink, Trash, Tag } from 'lucide-react';
import { Song } from '../types';
import { downloadSongTxt } from '../utils/fileUtils';

interface SongCardProps {
  song: Song;
  onRead: (song: Song) => void;
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onTogglePin: (id: string, current: boolean) => void;
  onDuplicate: (song: Song) => void;
  onTagSelect?: (tag: string) => void;
  isCompactList?: boolean;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  onRead,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTogglePin,
  onDuplicate,
  onTagSelect,
  isCompactList = false,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Snippet preview without bracketed codes for card text
  const previewText = song.content
    .replace(/\[[^\]]+\]/g, '')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .slice(0, 3)
    .join(' · ');

  if (isCompactList) {
    return (
      <div className={`group bg-[#181818]/90 hover:bg-[#222222] border border-emerald-500/25 hover:border-emerald-400/50 rounded-xl p-3 flex items-center justify-between gap-3 transition-all backdrop-blur-xl ${song.pinned ? 'border-l-4 border-l-emerald-400' : ''}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => onRead(song)}
            className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center shrink-0 hover:scale-105 transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer"
            title="Start Auto-Scroll Reader"
          >
            <Play className="w-4 h-4 fill-slate-950 ml-0.5 text-slate-950" />
          </button>

          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onRead(song)}>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-sm truncate group-hover:text-emerald-300 transition-colors">
                {song.title}
              </h3>
              {song.pinned && (
                <Pin className="w-3.5 h-3.5 text-emerald-400 shrink-0 fill-emerald-400/20" />
              )}
              {song.tags && song.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {song.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTagSelect) onTagSelect(tag);
                      }}
                      className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/30 cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                  {song.tags.length > 2 && (
                    <span className="text-[10px] text-emerald-200/50">+{song.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-emerald-200/60 truncate mt-0.5 flex items-center gap-2">
              <span>{song.artist || 'Unknown Artist'} {song.key && `• Key: ${song.key}`}</span>
              {song.original_chord_sheet_url && (
                <a
                  href={song.original_chord_sheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-[11px]"
                  title="Open Original Chord Sheet"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Chords Link</span>
                </a>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 lg:opacity-40 lg:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleFavorite(song.id, song.favorite)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              song.favorite ? 'text-red-400 bg-red-950/50' : 'text-emerald-200/60 hover:text-white hover:bg-emerald-500/20'
            }`}
            title="Favorite"
          >
            <Heart className={`w-4 h-4 ${song.favorite ? 'fill-red-400 text-red-400' : ''}`} />
          </button>

          <button
            onClick={() => onEdit(song)}
            className="p-2 rounded-lg text-emerald-200/60 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
            title="Edit Song"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDuplicate(song)}
            className="p-2 rounded-lg text-emerald-200/60 hover:text-white hover:bg-emerald-500/20 transition-colors hidden sm:block cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowConfirmDelete(true)}
            className="p-2 rounded-lg text-emerald-200/40 hover:text-red-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Delete Modal */}
        {showConfirmDelete && (
          <ConfirmDeleteModal
            title={song.title}
            onCancel={() => setShowConfirmDelete(false)}
            onConfirm={() => {
              setShowConfirmDelete(false);
              onDelete(song.id);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`group relative bg-[#101728]/75 hover:bg-[#141d31] border border-white/[0.08] hover:border-indigo-400/35 rounded-2xl p-5 flex flex-col justify-between transition-all backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.16)] ${song.pinned ? 'border-l-2 border-l-indigo-400' : ''}`}>
      <div>
        {/* Top Badges & Actions */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {song.key && (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold font-mono">
                Key: {song.key}
              </span>
            )}
            {song.bpm && (
              <span className="px-2.5 py-0.5 rounded-lg bg-[#121212] border border-emerald-500/20 text-slate-300 text-xs font-medium">
                {song.bpm} BPM
              </span>
            )}
            {song.original_chord_sheet_url && (
              <a
                href={song.original_chord_sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                title="Open Original Sheet Link"
              >
                <ExternalLink className="w-3 h-3 text-emerald-400" />
                <span>Original Chords</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onTogglePin(song.id, song.pinned)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                song.pinned ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-200/40 hover:text-white hover:bg-emerald-500/20'
              }`}
              title={song.pinned ? 'Unpin' : 'Pin to Top'}
            >
              <Pin className={`w-4 h-4 ${song.pinned ? 'fill-emerald-400' : ''}`} />
            </button>

            <button
              onClick={() => onToggleFavorite(song.id, song.favorite)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                song.favorite ? 'text-red-400 bg-red-950/50' : 'text-emerald-200/40 hover:text-white hover:bg-emerald-500/20'
              }`}
              title={song.favorite ? 'Unfavorite' : 'Mark Favorite'}
            >
              <Heart className={`w-4 h-4 ${song.favorite ? 'fill-red-400 text-red-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Title and Artist */}
        <div className="mb-3 flex cursor-pointer items-center gap-3" onClick={() => onRead(song)}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-300/15 bg-gradient-to-br from-indigo-400/25 to-sky-400/10 text-lg font-semibold text-indigo-200 shadow-inner">
            {song.title.trim().charAt(0).toUpperCase() || <Music2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-white transition-colors group-hover:text-indigo-200">
              {song.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="truncate">{song.artist || 'Unknown Artist'}</span>
            </p>
          </div>
        </div>

        {/* Tags Row */}
        {song.tags && song.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap my-2">
            {song.tags.map((tag) => (
              <span
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagSelect) onTagSelect(tag);
                }}
                className="px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-400/25 text-emerald-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                title={`Filter by tag #${tag}`}
              >
                <Tag className="w-2.5 h-2.5 text-emerald-400" />
                <span>#{tag}</span>
              </span>
            ))}
          </div>
        )}

        {/* Lyrics Preview */}
        <div className="bg-[#080d19]/65 rounded-xl p-3 border border-white/[0.06] text-xs text-slate-400 font-sans line-clamp-2 mb-4 leading-relaxed">
          {previewText || 'No lyrics preview...'}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between gap-2">
        <button
          onClick={() => onRead(song)}
          className="flex-1 py-2 px-3 bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
          <span>Open reader</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(song)}
            className="p-1.5 text-emerald-200/60 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
            title="Edit Song"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDuplicate(song)}
            className="p-1.5 text-emerald-200/60 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => downloadSongTxt(song)}
            className="p-1.5 text-emerald-200/60 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
            title="Export as TXT"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowConfirmDelete(true)}
            className="p-1.5 text-emerald-200/40 hover:text-red-400 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
            title="Delete Song"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showConfirmDelete && (
        <ConfirmDeleteModal
          title={song.title}
          onCancel={() => setShowConfirmDelete(false)}
          onConfirm={() => {
            setShowConfirmDelete(false);
            onDelete(song.id);
          }}
        />
      )}
    </div>
  );
};

function ConfirmDeleteModal({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-emerald-500/30 rounded-2xl p-5 max-w-sm w-full text-white space-y-3 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 text-red-400">
          <Trash className="w-5 h-5" />
          <h4 className="font-bold text-sm">Delete Song?</h4>
        </div>
        <p className="text-xs text-emerald-200/80">
          Are you sure you want to delete <span className="text-white font-semibold">"{title}"</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-[#121212] hover:bg-[#222222] text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-emerald-500/20 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
