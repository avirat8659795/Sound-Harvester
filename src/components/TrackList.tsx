import React from 'react';
import { Track } from '../types';
import { Play, Pause, Download, CheckCircle2, AlertCircle, Loader2, Tag, Video, Trash2 } from 'lucide-react';

interface TrackListProps {
  tracks: Track[];
  onToggleTrackSelect: (trackId: string) => void;
  onDownloadSingle: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  onDeleteTrack?: (trackId: string) => void;
  currentPlayingTrackId: string | null;
  isPlaying: boolean;
  onInspectTags?: (track: Track) => void;
  onWatchVideo?: (track: Track) => void;
  themeColor?: string;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  onToggleTrackSelect,
  onDownloadSingle,
  onPlayTrack,
  onDeleteTrack,
  currentPlayingTrackId,
  isPlaying,
  onInspectTags,
  onWatchVideo,
  themeColor = '#1DB954'
}) => {
  if (tracks.length === 0) {
    return (
      <div className="bg-[#181818] border border-[#282828] rounded-xl p-8 sm:p-12 text-center text-gray-400">
        <p className="text-base font-semibold text-white mb-1">No matching tracks found</p>
        <p className="text-xs text-gray-500">Try clearing your search filter or paste a new playlist.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#181818] border border-[#282828] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl mb-8">
      {/* Mobile Card List View (Phones < 640px) */}
      <div className="block sm:hidden divide-y divide-[#282828]/60">
        {tracks.map((track, index) => {
          const isCurrentPlaying = currentPlayingTrackId === track.id && isPlaying;
          const isDownloading = track.status === 'downloading';
          const isCompleted = track.status === 'completed';
          const isError = track.status === 'error';

          return (
            <div
              key={track.id}
              className={`p-3.5 transition-colors ${
                isCurrentPlaying ? 'bg-[#222222]' : 'hover:bg-[#1e1e1e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Delete Button (Front of the song) */}
                {onDeleteTrack && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTrack(track.id);
                    }}
                    className="p-2 text-gray-500 hover:text-red-400 active:text-red-500 active:scale-90 hover:bg-red-500/10 rounded-lg transition-all shrink-0 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center -ml-1"
                    title="Delete song from playlist"
                    aria-label={`Delete ${track.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Checkbox */}
                <div className="flex items-center justify-center min-w-[28px] min-h-[28px] shrink-0">
                  <input
                    type="checkbox"
                    checked={!!track.selected}
                    onChange={() => onToggleTrackSelect(track.id)}
                    className="w-4.5 h-4.5 rounded bg-[#121212] border-[#3e3e3e] focus:ring-0 cursor-pointer"
                    style={{ accentColor: themeColor }}
                    aria-label={`Select ${track.title}`}
                  />
                </div>

                {/* Album Art with Tap-To-Play Button */}
                <div
                  className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 cursor-pointer shadow border border-white/5 active:scale-95 transition-transform"
                  onClick={() => onPlayTrack(track)}
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                      isCurrentPlaying ? 'bg-black/50 opacity-100' : 'bg-black/35 opacity-90'
                    }`}
                  >
                    {isCurrentPlaying ? (
                      <Pause className="w-5 h-5 text-white fill-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Title & Artist & Duration */}
                <div className="flex-1 min-w-0 pr-1">
                  <p
                    className="font-bold text-sm truncate leading-tight cursor-pointer"
                    style={{ color: isCurrentPlaying ? themeColor : '#FFFFFF' }}
                    onClick={() => onPlayTrack(track)}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500 font-medium">
                    <span>{track.durationFormatted}</span>
                    <span>•</span>
                    <span className="truncate max-w-[110px]">{track.album || 'Single'}</span>
                  </div>
                </div>

                {/* Status Indicator / Single Download & Action Buttons */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => onDownloadSingle(track)}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[36px] min-w-[64px] bg-[#242424] hover:bg-[#303030] active:scale-95 text-white border border-[#333333]"
                    title="Download MP3"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" style={{ color: themeColor }} />
                    )}
                    <span className="text-[11px] font-semibold">{isCompleted ? 'Done' : 'MP3'}</span>
                  </button>

                  {/* Extra Mobile Actions: Tag & Video */}
                  <div className="flex items-center gap-1">
                    {onInspectTags && (
                      <button
                        onClick={() => onInspectTags(track)}
                        className="text-gray-400 hover:text-white p-1.5 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Inspect ID3 Tags"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onWatchVideo && (
                      <button
                        onClick={() => onWatchVideo(track)}
                        className="text-gray-400 hover:text-red-400 p-1.5 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Watch Music Video"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#282828] text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#141414]">
              <th className="py-3.5 px-3 text-center w-16">
                <span className="sr-only">Selection and Index</span>#
              </th>
              <th className="py-3.5 px-4">Title</th>
              <th className="py-3.5 px-4 hidden md:table-cell">Album</th>
              <th className="py-3.5 px-4 text-center">Duration</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#282828]/40">
            {tracks.map((track, index) => {
              const isCurrentPlaying = currentPlayingTrackId === track.id && isPlaying;
              const isDownloading = track.status === 'downloading';
              const isCompleted = track.status === 'completed';
              const isError = track.status === 'error';

              return (
                <tr
                  key={track.id}
                  className={`group transition-colors ${
                    isCurrentPlaying ? 'bg-[#242424]' : 'hover:bg-[#282828]/50'
                  }`}
                >
                  {/* Front of Song: Delete + Selection Checkbox + # Index / Play Button */}
                  <td className="py-3 px-3 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Delete Button */}
                      {onDeleteTrack && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTrack(track.id);
                          }}
                          className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 active:scale-90"
                          title="Delete song from playlist"
                          aria-label={`Delete ${track.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <input
                        type="checkbox"
                        checked={!!track.selected}
                        onChange={() => onToggleTrackSelect(track.id)}
                        className="w-4 h-4 rounded bg-[#121212] border-[#3e3e3e] focus:ring-0 cursor-pointer"
                        style={{ accentColor: themeColor }}
                      />

                      <span className="text-xs font-semibold text-gray-500 group-hover:hidden w-4 flex items-center justify-center">
                        {isCurrentPlaying ? (
                          <span className="flex items-end gap-[1.5px] h-3.5">
                            <span
                              className="w-[2px] animate-[bounce_0.8s_infinite] h-full rounded-full"
                              style={{ backgroundColor: themeColor }}
                            />
                            <span
                              className="w-[2px] animate-[bounce_0.6s_infinite_0.2s] h-2/3 rounded-full"
                              style={{ backgroundColor: themeColor }}
                            />
                            <span
                              className="w-[2px] animate-[bounce_0.9s_infinite_0.4s] h-4/5 rounded-full"
                              style={{ backgroundColor: themeColor }}
                            />
                          </span>
                        ) : (
                          index + 1
                        )}
                      </span>

                      <button
                        onClick={() => onPlayTrack(track)}
                        className="hidden group-hover:flex items-center justify-center w-4 h-4 text-white hover:scale-110 cursor-pointer transition-transform active:scale-90"
                        style={{ color: isCurrentPlaying ? themeColor : undefined }}
                        title={isCurrentPlaying ? 'Pause preview' : 'Play preview'}
                      >
                        {isCurrentPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Title & Artist with Album Thumbnail */}
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0 group/img">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover shadow border border-white/5"
                        />
                        <button
                          onClick={() => onPlayTrack(track)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-lg cursor-pointer"
                        >
                          {isCurrentPlaying ? (
                            <Pause className="w-4 h-4 text-white fill-white" />
                          ) : (
                            <Play className="w-4 h-4 text-white fill-white" />
                          )}
                        </button>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="font-semibold text-sm truncate"
                            style={{ color: isCurrentPlaying ? themeColor : '#FFFFFF' }}
                          >
                            {track.title}
                          </p>
                          {onInspectTags && (
                            <button
                              onClick={() => onInspectTags(track)}
                              className="text-gray-500 hover:text-gray-300 p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Inspect ID3 Metadata Tags"
                            >
                              <Tag className="w-3 h-3" />
                            </button>
                          )}
                          {onWatchVideo && (
                            <button
                              onClick={() => onWatchVideo(track)}
                              className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Watch Music Video"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                      </div>
                    </div>
                  </td>

                  {/* Album Name */}
                  <td className="py-3 px-4 text-xs text-gray-400 align-middle hidden md:table-cell max-w-[200px] truncate font-medium">
                    {track.album || 'Single'}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-4 text-xs text-gray-400 font-medium align-middle text-center">
                    {track.durationFormatted}
                  </td>

                  {/* Real-time Status Badge */}
                  <td className="py-3 px-4 text-center align-middle">
                    {isDownloading && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Extracting...</span>
                      </span>
                    )}

                    {isCompleted && (
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: `${themeColor}15`,
                          color: themeColor,
                          borderColor: `${themeColor}33`,
                          borderWidth: '1px'
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </span>
                    )}

                    {isError && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Error</span>
                      </span>
                    )}

                    {!isDownloading && !isCompleted && !isError && (
                      <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-[#242424] text-gray-400 border border-[#333333]">
                        Queued
                      </span>
                    )}
                  </td>

                  {/* Action: Single Download MP3 Button & Delete */}
                  <td className="py-3 px-4 text-right align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onDownloadSingle(track)}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bg-[#242424] hover:bg-[#2c2c2c] text-white border border-[#333333] hover:border-white/30"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" style={{ color: themeColor }} />
                        )}
                        <span>{isCompleted ? 'Re-Download' : 'Download'}</span>
                      </button>

                      {onDeleteTrack && (
                        <button
                          type="button"
                          onClick={() => onDeleteTrack(track.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all cursor-pointer"
                          title="Delete track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
