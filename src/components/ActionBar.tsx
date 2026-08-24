import React from 'react';
import { Download, CheckSquare, Square, Filter, Loader2, Sparkles, SlidersHorizontal, XCircle } from 'lucide-react';

interface ActionBarProps {
  totalTracks: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onDownloadAll: () => void;
  isDownloadingAll: boolean;
  downloadProgress: { current: number; total: number; currentTrackName: string; percent: number };
  onCancelDownload?: () => void;
  searchFilter: string;
  onSearchFilterChange: (val: string) => void;
  bitrate: string;
  onBitrateChange: (val: string) => void;
  themeColor?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  totalTracks,
  selectedCount,
  allSelected,
  onToggleSelectAll,
  onDownloadAll,
  isDownloadingAll,
  downloadProgress,
  onCancelDownload,
  searchFilter,
  onSearchFilterChange,
  bitrate,
  onBitrateChange,
  themeColor = '#1DB954'
}) => {
  return (
    <div className="bg-[#181818] border border-[#282828] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 mb-4 sm:mb-5 flex flex-col gap-3 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Top/Left Side: Download One-by-One Button & Selection Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Download All / Selected (One by One) Button */}
          <button
            onClick={onDownloadAll}
            disabled={isDownloadingAll || selectedCount === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold px-4 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer min-h-[42px]"
            style={{
              backgroundColor: themeColor,
              boxShadow: `0 0 16px ${themeColor}55`
            }}
          >
            {isDownloadingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
                <span className="truncate">
                  Downloading {downloadProgress.current} of {downloadProgress.total} ({downloadProgress.percent}%)...
                </span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                <span className="truncate">
                  Download {selectedCount === totalTracks ? 'All Songs' : `${selectedCount} Songs`} (One by One)
                </span>
              </>
            )}
          </button>

          {/* Stop / Cancel Download Queue Button */}
          {isDownloadingAll && onCancelDownload && (
            <button
              onClick={onCancelDownload}
              className="flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3.5 py-2 sm:py-2.5 rounded-full transition-all cursor-pointer font-medium min-h-[42px]"
              title="Stop downloading remaining songs"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Cancel</span>
            </button>
          )}

          {/* Select / Deselect All Toggle */}
          <button
            onClick={onToggleSelectAll}
            disabled={isDownloadingAll}
            className="flex items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white active:scale-95 bg-[#242424] hover:bg-[#2c2c2c] border border-[#333333] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all cursor-pointer font-medium min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Select All ({totalTracks})</span>
              </>
            )}
          </button>

          {/* Selected Count Indicator */}
          <span className="text-[11px] sm:text-xs text-gray-500 font-medium hidden min-[480px]:inline-block">
            {selectedCount} of {totalTracks} selected
          </span>
        </div>

        {/* Bottom/Right Side: Bitrate Selector & Search Filter */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {/* Bitrate Selector */}
          <div className="flex items-center gap-1.5 bg-[#242424] border border-[#333333] rounded-full px-3 py-2 text-xs text-gray-300 shrink-0 min-h-[38px]">
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
            <select
              value={bitrate}
              onChange={(e) => onBitrateChange(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs pr-1"
            >
              <option value="320" className="bg-[#181818] text-white">320 kbps (Original Master)</option>
              <option value="256" className="bg-[#181818] text-white">256 kbps</option>
              <option value="192" className="bg-[#181818] text-white">192 kbps</option>
            </select>
          </div>

          {/* Search Filter */}
          <div className="relative flex-1 lg:w-56">
            <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => onSearchFilterChange(e.target.value)}
              placeholder="Filter tracks..."
              className="w-full bg-[#242424] text-white placeholder:text-gray-500 text-base sm:text-xs rounded-full pl-8 sm:pl-9 pr-3 py-2 border border-[#333333] focus:border-white/50 outline-none min-h-[38px]"
            />
          </div>
        </div>
      </div>

      {/* Real-time Separate Song Download Progress Bar */}
      {isDownloadingAll && (
        <div className="pt-3 border-t border-[#282828] transition-all">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold truncate mr-2" style={{ color: themeColor }}>
              <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span className="truncate">
                Downloading track {downloadProgress.current} of {downloadProgress.total}: {downloadProgress.currentTrackName || 'Authentic studio MP3...'}
              </span>
            </span>
            <span className="font-bold text-white shrink-0">{downloadProgress.percent}%</span>
          </div>
          <div className="w-full bg-[#121212] rounded-full h-2 overflow-hidden border border-[#282828]">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.max(5, downloadProgress.percent)}%`,
                backgroundColor: themeColor,
                boxShadow: `0 0 10px ${themeColor}`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

