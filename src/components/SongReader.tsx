import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, ArrowLeft, Maximize2, Minimize2, 
  RotateCcw, Zap, Download,
  Type, ChevronLeft, ChevronRight, HelpCircle, X,
  Smartphone, MoveLeft, MoveRight, MoveUp, MoveDown
} from 'lucide-react';
import { Song, ReaderSettings } from '../types';
import { parseSongLine, extractUniqueChords } from '../lib/chordUtils';
import { requestWakeLock, releaseWakeLock } from '../lib/wakeLock';
import { downloadSongTxt } from '../utils/fileUtils';

interface SongReaderProps {
  song: Song;
  songs?: Song[];
  onSelectSong?: (song: Song) => void;
  onExit: () => void;
  onOpenChordModal?: (chord: string) => void;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 22,
  lineSpacing: 1.8,
  scrollSpeed: 25,
  fontFamily: 'monospace',
  transposition: 0,
  highlightChords: true,
  showCountdown: true,
  leadInSeconds: 3,
};

export const SongReader: React.FC<SongReaderProps> = ({ 
  song, 
  songs = [], 
  onSelectSong, 
  onExit, 
  onOpenChordModal 
}) => {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('chordflow_reader_settings');
    if (saved) {
      try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch { }
    }
    return DEFAULT_SETTINGS;
  });

  const [isScrolling, setIsScrolling] = useState(false);
  const [isPausedByUserScroll, setIsPausedByUserScroll] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [swipeToast, setSwipeToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const subPixelPos = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  // Swipe gesture refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  // Calculate song queue navigation
  const currentIndex = songs.findIndex(s => s.id === song.id);
  const prevSong = songs.length > 1 ? (currentIndex > 0 ? songs[currentIndex - 1] : songs[songs.length - 1]) : null;
  const nextSong = songs.length > 1 ? (currentIndex >= 0 && currentIndex < songs.length - 1 ? songs[currentIndex + 1] : songs[0]) : null;

  const showSwipeToast = (msg: string) => {
    setSwipeToast(msg);
    setTimeout(() => setSwipeToast(null), 2500);
  };

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('chordflow_reader_settings', JSON.stringify(settings));
  }, [settings]);

  // Request Wake Lock on mount
  useEffect(() => {
    let mounted = true;
    requestWakeLock().then(active => {
      if (mounted) setWakeLockActive(active);
    });

    return () => {
      mounted = false;
      releaseWakeLock();
    };
  }, []);

  // Update scroll progress bar
  const handleScroll = () => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll > 0) {
      const current = el.scrollTop;
      setScrollProgress(Math.min(100, Math.max(0, (current / maxScroll) * 100)));
    }
  };

  // Start scrolling after optional countdown
  const handleStartScrolling = () => {
    if (isScrolling) {
      setIsScrolling(false);
      return;
    }

    if (settings.showCountdown) {
      setCountdown(settings.leadInSeconds);
    } else {
      startScrollEngine();
    }
  };

  // Lead-in timer countdown logic
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      startScrollEngine();
    }
  }, [countdown]);

  const startScrollEngine = () => {
    if (!containerRef.current) return;
    subPixelPos.current = containerRef.current.scrollTop;
    lastTimeRef.current = performance.now();
    setIsScrolling(true);
    setIsPausedByUserScroll(false);
  };

  // Animation frame loop for auto-scrolling
  const scrollStep = useCallback((timestamp: number) => {
    if (!containerRef.current || !isScrolling || isPausedByUserScroll) {
      animationFrameId.current = null;
      return;
    }

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const el = containerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;

    if (el.scrollTop >= maxScroll - 1) {
      setIsScrolling(false);
      animationFrameId.current = null;
      return;
    }

    const pixelsPerSecond = 3 + (settings.scrollSpeed * 2.2);
    subPixelPos.current += pixelsPerSecond * deltaTime;

    el.scrollTop = subPixelPos.current;

    animationFrameId.current = requestAnimationFrame(scrollStep);
  }, [isScrolling, isPausedByUserScroll, settings.scrollSpeed]);

  useEffect(() => {
    if (isScrolling && !isPausedByUserScroll) {
      lastTimeRef.current = performance.now();
      animationFrameId.current = requestAnimationFrame(scrollStep);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isScrolling, isPausedByUserScroll, scrollStep]);

  // Touch Swipe Gesture Handlers for Reader View
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();

    if (isScrolling && !isPausedByUserScroll) {
      setIsPausedByUserScroll(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const duration = Date.now() - touchStartTime.current;

    if (duration < 650) {
      // Horizontal swipe for Prev/Next song in queue
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < -60 && nextSong && onSelectSong) {
          showSwipeToast(`Next Song: ${nextSong.title}`);
          onSelectSong(nextSong);
        } else if (deltaX > 60 && prevSong && onSelectSong) {
          showSwipeToast(`Prev Song: ${prevSong.title}`);
          onSelectSong(prevSong);
        }
      } 
      // Vertical swipe on touch canvas for Speed adjustment
      else if (Math.abs(deltaY) > 80 && Math.abs(deltaY) > Math.abs(deltaX) * 1.8) {
        if (deltaY < -80) {
          setSettings(s => {
            const newSpeed = Math.min(100, s.scrollSpeed + 5);
            showSwipeToast(`Scroll Speed: ${newSpeed}`);
            return { ...s, scrollSpeed: newSpeed };
          });
        } else if (deltaY > 80) {
          setSettings(s => {
            const newSpeed = Math.max(1, s.scrollSpeed - 5);
            showSwipeToast(`Scroll Speed: ${newSpeed}`);
            return { ...s, scrollSpeed: newSpeed };
          });
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleWheel = () => {
    if (isScrolling && !isPausedByUserScroll) {
      setIsPausedByUserScroll(true);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isScrolling) {
            setIsScrolling(false);
            setIsPausedByUserScroll(false);
          } else {
            handleStartScrolling();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSettings(s => ({ ...s, scrollSpeed: Math.min(100, s.scrollSpeed + 5) }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSettings(s => ({ ...s, scrollSpeed: Math.max(1, s.scrollSpeed - 5) }));
          break;
        case 'ArrowLeft':
          if (prevSong && onSelectSong) {
            e.preventDefault();
            onSelectSong(prevSong);
          }
          break;
        case 'ArrowRight':
          if (nextSong && onSelectSong) {
            e.preventDefault();
            onSelectSong(nextSong);
          }
          break;
        case 'BracketRight':
        case 'Equal':
          e.preventDefault();
          setSettings(s => ({ ...s, fontSize: Math.min(60, s.fontSize + 2) }));
          break;
        case 'BracketLeft':
        case 'Minus':
          e.preventDefault();
          setSettings(s => ({ ...s, fontSize: Math.max(12, s.fontSize - 2) }));
          break;
        case 'KeyT':
          e.preventDefault();
          setSettings(s => ({ ...s, transposition: (s.transposition + 1) % 12 }));
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onExit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScrolling, isFullscreen, onExit, prevSong, nextSong, onSelectSong]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const uniqueChordsInSong = extractUniqueChords(song.content);

  return (
    <div className="fixed inset-0 z-50 bg-[#121212] text-white flex flex-col select-none overflow-hidden font-sans">
      {/* Top Reading Progress Line */}
      <div className="h-1 bg-[#181818] w-full shrink-0">
        <div
          className="h-full bg-emerald-500 transition-all duration-150 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Swipe Feedback Overlay Toast */}
      {swipeToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Smartphone className="w-4 h-4 text-slate-950" />
          <span>{swipeToast}</span>
        </div>
      )}

      {/* Reader Navigation Header */}
      <div className="bg-[#181818]/95 border-b border-emerald-500/25 backdrop-blur-xl px-3 sm:px-5 py-2 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onExit}
            className="p-2 hover:bg-emerald-500/20 rounded-xl text-emerald-200/70 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Exit Reader"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Queue Navigation Prev/Next Song buttons */}
          {songs.length > 1 && (
            <div className="flex items-center bg-[#121212] border border-emerald-500/25 rounded-xl p-0.5 shrink-0">
              <button
                onClick={() => prevSong && onSelectSong && onSelectSong(prevSong)}
                disabled={!prevSong}
                className="p-1.5 text-emerald-200/70 hover:text-white disabled:opacity-30 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
                title={prevSong ? `Prev Song: ${prevSong.title}` : 'No Previous Song'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono font-semibold px-1.5 text-emerald-300 hidden md:inline">
                {currentIndex + 1}/{songs.length}
              </span>
              <button
                onClick={() => nextSong && onSelectSong && onSelectSong(nextSong)}
                disabled={!nextSong}
                className="p-1.5 text-emerald-200/70 hover:text-white disabled:opacity-30 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
                title={nextSong ? `Next Song: ${nextSong.title}` : 'No Next Song'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base text-white truncate flex items-center gap-2">
              <span>{song.title}</span>
              {song.key && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/35 text-emerald-300 shrink-0">
                  Key: {settings.transposition !== 0 ? `${song.key} (${settings.transposition > 0 ? '+' : ''}${settings.transposition})` : song.key}
                </span>
              )}
            </h1>
            <p className="text-xs text-emerald-200/60 truncate mt-0.5">{song.artist || 'Unknown Artist'}</p>
          </div>
        </div>

        {/* Header Toolbar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {wakeLockActive && (
            <span className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-400/30">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Awake</span>
            </span>
          )}

          {/* Export TXT */}
          <button
            onClick={() => downloadSongTxt(song)}
            className="p-2 text-emerald-200/70 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-colors cursor-pointer"
            title="Export Song as TXT"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 text-emerald-200/70 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-colors hidden sm:block cursor-pointer"
            title="Gesture & Keyboard Controls"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-emerald-200/70 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area (Scroll Canvas with Touch Gestures) */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="flex-1 bg-[#121212] overflow-y-auto px-4 py-6 sm:px-12 md:px-24 lg:px-36 max-w-6xl mx-auto w-full relative space-y-3 cursor-pointer"
        style={{
          fontFamily: settings.fontFamily === 'monospace' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : settings.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineSpacing,
        }}
      >
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <span className="text-8xl font-black text-emerald-400 animate-bounce font-mono drop-shadow-[0_0_35px_rgba(16,185,129,0.6)]">
              {countdown}
            </span>
            <p className="mt-4 text-sm font-semibold tracking-wider text-emerald-200 uppercase">
              Get ready to play...
            </p>
          </div>
        )}

        {/* User Paused Overlay Chip */}
        {isPausedByUserScroll && (
          <div className="sticky top-4 z-30 flex justify-center">
            <button
              onClick={() => {
                subPixelPos.current = containerRef.current?.scrollTop || 0;
                setIsPausedByUserScroll(false);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-full shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center gap-2 animate-bounce cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>Manual Scroll Detected • Resume Auto-Scroll</span>
            </button>
          </div>
        )}

        {/* Unique Chords Quick Bar */}
        {uniqueChordsInSong.length > 0 && (
          <div className="mb-6 pb-3 border-b border-emerald-500/20 flex items-center gap-2 flex-wrap not-italic">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400/80 font-sans mr-2">
              Song Chords:
            </span>
            {uniqueChordsInSong.map((c) => (
              <button
                key={c}
                onClick={() => onOpenChordModal && onOpenChordModal(c)}
                className="px-2.5 py-1 bg-[#181818] hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold text-emerald-400 transition-colors cursor-pointer"
                title="View chord diagram"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Song Lines Rendering */}
        {song.content.split('\n').map((line, idx) => {
          const parsed = parseSongLine(line, settings.transposition);

          if (parsed.isHeader) {
            return (
              <div
                key={idx}
                className="text-emerald-400 font-bold mt-6 mb-2 tracking-wide text-xs uppercase font-sans border-b border-emerald-500/20 pb-1"
              >
                {line}
              </div>
            );
          }

          if (parsed.isTab) {
            return (
              <div key={idx} className="font-mono text-emerald-200/90 whitespace-pre overflow-x-auto py-0.5">
                {line}
              </div>
            );
          }

          return (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed">
              {parsed.segments.map((seg, sIdx) => {
                if (seg.type === 'chord') {
                  return (
                    <span
                      key={sIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenChordModal) onOpenChordModal(seg.text);
                      }}
                      className="inline-block text-emerald-300 font-bold font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-400/35 mr-1 shadow-sm hover:scale-105 transition-transform cursor-pointer"
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

        {/* Bottom Spacing so auto-scroll comfortably reaches end */}
        <div className="h-[60vh] flex items-center justify-center text-emerald-400/40 text-xs font-mono">
          --- End of {song.title} ---
        </div>
      </div>

      {/* Mobile Swipe Gesture Hint Bar */}
      <div className="sm:hidden bg-[#121212] border-t border-emerald-500/20 py-1 px-3 text-[10px] text-emerald-200/60 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          <MoveLeft className="w-3 h-3 text-emerald-400" /> Swipe ← / → for Prev/Next
          <MoveRight className="w-3 h-3 text-emerald-400" />
        </span>
        <span className="flex items-center gap-1">
          <MoveUp className="w-3 h-3 text-emerald-400" /> Swipe ↑ / ↓ for Speed
          <MoveDown className="w-3 h-3 text-emerald-400" />
        </span>
      </div>

      {/* Floating Bottom HUD Controls - Un-cramped Mobile Layout */}
      <div className="bg-[#181818]/95 border-t border-emerald-500/25 p-2.5 sm:px-6 shrink-0 z-20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          
          {/* Row 1: Main Playback / Queue Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-center">
            {/* Quick Prev Song */}
            {prevSong && onSelectSong ? (
              <button
                onClick={() => onSelectSong(prevSong)}
                className="p-2 bg-[#121212] hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-200 rounded-xl transition-colors shrink-0 cursor-pointer"
                title={`Previous: ${prevSong.title}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : <div className="w-9" />}

            {/* Main Play / Pause Button */}
            <button
              onClick={handleStartScrolling}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isScrolling && !isPausedByUserScroll
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95'
              }`}
            >
              {isScrolling && !isPausedByUserScroll ? (
                <>
                  <Pause className="w-4 h-4 fill-slate-950 text-slate-950" />
                  <span>Pause Scroll</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                  <span>{isPausedByUserScroll ? 'Resume Scroll' : 'Start Scroll'}</span>
                </>
              )}
            </button>

            {/* Quick Next Song */}
            {nextSong && onSelectSong ? (
              <button
                onClick={() => onSelectSong(nextSong)}
                className="p-2 bg-[#121212] hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-200 rounded-xl transition-colors shrink-0 cursor-pointer"
                title={`Next: ${nextSong.title}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : <div className="w-9" />}

            {/* Reset to Top */}
            <button
              onClick={() => {
                setIsScrolling(false);
                setIsPausedByUserScroll(false);
                if (containerRef.current) containerRef.current.scrollTop = 0;
              }}
              className="p-2 bg-[#121212] hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-200 rounded-xl transition-colors shrink-0 cursor-pointer"
              title="Reset to Top"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: Speed Slider & Transpose Controls (Clean flex layout for small screens) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t border-emerald-500/15 sm:border-t-0 pt-2 sm:pt-0">
            {/* Scroll Speed Control */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0 sm:flex-initial">
              <span className="text-[11px] font-semibold text-emerald-200/70 shrink-0">Speed:</span>
              <button
                onClick={() => setSettings(s => ({ ...s, scrollSpeed: Math.max(1, s.scrollSpeed - 5) }))}
                className="w-6 h-6 bg-[#121212] hover:bg-emerald-500/20 border border-emerald-500/25 rounded-lg text-xs font-bold text-emerald-200 flex items-center justify-center shrink-0 cursor-pointer"
              >
                -
              </button>
              <input
                type="range"
                min="1"
                max="100"
                value={settings.scrollSpeed}
                onChange={(e) => setSettings(s => ({ ...s, scrollSpeed: Number(e.target.value) }))}
                className="flex-1 min-w-[60px] sm:w-28 accent-emerald-400 cursor-pointer"
              />
              <button
                onClick={() => setSettings(s => ({ ...s, scrollSpeed: Math.min(100, s.scrollSpeed + 5) }))}
                className="w-6 h-6 bg-[#121212] hover:bg-emerald-500/20 border border-emerald-500/25 rounded-lg text-xs font-bold text-emerald-200 flex items-center justify-center shrink-0 cursor-pointer"
              >
                +
              </button>
              <span className="text-xs font-mono font-bold text-emerald-400 w-6 text-right shrink-0">
                {settings.scrollSpeed}
              </span>
            </div>

            {/* Transposition & Typography Settings */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Transpose Key */}
              <div className="flex items-center bg-[#121212] border border-emerald-500/25 rounded-xl p-0.5">
                <button
                  onClick={() => setSettings(s => ({ ...s, transposition: s.transposition - 1 }))}
                  className="px-2 py-1 text-xs text-emerald-200/70 hover:text-white hover:bg-emerald-500/20 rounded-lg font-bold cursor-pointer"
                  title="Transpose -1 semitone"
                >
                  -
                </button>
                <span className="px-1 text-xs font-mono text-emerald-400 font-bold min-w-[20px] text-center">
                  {settings.transposition > 0 ? `+${settings.transposition}` : settings.transposition}
                </span>
                <button
                  onClick={() => setSettings(s => ({ ...s, transposition: s.transposition + 1 }))}
                  className="px-2 py-1 text-xs text-emerald-200/70 hover:text-white hover:bg-emerald-500/20 rounded-lg font-bold cursor-pointer"
                  title="Transpose +1 semitone"
                >
                  +
                </button>
              </div>

              {/* Settings Drawer Toggle */}
              <button
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className={`p-2 rounded-xl transition-colors border cursor-pointer ${
                  showSettingsDrawer
                    ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-400'
                    : 'bg-[#121212] border-emerald-500/25 text-emerald-200/70 hover:text-white hover:bg-emerald-500/20'
                }`}
                title="Typography & Reader Settings"
              >
                <Type className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reader Settings Drawer */}
      {showSettingsDrawer && (
        <div className="bg-[#181818] border-t border-emerald-500/25 p-4 shrink-0 text-white animate-in slide-in-from-bottom">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="font-bold text-xs text-emerald-400 uppercase tracking-wider">
                Display & Typography Settings
              </span>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="text-emerald-200/60 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Font Size */}
              <div>
                <label className="block text-emerald-200/70 mb-1">Font Size: {settings.fontSize}px</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="14"
                    max="50"
                    value={settings.fontSize}
                    onChange={(e) => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Line Spacing */}
              <div>
                <label className="block text-emerald-200/70 mb-1">Line Height: {settings.lineSpacing}</label>
                <input
                  type="range"
                  min="1.2"
                  max="2.6"
                  step="0.1"
                  value={settings.lineSpacing}
                  onChange={(e) => setSettings(s => ({ ...s, lineSpacing: Number(e.target.value) }))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-emerald-200/70 mb-1">Font Style</label>
                <div className="flex bg-[#121212] p-1 rounded-xl border border-emerald-500/20">
                  <button
                    onClick={() => setSettings(s => ({ ...s, fontFamily: 'monospace' }))}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-mono cursor-pointer ${
                      settings.fontFamily === 'monospace' ? 'bg-[#181818] text-emerald-400 font-bold border border-emerald-500/30' : 'text-emerald-200/60'
                    }`}
                  >
                    Mono
                  </button>
                  <button
                    onClick={() => setSettings(s => ({ ...s, fontFamily: 'sans' }))}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-sans cursor-pointer ${
                      settings.fontFamily === 'sans' ? 'bg-[#181818] text-emerald-400 font-bold border border-emerald-500/30' : 'text-emerald-200/60'
                    }`}
                  >
                    Sans
                  </button>
                  <button
                    onClick={() => setSettings(s => ({ ...s, fontFamily: 'serif' }))}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-serif cursor-pointer ${
                      settings.fontFamily === 'serif' ? 'bg-[#181818] text-emerald-400 font-bold border border-emerald-500/30' : 'text-emerald-200/60'
                    }`}
                  >
                    Serif
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard & Touch Gestures Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full text-white relative shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute right-4 top-4 text-emerald-200/60 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base mb-1 text-emerald-400 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>Gestures & Keyboard Controls</span>
            </h3>
            <p className="text-xs text-emerald-200/70 mb-4">Hands-free shortcuts for stage and music stand performance</p>

            <div className="space-y-3">
              <div className="bg-[#121212] p-3 rounded-xl border border-emerald-500/20">
                <h4 className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider">Mobile Touch Gestures</h4>
                <div className="space-y-1.5 text-xs text-emerald-200/80">
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Swipe Left / Right</span>
                    <span className="text-emerald-200/60">Next / Previous Song</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Swipe Up / Down</span>
                    <span className="text-emerald-200/60">Increase / Decrease Speed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Tap Chord Box</span>
                    <span className="text-emerald-200/60">Open Finger Diagram</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#121212] p-3 rounded-xl border border-emerald-500/20">
                <h4 className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider">Keyboard Shortcuts</h4>
                <div className="space-y-1.5 text-xs text-emerald-200/80 font-mono">
                  <div className="flex justify-between">
                    <span className="text-white">Spacebar</span>
                    <span className="text-emerald-200/60">Play / Pause Auto-Scroll</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">Left / Right Arrow</span>
                    <span className="text-emerald-200/60">Prev / Next Song</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">Up / Down Arrow</span>
                    <span className="text-emerald-200/60">Adjust Scroll Speed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">+ / - or [ / ]</span>
                    <span className="text-emerald-200/60">Adjust Font Size</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">T</span>
                    <span className="text-emerald-200/60">Transpose Key</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">F</span>
                    <span className="text-emerald-200/60">Toggle Fullscreen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
