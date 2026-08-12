import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { GUITAR_CHORD_CHARTS, COMMON_CHORDS } from '../lib/chordUtils';

interface ChordReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChordName?: string;
}

export const ChordReferenceModal: React.FC<ChordReferenceModalProps> = ({
  isOpen,
  onClose,
  selectedChordName = 'C',
}) => {
  const [activeChord, setActiveChord] = useState<string>(selectedChordName || 'C');

  if (!isOpen) return null;

  // Clean chord string (e.g., 'Cadd9' or 'D/F#')
  const chartData = GUITAR_CHORD_CHARTS[activeChord] || GUITAR_CHORD_CHARTS[activeChord.split('/')[0]] || GUITAR_CHORD_CHARTS['C'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181818]/95 border border-emerald-500/30 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative text-white flex flex-col max-h-[90vh] backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-emerald-200/60 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 shrink-0">
          <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Guitar Chord Reference</h2>
            <p className="text-xs text-emerald-200/60 mt-0.5">Finger diagrams and fret placement for guitarists</p>
          </div>
        </div>

        {/* Chord Selector Chips */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto p-1.5 bg-[#121212] rounded-xl border border-emerald-500/20 mb-6 shrink-0">
          {COMMON_CHORDS.map((chord) => (
            <button
              key={chord}
              onClick={() => setActiveChord(chord)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeChord === chord
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                  : 'text-emerald-200/60 hover:text-white hover:bg-emerald-500/20'
              }`}
            >
              {chord}
            </button>
          ))}
        </div>

        {/* Active Chord Diagram */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center bg-[#121212] border border-emerald-500/20 rounded-2xl p-6">
          <div className="text-center mb-4">
            <h3 className="text-3xl font-black text-emerald-400 font-mono tracking-tight">{chartData.name}</h3>
            {chartData.baseFret && chartData.baseFret > 1 && (
              <span className="text-xs text-emerald-200/60 mt-1 block">Position: Fret {chartData.baseFret}</span>
            )}
          </div>

          {/* Render Visual Fretboard */}
          <div className="w-48 bg-[#27272a] border border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center shadow-lg">
            {/* Nut or Top border */}
            <div className="w-full h-1.5 bg-emerald-200 rounded-sm mb-2" />

            {/* String Headers (E A D G B e) */}
            <div className="w-full flex justify-between text-[11px] font-mono text-emerald-200/60 px-1 mb-2">
              {['E', 'A', 'D', 'G', 'B', 'e'].map((s, i) => (
                <span key={i} className="w-6 text-center">{s}</span>
              ))}
            </div>

            {/* String Indicators (Muted/Open/Fret) */}
            <div className="w-full flex justify-between font-mono text-xs font-bold px-1 py-1 bg-[#121212] rounded-lg border border-emerald-500/20">
              {chartData.frets.map((fret, idx) => (
                <span
                  key={idx}
                  className={`w-6 text-center ${
                    fret === 'x'
                      ? 'text-red-400'
                      : fret === 0
                      ? 'text-emerald-300'
                      : 'text-white'
                  }`}
                >
                  {fret === 'x' ? '✕' : fret === 0 ? '○' : fret}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-emerald-200/60 space-y-1">
            <p>✕ = Muted string · ○ = Open string · Numbers = Fret position</p>
          </div>
        </div>
      </div>
    </div>
  );
};
