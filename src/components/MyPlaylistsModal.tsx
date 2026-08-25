import React, { useState, useEffect } from 'react';
import { SavedUserPlaylist } from '../types';
import {
  ListMusic,
  Plus,
  Trash2,
  Play,
  Save,
  Check,
  ExternalLink,
  Copy,
  X,
  Sparkles,
  Link2,
  FolderHeart
} from 'lucide-react';

interface MyPlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlaylist: (url: string) => void;
  onPlaylistsUpdated?: (playlists: SavedUserPlaylist[]) => void;
}

const STORAGE_KEY = 'soundharvest_saved_playlists';

const DEFAULT_PLAYLISTS: SavedUserPlaylist[] = [
  {
    id: 'pl-1',
    name: 'Playlist 1',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    createdAt: Date.now() - 3600000 * 24
  },
  {
    id: 'pl-2',
    name: 'Playlist 2',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
    createdAt: Date.now() - 3600000 * 12
  }
];

export const MyPlaylistsModal: React.FC<MyPlaylistsModalProps> = ({
  isOpen,
  onClose,
  onSelectPlaylist,
  onPlaylistsUpdated
}) => {
  const [playlists, setPlaylists] = useState<SavedUserPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_PLAYLISTS;
  });

  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);
  const [globalSavedFeedback, setGlobalSavedFeedback] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Persist to localStorage whenever playlists change
  const saveToStorage = (updated: SavedUserPlaylist[]) => {
    try {
      const cleanList = updated.map((p) => ({
        id: String(p.id),
        name: String(p.name || ''),
        url: String(p.url || ''),
        createdAt: Number(p.createdAt || Date.now()),
        lastLoadedAt: p.lastLoadedAt ? Number(p.lastLoadedAt) : undefined
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
      onPlaylistsUpdated?.(updated);
    } catch (err) {
      console.warn('Failed to save playlists to localStorage:', err);
    }
  };

  // Add a new playlist row: "Playlist X"
  const handleAddNewPlaylist = () => {
    const nextNumber = playlists.length + 1;
    const newPlaylist: SavedUserPlaylist = {
      id: `pl-${Date.now()}`,
      name: `Playlist ${nextNumber}`,
      url: '',
      createdAt: Date.now()
    };

    const updated = [newPlaylist, ...playlists];
    setPlaylists(updated);
    saveToStorage(updated);
  };

  // Update a single playlist field
  const handleUpdateField = (id: string, field: 'name' | 'url', value: string) => {
    const updated = playlists.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    setPlaylists(updated);
  };

  // Save single item
  const handleSaveItem = (id: string) => {
    saveToStorage(playlists);
    setSavedFeedbackId(id);
    setTimeout(() => setSavedFeedbackId(null), 2000);
  };

  // Save all playlists
  const handleSaveAll = () => {
    saveToStorage(playlists);
    setGlobalSavedFeedback(true);
    setTimeout(() => setGlobalSavedFeedback(false), 2500);
  };

  // Delete playlist
  const handleDeletePlaylist = (id: string) => {
    const updated = playlists.filter((p) => p.id !== id);
    setPlaylists(updated);
    saveToStorage(updated);
  };

  // Load and play playlist
  const handlePlayNow = (playlist: SavedUserPlaylist) => {
    if (!playlist.url.trim()) return;

    // Update last loaded time
    const updated = playlists.map((p) =>
      p.id === playlist.id ? { ...p, lastLoadedAt: Date.now() } : p
    );
    setPlaylists(updated);
    saveToStorage(updated);

    onSelectPlaylist(playlist.url);
    onClose();
  };

  // Copy URL to clipboard
  const handleCopyUrl = (id: string, url: string) => {
    if (!url) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    } else if (typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      } catch {
        // ignore
      }
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isOpen) return null;

  const filteredPlaylists = playlists.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col bg-[#181818] border border-[#282828] w-full max-w-3xl max-h-[88vh] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#282828] bg-[#1f1f1f]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] shadow-sm">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                My Playlists Dashboard
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#282828] text-gray-400">
                  {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Save your Spotify playlist links once and load songs with 1-click anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Plus Icon Button to add a new playlist */}
            <button
              onClick={handleAddNewPlaylist}
              className="flex items-center gap-1.5 bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 text-black font-bold text-xs sm:text-sm px-4 py-2 rounded-full transition-all shadow-md cursor-pointer"
              title="Add a new playlist"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Playlist</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white bg-[#282828] hover:bg-[#333333] transition-colors cursor-pointer ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        {playlists.length > 3 && (
          <div className="px-6 py-3 border-b border-[#282828] bg-[#141414]">
            <input
              type="text"
              placeholder="Search your saved playlists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#242424] border border-[#333333] rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]"
            />
          </div>
        )}

        {/* Playlists Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {playlists.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#242424] flex items-center justify-center mx-auto text-gray-500">
                <FolderHeart className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No playlists saved yet</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Click the "Add Playlist" button above to add your first playlist link.
                </p>
              </div>
              <button
                onClick={handleAddNewPlaylist}
                className="inline-flex items-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs px-5 py-2.5 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Add Playlist 1
              </button>
            </div>
          ) : (
            filteredPlaylists.map((pl, index) => {
              const isItemSaved = savedFeedbackId === pl.id;

              return (
                <div
                  key={pl.id}
                  className="bg-[#202020] hover:bg-[#242424] border border-[#2e2e2e] hover:border-[#3a3a3a] rounded-2xl p-4 transition-all duration-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3.5"
                >
                  {/* Left Column: Playlist Index & Name Input */}
                  <div className="flex items-center gap-2.5 w-full md:w-56 shrink-0">
                    <span className="w-7 h-7 rounded-lg bg-[#2b2b2b] text-gray-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={pl.name}
                      onChange={(e) => handleUpdateField(pl.id, 'name', e.target.value)}
                      placeholder="Playlist Name"
                      className="w-full bg-[#181818] border border-[#333] hover:border-[#444] focus:border-[#1DB954] rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Center Column: Spotify URL Link Field */}
                  <div className="flex-1 w-full relative">
                    <div className="relative flex items-center">
                      <Link2 className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                      <input
                        type="url"
                        value={pl.url}
                        onChange={(e) => handleUpdateField(pl.id, 'url', e.target.value)}
                        placeholder="Paste Spotify playlist link (https://open.spotify.com/playlist/...)"
                        className="w-full bg-[#141414] border border-[#333] hover:border-[#444] focus:border-[#1DB954] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition-colors font-mono"
                      />
                      {pl.url && (
                        <button
                          onClick={() => handleCopyUrl(pl.id, pl.url)}
                          className="absolute right-2.5 text-gray-500 hover:text-white transition-colors cursor-pointer"
                          title="Copy playlist URL"
                        >
                          {copiedId === pl.id ? (
                            <Check className="w-3.5 h-3.5 text-[#1DB954]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Action Buttons (Play / Save / Delete) */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#2b2b2b]">
                    {/* Play / Load Button */}
                    <button
                      onClick={() => handlePlayNow(pl)}
                      disabled={!pl.url.trim()}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow cursor-pointer ${
                        pl.url.trim()
                          ? 'bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 text-black'
                          : 'bg-[#2b2b2b] text-gray-500 cursor-not-allowed opacity-50'
                      }`}
                      title={pl.url.trim() ? 'Load & Play this playlist' : 'Enter URL first'}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </button>

                    {/* Save Item Button */}
                    <button
                      onClick={() => handleSaveItem(pl.id)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                        isItemSaved
                          ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]'
                          : 'bg-[#282828] hover:bg-[#333] border-[#383838] text-gray-300 hover:text-white'
                      }`}
                      title="Save changes to this playlist"
                    >
                      {isItemSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </>
                      )}
                    </button>

                    {/* Delete Item Button */}
                    <button
                      onClick={() => handleDeletePlaylist(pl.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Remove playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Quick Add Helper Bar */}
          {playlists.length > 0 && (
            <button
              onClick={handleAddNewPlaylist}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-[#2f2f2f] hover:border-[#1DB954]/60 hover:bg-[#1DB954]/5 text-gray-400 hover:text-[#1DB954] flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Another Playlist
            </button>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#282828] bg-[#141414] shrink-0">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>Saved playlists automatically persist in your browser.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveAll}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                globalSavedFeedback
                  ? 'bg-[#1DB954] text-black shadow-[0_0_12px_rgba(29,185,84,0.6)]'
                  : 'bg-[#282828] hover:bg-[#333] text-white border border-[#383838]'
              }`}
            >
              {globalSavedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>All Changes Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
