import React, { useState } from 'react';
import { Search, Clipboard, Loader2, AlertCircle, Music, EyeOff, Eye, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onFetch: (url: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  isSearchBarVisible?: boolean;
  onToggleSearchBar?: () => void;
  themeColor?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onFetch,
  isLoading,
  error,
  onClearError,
  isSearchBarVisible = true,
  onToggleSearchBar,
  themeColor = '#1DB954'
}) => {
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onFetch(urlInput.trim());
    }
  };

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text);
          onClearError();
        }
      }
    } catch {
      // Clipboard permissions or insecure context
    }
  };

  const handlePresetClick = (playlistId: string) => {
    const fullUrl = `https://open.spotify.com/playlist/${playlistId}`;
    setUrlInput(fullUrl);
    onFetch(fullUrl);
  };

  // If search bar is hidden for clean look, show a minimal collapsible restore bar
  if (!isSearchBarVisible) {
    return (
      <div className="max-w-4xl mx-auto mb-3 sm:mb-4 animate-fadeIn px-2">
        <div className="flex items-center justify-between bg-[#181818] border border-[#282828] hover:border-white/20 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs text-gray-400 transition-all">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}` }}
            />
            <span className="text-gray-300 font-medium text-[11px] sm:text-xs">Clean Mode Active</span>
            <span className="text-gray-500 hidden sm:inline">• Search & URL paste field is hidden</span>
          </div>

          <button
            type="button"
            onClick={onToggleSearchBar}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-black font-bold text-[11px] sm:text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm min-h-[30px]"
            style={{
              backgroundColor: themeColor,
              boxShadow: `0 0 10px ${themeColor}44`
            }}
            title="Restore search and URL paste bar"
          >
            <Eye className="w-3.5 h-3.5 text-black shrink-0" />
            <span>Show URL Search Bar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="relative pt-4 sm:pt-6 pb-4 sm:pb-5 px-2 sm:px-4 max-w-4xl mx-auto text-center animate-fadeIn">
      {/* Background Subtle Radial Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-[32rem] h-56 sm:h-72 rounded-full blur-3xl pointer-events-none -z-10 transition-colors duration-500"
        style={{ backgroundColor: `${themeColor}15` }}
      />

      {/* Header with Title and Quick Hide Clean-Look Button */}
      <div className="relative mb-3.5 sm:mb-5">
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
          Harvest Your Playlists to{' '}
          <span
            className="transition-colors duration-300 inline-block"
            style={{
              color: themeColor,
              textShadow: `0 0 25px ${themeColor}66`
            }}
          >
            Pure MP3
          </span>
        </h1>

        {/* Quick Hide Action Pill */}
        {onToggleSearchBar && (
          <div className="flex justify-center mt-2.5 sm:mt-3">
            <button
              type="button"
              onClick={onToggleSearchBar}
              className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] border border-[#2a2a2a] hover:border-white/20 px-2.5 sm:px-3 py-1 rounded-full transition-all cursor-pointer shadow-sm group min-h-[28px]"
              title="Hide the search bar for an ultra-clean playlist view (re-enable anytime in Settings)"
            >
              <EyeOff
                className="w-3 h-3 group-hover:scale-110 transition-transform"
                style={{ color: themeColor }}
              />
              <span>Hide search field for clean look</span>
            </button>
          </div>
        )}
      </div>

      {/* URL Input Form - Sleek Elegant Dark Pill Design */}
      <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto mb-3 sm:mb-4">
        <div className="relative flex items-center bg-[#242424] rounded-full border border-[#333333] transition-all p-1 sm:p-1.5 shadow-2xl focus-within:border-white/50">
          <div className="pl-3 sm:pl-4 pr-1 sm:pr-2 text-gray-500 shrink-0">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (error) onClearError();
            }}
            placeholder="Paste Spotify Playlist URL..."
            className="w-full bg-transparent text-white placeholder:text-gray-500 text-base sm:text-sm py-2 sm:py-2.5 outline-none font-medium pr-28 sm:pr-36"
            disabled={isLoading}
          />

          <div className="absolute right-1 sm:right-1.5 flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={handlePaste}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-full transition-all text-xs cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
              title="Paste from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-full text-[11px] sm:text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md min-h-[32px]"
              style={{
                backgroundColor: themeColor,
                boxShadow: `0 0 16px ${themeColor}55`
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span className="hidden min-[420px]:inline">Fetching...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                  <span>Fetch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Preset Quick-Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-400">
        <span className="font-semibold text-gray-500 flex items-center gap-1">
          <Music className="w-3 h-3" style={{ color: themeColor }} /> Quick Try:
        </span>
        <button
          type="button"
          onClick={() => handlePresetClick('37i9dQZF1DXcBWIGoYBM5M')}
          className="bg-[#181818] hover:bg-[#282828] active:scale-95 text-gray-300 hover:text-white border border-[#282828] hover:border-white/30 px-2.5 sm:px-3.5 py-1 rounded-full transition-all cursor-pointer min-h-[28px]"
        >
          Today's Top Hits
        </button>
        <button
          type="button"
          onClick={() => handlePresetClick('37i9dQZF1DX4sWSpwq3LiO')}
          className="bg-[#181818] hover:bg-[#282828] active:scale-95 text-gray-300 hover:text-white border border-[#282828] hover:border-white/30 px-2.5 sm:px-3.5 py-1 rounded-full transition-all cursor-pointer min-h-[28px]"
        >
          Peaceful Piano
        </button>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="mt-4 max-w-2xl mx-auto flex items-start gap-2.5 bg-red-950/40 border border-red-800/60 p-3 sm:p-4 rounded-xl text-left text-red-200 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-300">Extraction Error</p>
            <p className="text-red-200/80 text-xs mt-0.5 break-words">{error}</p>
          </div>
          <button
            onClick={onClearError}
            className="text-red-400 hover:text-red-200 text-xs underline cursor-pointer p-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </section>
  );
};

