import React from 'react';
import { ListMusic, Settings, Smartphone } from 'lucide-react';

interface NavbarProps {
  onOpenMyPlaylists: () => void;
  onOpenSettings: () => void;
  onOpenInstallApp?: () => void;
  savedPlaylistsCount?: number;
  themeColor?: string;
  isSearchBarVisible?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMyPlaylists,
  onOpenSettings,
  onOpenInstallApp,
  savedPlaylistsCount = 0,
  themeColor = '#1DB954',
  isSearchBarVisible = true
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-[#282828] px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo with Circular Square Green/Accent Badge and 'H' Sound Wave Emblem */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0">
          <div
            className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-105 transition-all duration-300 shrink-0 overflow-hidden"
            style={{
              backgroundColor: themeColor,
              boxShadow: `0 0 20px ${themeColor}66`
            }}
          >
            {/* 'H' Emblem: Two black side lines with curved edges framing the original 3 sound waves with generous distance */}
            <svg
              viewBox="0 0 28 24"
              fill="none"
              className="w-5 h-5 sm:w-6.5 sm:h-6.5 text-black"
              stroke="black"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Left line representing H (moved distant to the left) */}
              <path d="M2.5 5.5L2.5 18.5" />

              {/* Right line representing H (moved distant to the right) */}
              <path d="M25.5 5.5L25.5 18.5" />

              {/* Original 3 sound waves centered with clear spacing from the side lines */}
              <path d="M7 8.5C11.5 6 16.5 6 21 8.5" />
              <path d="M8.8 12.5C12.2 10.5 15.8 10.5 19.2 12.5" />
              <path d="M10.5 16.5C12.8 15 15.2 15 17.5 16.5" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-white font-sans">
              Sound <span style={{ color: themeColor }}>Harvester</span>
            </span>
            <span
              className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full border hidden min-[360px]:inline-block"
              style={{
                backgroundColor: `${themeColor}22`,
                color: themeColor,
                borderColor: `${themeColor}44`
              }}
            >
              PRO
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          {/* Install on Phone (PWA/APK) Button */}
          {onOpenInstallApp && (
            <button
              onClick={onOpenInstallApp}
              className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#262626] active:scale-95 text-white border border-[#333] hover:border-white/40 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm group min-h-[36px]"
              title="Install SoundHarvest App on your Android or iPhone for background play & lock-screen controls"
            >
              <Smartphone
                className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0"
                style={{ color: themeColor }}
              />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden text-xs">App</span>
            </button>
          )}

          {/* Quality Indicator (Desktop only) */}
          <div className="hidden xl:flex items-center gap-2 bg-[#181818] border border-[#282828] px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-400">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: themeColor,
                boxShadow: `0 0 8px ${themeColor}`
              }}
            />
            <span className="text-white font-mono">320kbps MP3</span>
            <span className="text-[#404040]">•</span>
            <span className="text-gray-400">ID3v2</span>
          </div>

          {/* My Playlists Dashboard Button */}
          <button
            onClick={onOpenMyPlaylists}
            className="flex items-center gap-1.5 sm:gap-2 bg-[#181818] hover:bg-[#242424] active:scale-95 text-white border border-[#282828] hover:border-white/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm group min-h-[36px]"
            title="Open My Playlists Dashboard"
          >
            <ListMusic
              className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0"
              style={{ color: themeColor }}
            />
            <span className="hidden sm:inline">My Playlists</span>
            <span className="sm:hidden text-xs">Playlists</span>
            {savedPlaylistsCount > 0 && (
              <span
                className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full text-black text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center ml-0.5 shrink-0"
                style={{ backgroundColor: themeColor }}
              >
                {savedPlaylistsCount}
              </span>
            )}
          </button>

          {/* Settings & Theme Customizer Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 bg-[#181818] hover:bg-[#242424] active:scale-95 text-gray-300 hover:text-white border border-[#282828] hover:border-white/30 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm group min-h-[36px]"
            title="Settings: Customize theme colors & clean layout options"
          >
            <Settings
              className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300 shrink-0"
              style={{ color: themeColor }}
            />
            <span className="hidden md:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};


