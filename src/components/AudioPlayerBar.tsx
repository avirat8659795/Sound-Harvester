import React, { useState, useEffect, useRef } from 'react';
import { Track } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Download,
  RotateCcw,
  Repeat,
  Shuffle,
  Video,
  FileText,
  X,
  Maximize2,
  Radio,
  Mic2
} from 'lucide-react';
import { LyricsModal } from './LyricsModal';
import { MusicVideoModal } from './MusicVideoModal';

interface AudioPlayerBarProps {
  track: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack: (shuffle?: boolean, stopAtEnd?: boolean) => void;
  onPrevTrack: () => void;
  onDownloadCurrent: () => void;
  forceOpenVideo?: number;
  themeColor?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  track,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onDownloadCurrent,
  forceOpenVideo,
  themeColor = '#1DB954'
}) => {
  // Playback & Scrubber State
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [totalDurationSec, setTotalDurationSec] = useState(180);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Playback Modes (Spotify feature parity)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);

  // Detect mobile / touch devices for native background audio prioritization
  const isMobile = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '') || ((navigator.maxTouchPoints || 0) > 0));

  // Background Audio Mode: routes audio through native HTML5 audio stream for continuous lock-screen & notification bar playback
  const [backgroundAudioMode, setBackgroundAudioMode] = useState(true);

  // Keep up-to-date refs to prevent stale closure in YouTube, HTML5, and MediaSession event callbacks
  const onNextTrackRef = useRef(onNextTrack);
  onNextTrackRef.current = onNextTrack;

  const onPrevTrackRef = useRef(onPrevTrack);
  onPrevTrackRef.current = onPrevTrack;

  const onTogglePlayRef = useRef(onTogglePlay);
  onTogglePlayRef.current = onTogglePlay;

  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentTimeSecRef = useRef(currentTimeSec);
  currentTimeSecRef.current = currentTimeSec;

  const totalDurationSecRef = useRef(totalDurationSec);
  totalDurationSecRef.current = totalDurationSec;

  // Modals & Panels
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [isSpotifyEmbedOpen, setIsSpotifyEmbedOpen] = useState(false);

  // Trigger video modal when forceOpenVideo updates
  useEffect(() => {
    if (forceOpenVideo && forceOpenVideo > 0) {
      setIsVideoModalOpen(true);
    }
  }, [forceOpenVideo]);

  // YouTube Player Refs
  const ytPlayerRef = useRef<any>(null);
  const [isYtReady, setIsYtReady] = useState(false);
  const [resolvedVideoId, setResolvedVideoId] = useState<string | null>(track?.youtubeVideoId || null);

  // HTML5 Fallback Audio Ref (Native browser audio element for fallback & background playback)
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const [useHtmlAudio, setUseHtmlAudio] = useState(false);

  // Load YouTube Iframe API once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initYtPlayer();
      };
    } else if (window.YT && window.YT.Player) {
      initYtPlayer();
    }

    function initYtPlayer() {
      if (ytPlayerRef.current) return;
      try {
        ytPlayerRef.current = new window.YT.Player('soundharvest-yt-player', {
          height: '240',
          width: '320',
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              setIsYtReady(true);
              ytPlayerRef.current?.setVolume(volume * 100);
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 0 = ENDED
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsBuffering(false);
              } else if (event.data === window.YT.PlayerState.BUFFERING) {
                setIsBuffering(true);
              } else if (event.data === window.YT.PlayerState.ENDED) {
                setIsBuffering(false);
                if (repeatModeRef.current === 'one') {
                  ytPlayerRef.current?.seekTo(0, true);
                  ytPlayerRef.current?.playVideo();
                } else {
                  onNextTrackRef.current(isShuffleRef.current, repeatModeRef.current === 'off');
                }
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player error, falling back to HTML5 audio:', err);
              setUseHtmlAudio(true);
              setIsBuffering(false);
            }
          }
        });
      } catch (e) {
        console.warn('Failed to init YT player:', e);
        setUseHtmlAudio(true);
      }
    }
  }, []);

  // When track changes: resolve exact original YouTube media and prepare playback
  useEffect(() => {
    if (!track) return;

    setCurrentTimeSec(0);
    setProgressPercent(0);
    const initialDur = Math.max(30, Math.floor((track.durationMs || 180000) / 1000));
    setTotalDurationSec(initialDur);

    let isMounted = true;

    async function loadTrackMedia() {
      const audioStreamUrl = track!.previewAudioUrl || `/api/audio/stream?title=${encodeURIComponent(track!.title)}&artist=${encodeURIComponent(track!.artist)}&duration=${initialDur}&isrc=${encodeURIComponent(track!.isrc || '')}`;

      let vId = track?.youtubeVideoId || null;

      if (!vId) {
        setIsBuffering(true);
        try {
          const res = await fetch(`/api/youtube/find?title=${encodeURIComponent(track!.title)}&artist=${encodeURIComponent(track!.artist)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.videoId) {
              vId = data.videoId;
              if (data.durationSec) {
                setTotalDurationSec(data.durationSec);
              }
            }
          }
        } catch (err) {
          console.warn('Error finding original video ID:', err);
        }
      }

      if (!isMounted) return;

      if (vId) {
        setResolvedVideoId(vId);
        setUseHtmlAudio(false);

        if (isYtReady && ytPlayerRef.current?.loadVideoById) {
          try {
            if (isPlaying) {
              setIsBuffering(true);
              ytPlayerRef.current.loadVideoById({ videoId: vId, startSeconds: 0 });
              ytPlayerRef.current.playVideo();
            } else {
              ytPlayerRef.current.cueVideoById({ videoId: vId, startSeconds: 0 });
            }
          } catch (e) {
            console.warn('YT loadVideo error:', e);
          }
        }
      } else {
        // Fallback to HTML5 audio stream
        setUseHtmlAudio(true);
        if (htmlAudioRef.current) {
          htmlAudioRef.current.src = audioStreamUrl;
          htmlAudioRef.current.currentTime = 0;
          if (isPlaying) {
            htmlAudioRef.current.play().catch(() => {});
          }
        }
      }
    }

    loadTrackMedia();

    return () => {
      isMounted = false;
    };
  }, [track?.id, isYtReady]);

  // Sync Play / Pause state with active engine
  useEffect(() => {
    if (!track) return;

    if (!useHtmlAudio && isYtReady && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          const state = ytPlayerRef.current.getPlayerState?.();
          if (state !== 1 && state !== 3) {
            ytPlayerRef.current.playVideo?.();
          }
        } else {
          ytPlayerRef.current.pauseVideo?.();
        }
      } catch (err) {
        console.warn('YT Play/Pause error:', err);
      }
    } else if (useHtmlAudio && htmlAudioRef.current) {
      if (isPlaying) {
        htmlAudioRef.current.play().catch(() => {});
      } else {
        htmlAudioRef.current.pause();
      }
    }
  }, [isPlaying, isYtReady, useHtmlAudio]);

  // Setup Standard Web MediaSession API (Lock Screen & Notification Shade Controller)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !navigator.mediaSession || !track) return;

    try {
      // 1. Set Track Metadata with multi-resolution artwork
      if (typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || 'SoundHarvest Playlist',
          artwork: [
            { src: track.coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '384x384', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }
          ]
        });
      }

      // 2. Set Playback State
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // 3. Register Action Handlers safely for Lock Screen & Notification Bar
      const safeSetAction = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {
          // Action not supported on this device/browser version
        }
      };

      safeSetAction('play', () => {
        if (!isPlayingRef.current) {
          onTogglePlayRef.current();
        }
      });

      safeSetAction('pause', () => {
        if (isPlayingRef.current) {
          onTogglePlayRef.current();
        }
      });

      safeSetAction('previoustrack', () => {
        if (currentTimeSecRef.current > 2.5) {
          handleSeekDirect(0);
        } else {
          onPrevTrackRef.current();
        }
      });

      safeSetAction('nexttrack', () => {
        onNextTrackRef.current(isShuffleRef.current, repeatModeRef.current === 'off');
      });

      safeSetAction('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          handleSeekDirect(details.seekTime);
        }
      });

      safeSetAction('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        handleSeekDirect(Math.max(0, currentTimeSecRef.current - skipTime));
      });

      safeSetAction('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        handleSeekDirect(Math.min(totalDurationSecRef.current, currentTimeSecRef.current + skipTime));
      });

      safeSetAction('stop', () => {
        if (isPlayingRef.current) {
          onTogglePlayRef.current();
        }
      });
    } catch (err) {
      console.debug('MediaSession registration note:', err);
    }
  }, [track?.id, isPlaying]);

  // Timer loop: Track live playback position and sync lock-screen scrubber
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying) return;

      let current = 0;
      let dur = totalDurationSec;

      if (!useHtmlAudio && isYtReady && ytPlayerRef.current?.getCurrentTime) {
        try {
          const ytCurrent = ytPlayerRef.current.getCurrentTime();
          const ytDur = ytPlayerRef.current.getDuration();
          if (ytCurrent !== undefined && !isNaN(ytCurrent)) {
            current = ytCurrent;
            if (ytDur && !isNaN(ytDur) && ytDur > 0) {
              dur = ytDur;
              setTotalDurationSec(dur);
            }
          }
        } catch {
          // ignore
        }
      } else if (useHtmlAudio && htmlAudioRef.current) {
        current = htmlAudioRef.current.currentTime || 0;
        dur = htmlAudioRef.current.duration || totalDurationSec;
      }

      setCurrentTimeSec(current);
      setProgressPercent(dur > 0 ? Math.min(100, (current / dur) * 100) : 0);

      // Sync Lock Screen & Notification Progress Bar
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          if (dur > 0 && current <= dur) {
            navigator.mediaSession.setPositionState({
              duration: dur,
              playbackRate: 1.0,
              position: Math.max(0, Math.min(current, dur))
            });
          }
        } catch {
          // ignore
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, isYtReady, totalDurationSec, useHtmlAudio]);

  // Volume & Mute Sync
  useEffect(() => {
    const targetVol = isMuted ? 0 : volume;

    if (isYtReady && ytPlayerRef.current) {
      try {
        if (isMuted) {
          ytPlayerRef.current.mute?.();
        } else {
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.setVolume?.(volume * 100);
        }
      } catch {
        // ignore
      }
    }

    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = targetVol;
    }
  }, [volume, isMuted, isYtReady]);

  // Format mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const totalSecs = Math.floor(secs);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Direct Seek to specific second timestamp
  const handleSeekDirect = (targetSec: number) => {
    const boundedSec = Math.max(0, Math.min(targetSec, totalDurationSec || 180));
    setCurrentTimeSec(boundedSec);
    setProgressPercent((boundedSec / (totalDurationSec || 180)) * 100);

    if (!useHtmlAudio && isYtReady && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(boundedSec, true);
    } else if (htmlAudioRef.current) {
      htmlAudioRef.current.currentTime = boundedSec;
    }

    if (!isPlaying) {
      onTogglePlay();
    }
  };

  // Interactive Timeline Scrub / Seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPct = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
    const targetSec = (newPct / 100) * totalDurationSec;
    handleSeekDirect(targetSec);
  };

  // Previous Track or Restart to 0:00 (Spotify Behavior)
  const handlePreviousClick = () => {
    if (currentTimeSec > 2.5) {
      if (!useHtmlAudio && isYtReady && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(0, true);
      } else if (htmlAudioRef.current) {
        htmlAudioRef.current.currentTime = 0;
      }
      setCurrentTimeSec(0);
      setProgressPercent(0);
    } else {
      onPrevTrack();
    }
  };

  // Cycle Repeat Mode: off -> all -> one -> off
  const handleCycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  if (!track) return null;

  return (
    <>
      {/* Hidden YouTube Iframe Player Container */}
      <div
        className={`fixed ${isVideoModalOpen ? 'bottom-24 right-6 z-50 shadow-2xl rounded-2xl overflow-hidden border border-[#333]' : 'opacity-0 pointer-events-none -top-[9999px] -left-[9999px]'}`}
        style={isVideoModalOpen ? { width: '380px', height: '215px' } : undefined}
      >
        <div id="soundharvest-yt-player" className="w-full h-full" />
      </div>

      {/* HTML5 Audio Element Fallback & Mobile Background Audio Engine */}
      <audio
        ref={htmlAudioRef}
        preload="auto"
        playsInline
        onEnded={() => {
          if (repeatModeRef.current === 'one' && htmlAudioRef.current) {
            htmlAudioRef.current.currentTime = 0;
            htmlAudioRef.current.play().catch(() => {});
          } else {
            onNextTrackRef.current(isShuffleRef.current, repeatModeRef.current === 'off');
          }
        }}
        onPlay={() => {
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        }}
        onPause={() => {
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        }}
      />

      {/* Spotify-Style Bottom Sticky Player Bar with Mobile & Desktop Layouts */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#181818]/98 backdrop-blur-md border-t border-[#282828] shadow-[0_-10px_30px_rgba(0,0,0,0.85)] select-none pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)]">
        {/* Top Edge Progress Bar for Mobile (Always visible scrubber with easy touch target) */}
        <div
          className="w-full bg-[#2c2c2c] h-2 cursor-pointer relative group md:hidden touch-none"
          onClick={handleSeek}
          title="Seek playback"
        >
          <div
            className="h-full transition-all relative"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: themeColor,
              boxShadow: `0 0 10px ${themeColor}`
            }}
          >
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
          {/* Mobile Player Row (< md) */}
          <div className="flex md:hidden items-center justify-between gap-2">
            {/* Left: Thumbnail & Info */}
            <div
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer active:opacity-80"
              onClick={() => setIsVideoModalOpen(true)}
            >
              <div className="relative shrink-0">
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-10 h-10 rounded-lg object-cover shadow border border-white/10"
                />
                {isPlaying && !isBuffering && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#181818] animate-pulse"
                    style={{ backgroundColor: themeColor }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-bold text-white truncate leading-tight"
                  style={{ color: isPlaying ? themeColor : '#FFFFFF' }}
                >
                  {track.title}
                </p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{track.artist}</p>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Lyrics Button */}
              <button
                onClick={() => setIsLyricsModalOpen(!isLyricsModalOpen)}
                className={`p-2 rounded-full transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-90 ${
                  isLyricsModalOpen
                    ? 'text-black font-bold'
                    : 'text-gray-400 hover:text-white bg-[#242424]'
                }`}
                style={isLyricsModalOpen ? { backgroundColor: themeColor } : {}}
                title="Lyrics"
              >
                <Mic2 className="w-4 h-4" />
              </button>

              {/* Prev */}
              <button
                onClick={handlePreviousClick}
                className="text-gray-400 hover:text-white p-2 active:scale-90 transition-transform cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Previous"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              {/* Play / Pause Main Button */}
              <button
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-full text-black flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: themeColor,
                  boxShadow: `0 0 12px ${themeColor}66`
                }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isBuffering ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4.5 h-4.5 fill-black" />
                ) : (
                  <Play className="w-4.5 h-4.5 fill-black ml-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={() => onNextTrack(isShuffle, false)}
                className="text-gray-400 hover:text-white p-2 active:scale-90 transition-transform cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Next"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              {/* Single MP3 Download Button */}
              <button
                onClick={onDownloadCurrent}
                className="flex items-center justify-center p-2 rounded-full bg-[#282828] hover:bg-[#333333] active:scale-90 text-white transition-all cursor-pointer min-h-[38px] min-w-[38px]"
                title="Download MP3"
              >
                <Download className="w-4 h-4" style={{ color: themeColor }} />
              </button>
            </div>
          </div>

          {/* Desktop Player Layout (>= md) */}
          <div className="hidden md:flex items-center justify-between gap-4">
            {/* Left Column: Track Info & Artwork */}
            <div className="flex items-center gap-3 w-1/4 min-w-[180px] max-w-[300px]">
              <div
                className="relative shrink-0 group cursor-pointer"
                onClick={() => setIsVideoModalOpen(!isVideoModalOpen)}
              >
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-13 h-13 rounded-md object-cover shadow-lg border border-white/10"
                />
                <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
                {isPlaying && !isBuffering && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#181818] animate-pulse"
                    style={{ backgroundColor: themeColor }}
                  />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
                  {track.title}
                </p>
                <p className="text-xs text-[#b3b3b3] truncate hover:text-white transition-colors cursor-pointer">
                  {track.artist}
                </p>
              </div>
            </div>

            {/* Center Column: Full Audio Controls & Timeline Scrubber */}
            <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
              {/* Control Buttons */}
              <div className="flex items-center gap-4">
                {/* Shuffle Toggle */}
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className="transition-colors cursor-pointer p-1"
                  style={{ color: isShuffle ? themeColor : '#b3b3b3' }}
                  title={isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Previous Track / Restart */}
                <button
                  onClick={handlePreviousClick}
                  className="text-[#b3b3b3] hover:text-white transition-transform active:scale-90 cursor-pointer p-1"
                  title="Previous Track (or Restart from 0:00)"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                {/* Main Play / Pause Button */}
                <button
                  onClick={onTogglePlay}
                  className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-lg cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play Track'}
                >
                  {isBuffering ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4 fill-black" />
                  ) : (
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  )}
                </button>

                {/* Next Track */}
                <button
                  onClick={() => onNextTrack(isShuffle, false)}
                  className="text-[#b3b3b3] hover:text-white transition-transform active:scale-90 cursor-pointer p-1"
                  title="Next Track"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                {/* Repeat Mode Toggle */}
                <button
                  onClick={handleCycleRepeat}
                  className="transition-colors cursor-pointer p-1 relative"
                  style={{ color: repeatMode !== 'off' ? themeColor : '#b3b3b3' }}
                  title={`Repeat: ${repeatMode.toUpperCase()}`}
                >
                  <Repeat className="w-4 h-4" />
                  {repeatMode === 'one' && (
                    <span
                      className="absolute -top-1 -right-1 text-[9px] font-black text-black w-3 h-3 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: themeColor }}
                    >
                      1
                    </span>
                  )}
                </button>

                {/* Replay 0:00 Button */}
                <button
                  onClick={() => {
                    if (!useHtmlAudio && isYtReady && ytPlayerRef.current?.seekTo) {
                      ytPlayerRef.current.seekTo(0, true);
                    } else if (htmlAudioRef.current) {
                      htmlAudioRef.current.currentTime = 0;
                    }
                    setCurrentTimeSec(0);
                    setProgressPercent(0);
                  }}
                  className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer p-1"
                  title="Replay from Beginning (0:00)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Spotify Timeline Scrubber */}
              <div className="w-full flex items-center gap-2 text-[11px] text-[#b3b3b3] font-mono select-none">
                <span className="w-10 text-right">{formatTime(currentTimeSec)}</span>

                <div
                  className="flex-1 bg-[#4d4d4d] hover:bg-[#5e5e5e] h-1.5 rounded-full overflow-hidden cursor-pointer group relative py-1.5 my-0.5 flex items-center transition-all"
                  onClick={handleSeek}
                  title="Seek anywhere in full track"
                >
                  <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden relative">
                    <div
                      className="h-full transition-all relative"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: themeColor
                      }}
                    >
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity" />
                    </div>
                  </div>
                </div>

                <span className="w-10 text-left text-[#888888]">{formatTime(totalDurationSec)}</span>
              </div>
            </div>

            {/* Right Column: Audio Output Controls & Modals */}
            <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[180px]">
              {/* Music Video Modal Toggle */}
              <button
                onClick={() => setIsVideoModalOpen(!isVideoModalOpen)}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  isVideoModalOpen
                    ? 'text-white bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.6)]'
                    : 'text-[#b3b3b3] hover:text-white bg-[#282828]/60 hover:bg-[#282828]'
                }`}
                title="Watch Official Music Video"
              >
                <Video className="w-3.5 h-3.5 text-red-400" />
                <span>Video</span>
              </button>

              {/* Lyrics Drawer Toggle */}
              <button
                onClick={() => setIsLyricsModalOpen(!isLyricsModalOpen)}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  isLyricsModalOpen
                    ? 'text-black font-bold shadow-md'
                    : 'text-[#b3b3b3] hover:text-white bg-[#282828]/60 hover:bg-[#282828]'
                }`}
                style={isLyricsModalOpen ? { backgroundColor: themeColor } : {}}
                title="View Real-Time Synced Karaoke Lyrics"
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>Lyrics</span>
              </button>

              {/* Spotify Official Embed Toggle */}
              <button
                onClick={() => setIsSpotifyEmbedOpen(!isSpotifyEmbedOpen)}
                className="p-1.5 rounded-full transition-colors cursor-pointer hidden lg:flex items-center gap-1 text-xs"
                style={{ color: isSpotifyEmbedOpen ? themeColor : '#b3b3b3' }}
                title="Toggle Official Spotify Embed Player"
              >
                <Radio className="w-4 h-4" />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer p-1"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-18 h-1 bg-[#4d4d4d] rounded-lg cursor-pointer transition-all"
                  style={{ accentColor: themeColor }}
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>

              {/* Quick MP3 Download Button */}
              <button
                onClick={onDownloadCurrent}
                className="flex items-center gap-1 text-black font-bold text-xs px-3 py-1.5 rounded-full shadow transition-all hover:scale-105 active:scale-95 cursor-pointer ml-1"
                style={{
                  backgroundColor: themeColor,
                  boxShadow: `0 0 10px ${themeColor}44`
                }}
                title="Download Original Track MP3 with ID3 Tags"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span className="hidden sm:inline">MP3</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Music Video HD Player Modal */}
      <MusicVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        track={track}
        initialVideoId={resolvedVideoId}
        onVideoPlayingChange={(active) => {
          if (active && isPlaying) {
            onTogglePlay();
          }
        }}
      />

      {/* Real-time Synced Karaoke Lyrics Modal */}
      <LyricsModal
        isOpen={isLyricsModalOpen}
        onClose={() => setIsLyricsModalOpen(false)}
        track={track}
        currentTimeSec={currentTimeSec}
        totalDurationSec={totalDurationSec}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onSeek={handleSeekDirect}
      />

      {/* Spotify Official Embed Modal */}
      {isSpotifyEmbedOpen && (
        <div className="fixed bottom-24 left-6 z-50 bg-[#181818] border border-[#282828] rounded-2xl shadow-2xl p-3 flex flex-col gap-2 w-80 sm:w-96 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#282828] pb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#1DB954]" />
              <span className="text-xs font-bold text-white">Official Spotify Web Player</span>
            </div>
            <button
              onClick={() => setIsSpotifyEmbedOpen(false)}
              className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://open.spotify.com/embed/track/${track.id.replace('track_', '')}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Embed"
            />
          </div>
        </div>
      )}
    </>
  );
};
