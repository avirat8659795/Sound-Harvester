import React, { useState, useEffect, useRef } from 'react';
import { Track } from '../types';
import {
  X,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Music2,
  Maximize2,
  Minimize2,
  Type,
  ArrowDownCircle,
  Loader2,
  ExternalLink,
  Mic2
} from 'lucide-react';

interface LyricLine {
  timeSec: number;
  text: string;
}

interface LyricsData {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  lines: LyricLine[];
  instrumental: boolean;
  source: string;
}

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  currentTimeSec: number;
  totalDurationSec: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  track,
  currentTimeSec,
  totalDurationSec,
  isPlaying,
  onTogglePlay,
  onSeek
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontSize, setFontSize] = useState<'md' | 'lg' | 'xl'>('lg');
  const [autoScroll, setAutoScroll] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Fetch lyrics when track changes or modal opens
  useEffect(() => {
    if (!isOpen || !track) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const dur = Math.round((track.durationMs || 180000) / 1000);
    const queryParams = new URLSearchParams({
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      duration: dur.toString()
    });

    fetch(`/api/lyrics?${queryParams.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch lyrics');
        return res.json();
      })
      .then((data: LyricsData) => {
        if (!isMounted) return;
        setLyricsData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Lyrics fetch error:', err);
        setError('Could not load synced lyrics for this track.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [track?.id, isOpen]);

  // Compute active line index based on current playback time
  const lines = lyricsData?.lines || [];
  const activeIndex = lines.length > 0
    ? lines.reduce((acc, line, idx) => {
        if (currentTimeSec >= line.timeSec) {
          return idx;
        }
        return acc;
      }, -1)
    : -1;

  // Auto-scroll to keep active line vertically centered
  useEffect(() => {
    if (!autoScroll || activeIndex === -1 || !activeLineRef.current || !containerRef.current) return;

    activeLineRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, [activeIndex, autoScroll]);

  // Handle user manual scroll pause
  const handleUserScroll = () => {
    // If user is manually scrolling around, we can temporarily allow free browsing
  };

  // Format mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const totalSecs = Math.floor(secs);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen || !track) return null;

  // Text size classes
  const getTextSizeClass = (isActive: boolean) => {
    if (fontSize === 'xl') {
      return isActive
        ? 'text-2xl sm:text-4xl md:text-5xl font-black'
        : 'text-xl sm:text-2xl md:text-3xl font-bold';
    }
    if (fontSize === 'lg') {
      return isActive
        ? 'text-xl sm:text-3xl md:text-4xl font-extrabold'
        : 'text-lg sm:text-xl md:text-2xl font-semibold';
    }
    // md
    return isActive
      ? 'text-lg sm:text-2xl md:text-3xl font-extrabold'
      : 'text-base sm:text-lg md:text-xl font-medium';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all ${
        isFullScreen ? 'p-0' : 'p-3 sm:p-6'
      } bg-black/80 backdrop-blur-xl animate-fadeIn`}
    >
      <div
        className={`relative flex flex-col bg-[#121212] border border-[#282828] ${
          isFullScreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-4xl h-[90vh] rounded-3xl'
        } shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-300`}
        style={{
          background: 'radial-gradient(circle at 50% 20%, #1e3a29 0%, #121212 60%, #0d0d0d 100%)'
        }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#1DB954] uppercase tracking-wider bg-[#1DB954]/10 px-2 py-0.5 rounded-full">
                  <Mic2 className="w-3 h-3" /> Live Synced Lyrics
                </span>
                {lyricsData?.source && (
                  <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                    • {lyricsData.source.toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white truncate">{track.title}</h2>
              <p className="text-xs text-gray-300 truncate">
                {track.artist} {track.album ? `• ${track.album}` : ''}
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Font Size Toggle */}
            <button
              onClick={() => {
                if (fontSize === 'md') setFontSize('lg');
                else if (fontSize === 'lg') setFontSize('xl');
                else setFontSize('md');
              }}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
              title={`Karaoke Text Size: ${fontSize.toUpperCase()}`}
            >
              <Type className="w-4 h-4" />
              <span className="uppercase text-[11px]">{fontSize}</span>
            </button>

            {/* Auto-scroll re-center button */}
            <button
              onClick={() => {
                setAutoScroll(true);
                activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={`p-2 rounded-full transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                autoScroll
                  ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
              title="Auto-Scroll Sync"
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Sync</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Karaoke'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Lyrics"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Lyrics Scrolling Body */}
        <div
          ref={containerRef}
          onScroll={handleUserScroll}
          className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-16 py-16 scroll-smooth space-y-6 select-none relative"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#1DB954] animate-spin" />
              <div>
                <p className="text-lg font-bold text-white">Fetching Live Synced Lyrics...</p>
                <p className="text-xs text-gray-400">Connecting to global studio lyric library</p>
              </div>
            </div>
          )}

          {/* Instrumental Track Notification */}
          {!isLoading && lyricsData?.instrumental && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
                <Music2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Instrumental Track</h3>
              <p className="text-sm text-gray-400 max-w-md">
                This recording is recognized as an official instrumental master track with no vocal lyrics.
              </p>
            </div>
          )}

          {/* Synced LRC Lyrics List */}
          {!isLoading && !lyricsData?.instrumental && lines.length > 0 && (
            <div className="max-w-3xl mx-auto space-y-5 sm:space-y-7 py-8">
              {/* Intro Banner if music hasn't reached first lyric */}
              {activeIndex === -1 && currentTimeSec < (lines[0]?.timeSec || 5) && (
                <div className="py-6 text-center animate-pulse">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1DB954]/10 text-[#1DB954] text-sm font-bold border border-[#1DB954]/20">
                    <Sparkles className="w-4 h-4 animate-spin" /> ♪ [Music Intro Playing...] ♪
                  </span>
                </div>
              )}

              {lines.map((line, idx) => {
                const isActive = idx === activeIndex;
                const isPast = idx < activeIndex;
                const isFuture = idx > activeIndex;

                return (
                  <div
                    key={`${line.timeSec}-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => {
                      onSeek(line.timeSec);
                      if (!isPlaying) onTogglePlay();
                    }}
                    className={`group cursor-pointer rounded-2xl p-3 sm:p-4 transition-all duration-300 relative flex items-start gap-3 ${
                      isActive
                        ? 'bg-white/10 text-white shadow-2xl scale-[1.02] border-l-4 border-[#1DB954]'
                        : isPast
                        ? 'text-white/40 hover:text-white/70 hover:bg-white/5'
                        : 'text-white/20 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {/* Timestamp & Karaoke Bullet */}
                    <span
                      className={`text-xs font-mono shrink-0 pt-1.5 w-10 transition-opacity ${
                        isActive
                          ? 'text-[#1DB954] font-bold opacity-100'
                          : 'text-gray-500 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {formatTime(line.timeSec)}
                    </span>

                    {/* Lyric Text Line */}
                    <div className="flex-1">
                      <p
                        className={`leading-relaxed tracking-tight transition-all duration-300 ${getTextSizeClass(
                          isActive
                        )} ${
                          isActive
                            ? 'text-white drop-shadow-[0_0_25px_rgba(29,185,84,0.5)]'
                            : ''
                        }`}
                      >
                        {line.text}
                      </p>
                    </div>

                    {/* Interactive Click-to-seek icon */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1 text-gray-400 group-hover:text-white shrink-0">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Plain Lyrics Fallback */}
          {!isLoading && !lyricsData?.instrumental && lines.length === 0 && lyricsData?.plainLyrics && (
            <div className="max-w-2xl mx-auto py-8 text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-gray-400 text-xs font-semibold mb-4">
                Full Studio Lyrics (Unsynced)
              </div>
              <div className="whitespace-pre-line text-lg sm:text-xl font-medium leading-loose text-gray-200">
                {lyricsData.plainLyrics}
              </div>
            </div>
          )}

          {/* Not Found / Error State */}
          {!isLoading && !lyricsData?.instrumental && lines.length === 0 && !lyricsData?.plainLyrics && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-3">
              <p className="text-lg font-bold text-gray-300">No synchronized lyrics found</p>
              <p className="text-xs text-gray-500 max-w-sm">
                We couldn't retrieve timed lyrics for "{track.title}" by {track.artist}.
              </p>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${track.artist} ${track.title} lyrics`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#1DB954] hover:underline font-semibold mt-2"
              >
                Search lyrics on Google <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Bottom Interactive Control Bar inside Lyrics View */}
        <div className="px-6 py-4 bg-black/60 backdrop-blur-xl border-t border-white/10 flex items-center justify-between gap-4 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onTogglePlay}
              className="w-11 h-11 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer font-bold"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
            </button>
            <div className="text-xs font-mono text-gray-400">
              <span className="text-white font-bold">{formatTime(currentTimeSec)}</span> / {formatTime(totalDurationSec)}
            </div>
          </div>

          {/* Quick Scrub Slider */}
          <div className="flex-1 max-w-md mx-4">
            <input
              type="range"
              min="0"
              max={totalDurationSec || 180}
              step="0.5"
              value={currentTimeSec}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 accent-[#1DB954] rounded-lg cursor-pointer transition-all hover:bg-white/30"
            />
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
