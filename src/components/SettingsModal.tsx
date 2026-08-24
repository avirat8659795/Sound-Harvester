import React, { useState } from 'react';
import {
  Settings,
  X,
  Check,
  Eye,
  EyeOff,
  Palette,
  Sliders,
  RotateCcw,
  Sparkles,
  Search,
  Volume2
} from 'lucide-react';
import { AppSettings, THEME_PRESETS, ThemeOption } from '../utils/theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings
}) => {
  const [customHex, setCustomHex] = useState(settings.themeColor);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: ThemeOption) => {
    setCustomHex(preset.primary);
    onUpdateSettings({
      themeColor: preset.primary,
      themeId: preset.id
    });
  };

  const handleCustomColorChange = (color: string) => {
    setCustomHex(color);
    onUpdateSettings({
      themeColor: color,
      themeId: 'custom'
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#282828] flex items-center justify-between bg-[#1f1f1f]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
              style={{
                backgroundColor: settings.themeColor,
                boxShadow: `0 0 16px ${settings.themeColor}55`
              }}
            >
              <Settings className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Settings & Theme
              </h2>
              <p className="text-xs text-gray-400">
                Personalize accent colors, layout visibility, and audio preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-full transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* 1. Theme Color Customization */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: settings.themeColor }} />
                Theme Accent Color
              </label>
              <span className="text-xs text-gray-400 font-mono">
                {THEME_PRESETS.find((p) => p.primary.toLowerCase() === settings.themeColor.toLowerCase())?.name || 'Custom Color'} ({settings.themeColor})
              </span>
            </div>

            {/* Color Grid Presets */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const isSelected =
                  settings.themeColor.toLowerCase() === preset.primary.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#262626] border-white/40 ring-2'
                        : 'bg-[#1e1e1e] border-[#2c2c2c] hover:bg-[#242424] hover:border-gray-600'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: preset.primary,
                            boxShadow: `0 0 14px ${preset.primary}33`
                          }
                        : {}
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: preset.primary }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                    <div className="truncate text-xs font-semibold text-white">
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Picker Bar */}
            <div className="flex items-center gap-3 bg-[#1e1e1e] border border-[#2c2c2c] p-3 rounded-2xl">
              <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-gray-600 cursor-pointer shadow-inner">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  className="absolute inset-0 w-12 h-12 -top-2 -left-2 cursor-pointer opacity-100"
                  title="Pick a custom color"
                />
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-300">Custom Color Picker</div>
                <div className="text-[11px] text-gray-500 font-mono">{customHex.toUpperCase()}</div>
              </div>
              <input
                type="text"
                value={customHex}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomHex(val);
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    handleCustomColorChange(val);
                  }
                }}
                placeholder="#1DB954"
                className="w-24 bg-[#141414] border border-[#333333] text-white text-xs font-mono px-2.5 py-1.5 rounded-lg text-center outline-none focus:border-white/40"
              />
            </div>
          </section>

          {/* 2. Clean Look / Hide Search Bar */}
          <section className="space-y-3 pt-4 border-t border-[#282828]">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4" style={{ color: settings.themeColor }} />
                Clean Look & Interface Display
              </label>
            </div>

            <div className="bg-[#1e1e1e] border border-[#2c2c2c] rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {settings.isSearchBarVisible ? (
                    <Eye className="w-4 h-4 text-gray-400" />
                  ) : (
                    <EyeOff className="w-4 h-4" style={{ color: settings.themeColor }} />
                  )}
                  <span>Playlist URL & Fetch Search Bar</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Hide the large Spotify link paste bar and fetch button for a clean, distraction-free view of your loaded songs and audio player.
                </p>
                <div className="pt-1">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      settings.isSearchBarVisible
                        ? 'bg-gray-800 text-gray-300'
                        : 'text-black font-extrabold'
                    }`}
                    style={
                      !settings.isSearchBarVisible
                        ? { backgroundColor: settings.themeColor }
                        : {}
                    }
                  >
                    {settings.isSearchBarVisible ? 'Search Bar Visible' : 'Clean Look Active (Hidden)'}
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ isSearchBarVisible: !settings.isSearchBarVisible })
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.isSearchBarVisible ? 'bg-gray-600' : ''
                }`}
                style={
                  settings.isSearchBarVisible
                    ? { backgroundColor: settings.themeColor }
                    : { backgroundColor: '#333333' }
                }
                role="switch"
                aria-checked={settings.isSearchBarVisible}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.isSearchBarVisible ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* 3. Audio & Engine Behavior */}
          <section className="space-y-3 pt-4 border-t border-[#282828]">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4" style={{ color: settings.themeColor }} />
                Playback Engine
              </label>
            </div>

            <div className="bg-[#1e1e1e] border border-[#2c2c2c] rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Auto-Play Next Track</div>
                <p className="text-xs text-gray-400">
                  Automatically transition to the next song in the playlist when current track finishes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onUpdateSettings({ autoPlayNext: !settings.autoPlayNext })}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                style={
                  settings.autoPlayNext
                    ? { backgroundColor: settings.themeColor }
                    : { backgroundColor: '#333333' }
                }
                role="switch"
                aria-checked={settings.autoPlayNext}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.autoPlayNext ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#282828] bg-[#141414] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onResetSettings}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Reset theme and layout to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full text-black font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
            style={{
              backgroundColor: settings.themeColor,
              boxShadow: `0 0 15px ${settings.themeColor}55`
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
