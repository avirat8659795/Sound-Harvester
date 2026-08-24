import React from 'react';
import { PlaylistMetadata } from '../types';
import { formatDuration } from '../utils/spotifyResolver';
import { ExternalLink, Play } from 'lucide-react';

interface PlaylistCardProps {
  playlist: PlaylistMetadata;
  themeColor?: string;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, themeColor = '#1DB954' }) => {
  return (
    <div className="bg-gradient-to-t from-[#181818] to-transparent p-4 sm:p-6 md:p-8 rounded-2xl border border-[#282828]/60 mb-4 sm:mb-6">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-6 md:gap-8">
        {/* Cover Art with Shadow & Hover Play */}
        <div className="w-32 h-32 sm:w-44 sm:h-44 md:w-48 md:h-48 bg-[#282828] rounded-xl shadow-2xl shrink-0 overflow-hidden relative group border border-white/10">
          <img
            src={playlist.coverUrl}
            alt={playlist.title}
            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform"
              style={{ backgroundColor: themeColor }}
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black ml-0.5" />
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 text-center md:text-left min-w-0 w-full">
          <span
            className="text-[11px] sm:text-xs font-bold uppercase tracking-widest"
            style={{ color: themeColor }}
          >
            Public Playlist
          </span>

          <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-tight truncate">
            {playlist.title}
          </h2>

          <p className="text-gray-400 text-xs sm:text-sm max-w-2xl line-clamp-2">
            {playlist.description || 'Spotify playlist ready for batch extraction and MP3 ID3 tag encoding.'}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 mt-1 sm:mt-2 text-xs sm:text-sm text-gray-400">
            <span className="font-bold text-white">{playlist.owner}</span>
            <span className="opacity-50">•</span>
            <span>{playlist.totalTracks} Tracks</span>
            <span className="opacity-50">•</span>
            <span>{formatDuration(playlist.totalDurationMs)}</span>

            {playlist.spotifyUrl && (
              <>
                <span className="opacity-50 hidden sm:inline">•</span>
                <a
                  href={playlist.spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs hover:underline ml-1"
                  style={{ color: themeColor }}
                >
                  <span>Open Spotify</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
