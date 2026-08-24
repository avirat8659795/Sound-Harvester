import React, { useState, useEffect } from 'react';
import { Track } from '../types';
import {
  Video,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  RefreshCw,
  Tv,
  Film,
  Music,
  Sparkles,
  Loader2,
  Volume2
} from 'lucide-react';

export interface VideoOption {
  id: string;
  title: string;
  durationFormatted: string;
  thumbnailUrl?: string;
  channelTitle?: string;
}

interface MusicVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  initialVideoId?: string | null;
  onVideoPlayingChange?: (isPlayingVideo: boolean) => void;
}

export const MusicVideoModal: React.FC<MusicVideoModalProps> = ({
  isOpen,
  onClose,
  track,
  initialVideoId,
  onVideoPlayingChange
}) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(initialVideoId || null);
  const [videoList, setVideoList] = useState<VideoOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Sync initialVideoId
  useEffect(() => {
    if (initialVideoId) {
      setSelectedVideoId(initialVideoId);
    }
  }, [initialVideoId]);

  // Fetch official videos list whenever track changes or modal opens
  useEffect(() => {
    if (!isOpen || !track) return;

    let isMounted = true;
    setIsLoading(true);

    const queryParams = new URLSearchParams({
      title: track.title,
      artist: track.artist
    });

    fetch(`/api/youtube/videos?${queryParams.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch videos');
        return res.json();
      })
      .then((data: { videos: VideoOption[]; primaryVideoId: string | null }) => {
        if (!isMounted) return;
        setVideoList(data.videos || []);
        if (data.primaryVideoId && !selectedVideoId) {
          setSelectedVideoId(data.primaryVideoId);
        } else if (data.videos && data.videos.length > 0 && !selectedVideoId) {
          setSelectedVideoId(data.videos[0].id);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Could not fetch video list:', err);
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [track?.id, isOpen]);

  // Notify parent player that video is active (so audio doesn't clash)
  useEffect(() => {
    if (isOpen) {
      onVideoPlayingChange?.(true);
    } else {
      onVideoPlayingChange?.(false);
    }
  }, [isOpen, onVideoPlayingChange]);

  if (!isOpen || !track) return null;

  const currentVideo = videoList.find((v) => v.id === selectedVideoId) || videoList[0];
  const activeVideoId = selectedVideoId || track.youtubeVideoId || currentVideo?.id;

  // Minimized Floating PiP widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-24 right-6 z-50 bg-[#181818] border border-[#282828] rounded-2xl p-3 shadow-2xl flex items-center gap-3 w-80 animate-fadeIn select-none">
        <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center text-[#1DB954] shrink-0 border border-white/10 relative overflow-hidden">
          <Film className="w-6 h-6 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">{track.title}</p>
          <p className="text-[11px] text-gray-400 truncate">{track.artist} • Video Playing</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-full bg-[#282828] hover:bg-[#333] text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Expand Video Player"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#282828] hover:bg-red-500/20 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
            title="Close Video"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn ${
        isTheaterMode ? 'p-0' : ''
      }`}
    >
      <div
        className={`relative flex flex-col bg-[#121212] border border-[#282828] ${
          isTheaterMode
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-5xl max-h-[92vh] rounded-3xl'
        } shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden transition-all duration-300`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#282828] bg-[#1a1a1a]/90 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded-full">
                  Official Music Video
                </span>
                <span className="text-xs text-gray-400 hidden sm:inline">• High Definition (1080p)</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {track.title} <span className="text-gray-400 font-normal sm:inline hidden">— {track.artist}</span>
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Direct YouTube Link */}
            {activeVideoId && (
              <a
                href={`https://www.youtube.com/watch?v=${activeVideoId}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                title="Watch directly on YouTube"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Minimize / PiP Toggle */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Minimize to Corner Widget"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Theater / Fullscreen Toggle */}
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
              title={isTheaterMode ? 'Exit Theater Mode' : 'Theater Full Mode'}
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 transition-colors cursor-pointer"
              title="Close Video Player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Stage & Side Selector */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-black">
          {/* Main Video Player Screen */}
          <div className="flex-1 flex flex-col justify-center items-center relative bg-black min-h-[260px] sm:min-h-[380px] lg:min-h-[460px]">
            {activeVideoId ? (
              <iframe
                key={activeVideoId}
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
                title={`${track.title} - ${track.artist}`}
                className="w-full h-full border-0 absolute inset-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center">
                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                <p className="text-sm font-bold text-white">Searching official 4K/HD video...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center">
                <Film className="w-12 h-12 text-gray-600" />
                <p className="text-sm font-bold text-gray-300">No official video stream loaded</p>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist} ${track.title} official video`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  Search on YouTube <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Right/Bottom Video Options Drawer */}
          <div className="w-full lg:w-80 bg-[#161616] border-t lg:border-t-0 lg:border-l border-[#282828] flex flex-col max-h-56 lg:max-h-none overflow-y-auto p-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" /> Video Versions
              </span>
              {isLoading && <Loader2 className="w-3 h-3 text-[#1DB954] animate-spin" />}
            </div>

            {videoList.length === 0 && !isLoading && (
              <p className="text-xs text-gray-500">No alternative versions found.</p>
            )}

            <div className="space-y-2">
              {videoList.map((vid) => {
                const isCurrent = vid.id === activeVideoId;
                return (
                  <button
                    key={vid.id}
                    onClick={() => setSelectedVideoId(vid.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3 border ${
                      isCurrent
                        ? 'bg-red-500/15 border-red-500/40 shadow-sm'
                        : 'bg-[#202020] hover:bg-[#282828] border-transparent hover:border-[#383838]'
                    }`}
                  >
                    {vid.thumbnailUrl ? (
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="w-16 h-10 object-cover rounded-lg shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-black rounded-lg flex items-center justify-center text-gray-500 shrink-0">
                        <Video className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCurrent ? 'text-red-400 font-bold' : 'text-gray-200'
                        }`}
                      >
                        {vid.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span>{vid.durationFormatted}</span>
                        {vid.channelTitle && <span className="truncate max-w-[100px]">• {vid.channelTitle}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Info Bar */}
        <div className="px-6 py-3 border-t border-[#282828] bg-[#141414] flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
            <span className="text-white font-medium">Sound Harvester Video Engine</span>
            <span className="hidden sm:inline">• Stereo Audio Synchronized</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
          >
            Close Video
          </button>
        </div>
      </div>
    </div>
  );
};
