import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlaylistMetadata, Track } from './types';
import { SAMPLE_PLAYLISTS } from './data/samplePlaylists';
import { fetchSpotifyPlaylistClient } from './utils/spotifyResolver';
import { triggerTrackDownload, downloadTracksSequentially } from './utils/audioGenerator';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  applyThemeToDocument
} from './utils/theme';

import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { PlaylistCard } from './components/PlaylistCard';
import { ActionBar } from './components/ActionBar';
import { TrackList } from './components/TrackList';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { TagInspectorModal } from './components/TagInspectorModal';
import { MyPlaylistsModal } from './components/MyPlaylistsModal';
import { SettingsModal } from './components/SettingsModal';
import { InstallAppModal } from './components/InstallAppModal';

export default function App() {
  // Theme & App Settings State
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    applyThemeToDocument(settings.themeColor);
  }, [settings.themeColor]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  };

  // Initialize with 'Today\'s Top Hits' preset for instant visual immersion
  const [playlist, setPlaylist] = useState<PlaylistMetadata | null>(
    SAMPLE_PLAYLISTS['37i9dQZF1DXcBWIGoYBM5M']
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Quality States
  const [searchFilter, setSearchFilter] = useState('');
  const [bitrate, setBitrate] = useState('320');

  // Sequential Individual Download Queue States
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    current: 0,
    total: 0,
    currentTrackName: '',
    percent: 0
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Audio Player State
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<Track | null>(
    SAMPLE_PLAYLISTS['37i9dQZF1DXcBWIGoYBM5M'].tracks[0]
  );
  const [isPlaying, setIsPlaying] = useState(false);

  // Synchronized refs to guarantee no stale closures in playback navigation
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;

  const currentPlayingTrackRef = useRef(currentPlayingTrack);
  currentPlayingTrackRef.current = currentPlayingTrack;

  // Modals
  const [isMyPlaylistsOpen, setIsMyPlaylistsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [forceOpenVideo, setForceOpenVideo] = useState<number>(0);
  const [savedPlaylistsCount, setSavedPlaylistsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('soundharvest_saved_playlists');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch {
      // ignore
    }
    return 2;
  });
  const [inspectedTrack, setInspectedTrack] = useState<Track | null>(null);

  // Filtered Tracks
  const filteredTracks = useMemo(() => {
    if (!playlist) return [];
    if (!searchFilter.trim()) return playlist.tracks;
    const query = searchFilter.toLowerCase();
    return playlist.tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.album.toLowerCase().includes(query)
    );
  }, [playlist, searchFilter]);

  // Selected Count
  const selectedCount = useMemo(() => {
    if (!playlist) return 0;
    return playlist.tracks.filter((t) => t.selected).length;
  }, [playlist]);

  const allSelected = useMemo(() => {
    if (!playlist || playlist.tracks.length === 0) return false;
    return playlist.tracks.every((t) => t.selected);
  }, [playlist]);

  // Handler: Fetch Playlist
  const handleFetchPlaylist = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSpotifyPlaylistClient(url);
      setPlaylist(data);
      playlistRef.current = data;
      if (data.tracks.length > 0) {
        setCurrentPlayingTrack(data.tracks[0]);
        currentPlayingTrackRef.current = data.tracks[0];
        setIsPlaying(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to extract Spotify playlist metadata.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Toggle Track Select
  const handleToggleTrackSelect = (trackId: string) => {
    if (!playlist) return;
    const updated = {
      ...playlist,
      tracks: playlist.tracks.map((t) =>
        t.id === trackId ? { ...t, selected: !t.selected } : t
      )
    };
    setPlaylist(updated);
    playlistRef.current = updated;
  };

  // Handler: Delete Single Track from Playlist
  const handleDeleteTrack = (trackId: string) => {
    if (!playlist) return;
    const remainingTracks = playlist.tracks.filter((t) => t.id !== trackId);
    const newTotalDuration = remainingTracks.reduce((acc, t) => acc + (t.durationMs || 0), 0);

    // If the deleted track is currently playing, switch to next track or stop if empty
    if (currentPlayingTrack && currentPlayingTrack.id === trackId) {
      if (remainingTracks.length > 0) {
        const currentIndex = playlist.tracks.findIndex((t) => t.id === trackId);
        const nextTrack = remainingTracks[currentIndex % remainingTracks.length] || remainingTracks[0];
        setCurrentPlayingTrack(nextTrack);
        currentPlayingTrackRef.current = nextTrack;
      } else {
        setCurrentPlayingTrack(null);
        currentPlayingTrackRef.current = null;
        setIsPlaying(false);
      }
    }

    const updatedPlaylist = {
      ...playlist,
      tracks: remainingTracks,
      totalTracks: remainingTracks.length,
      totalDurationMs: newTotalDuration
    };
    setPlaylist(updatedPlaylist);
    playlistRef.current = updatedPlaylist;
  };

  // Handler: Select/Deselect All
  const handleToggleSelectAll = () => {
    if (!playlist) return;
    const newSelectState = !allSelected;
    const updated = {
      ...playlist,
      tracks: playlist.tracks.map((t) => ({ ...t, selected: newSelectState }))
    };
    setPlaylist(updated);
    playlistRef.current = updated;
  };

  // Handler: Download Single Track
  const handleDownloadSingle = async (track: Track) => {
    if (!playlist) return;

    // Update track status to downloading
    setPlaylist((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === track.id ? { ...t, status: 'downloading' } : t
        )
      };
    });

    try {
      // Simulate conversion delay & stream MP3
      await new Promise((r) => setTimeout(r, 600));
      triggerTrackDownload(track);

      setPlaylist((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          tracks: prev.tracks.map((t) =>
            t.id === track.id ? { ...t, status: 'completed' } : t
          )
        };
      });
    } catch (err) {
      console.error(err);
      setPlaylist((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          tracks: prev.tracks.map((t) =>
            t.id === track.id ? { ...t, status: 'error', error: 'Failed' } : t
          )
        };
      });
    }
  };

  // Handler: Download All Selected Tracks Separately (One by One)
  const handleDownloadAll = async () => {
    if (!playlist) return;
    const selectedTracks = playlist.tracks.filter((t) => t.selected);
    if (selectedTracks.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsDownloadingAll(true);
    setDownloadProgress({
      current: 1,
      total: selectedTracks.length,
      currentTrackName: `${selectedTracks[0]?.artist} - ${selectedTracks[0]?.title}`,
      percent: 5
    });

    try {
      await downloadTracksSequentially(
        selectedTracks,
        (currentIndex, totalCount, currentTrack, percent) => {
          setDownloadProgress({
            current: currentIndex,
            total: totalCount,
            currentTrackName: `${currentTrack.artist} - ${currentTrack.title}`,
            percent
          });

          // Mark active track as downloading, previous as completed
          setPlaylist((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              tracks: prev.tracks.map((t) => {
                if (t.id === currentTrack.id) return { ...t, status: 'downloading' };
                return t;
              })
            };
          });
        },
        controller.signal
      );

      // Mark all selected as completed
      setPlaylist((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          tracks: prev.tracks.map((t) =>
            t.selected ? { ...t, status: 'completed' } : t
          )
        };
      });
    } catch (err) {
      console.error('Sequential download error:', err);
    } finally {
      setIsDownloadingAll(false);
      abortControllerRef.current = null;
      setDownloadProgress({ current: 0, total: 0, currentTrackName: '', percent: 0 });
    }
  };

  // Handler: Cancel Sequential Download Queue
  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsDownloadingAll(false);
    setDownloadProgress({ current: 0, total: 0, currentTrackName: '', percent: 0 });
  };

  // Handler: Audio Playback Controls
  const handlePlayTrack = (track: Track) => {
    if (currentPlayingTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentPlayingTrack(track);
      currentPlayingTrackRef.current = track;
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    const activePlaylist = playlistRef.current;
    const activeTrack = currentPlayingTrackRef.current;
    if (!activePlaylist || activePlaylist.tracks.length === 0) return;

    if (!activeTrack) {
      const first = activePlaylist.tracks[0];
      setCurrentPlayingTrack(first);
      currentPlayingTrackRef.current = first;
      setIsPlaying(true);
      return;
    }

    let currentIndex = activePlaylist.tracks.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex === -1) {
      currentIndex = activePlaylist.tracks.findIndex(
        (t) =>
          t.title.toLowerCase() === activeTrack.title.toLowerCase() &&
          t.artist.toLowerCase() === activeTrack.artist.toLowerCase()
      );
    }

    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % activePlaylist.tracks.length;
    const nextTrack = activePlaylist.tracks[nextIndex];
    if (nextTrack) {
      setCurrentPlayingTrack(nextTrack);
      currentPlayingTrackRef.current = nextTrack;
      setIsPlaying(true);
    }
  };

  const handlePrevTrack = () => {
    const activePlaylist = playlistRef.current;
    const activeTrack = currentPlayingTrackRef.current;
    if (!activePlaylist || activePlaylist.tracks.length === 0) return;

    if (!activeTrack) {
      const first = activePlaylist.tracks[0];
      setCurrentPlayingTrack(first);
      currentPlayingTrackRef.current = first;
      setIsPlaying(true);
      return;
    }

    let currentIndex = activePlaylist.tracks.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex === -1) {
      currentIndex = activePlaylist.tracks.findIndex(
        (t) =>
          t.title.toLowerCase() === activeTrack.title.toLowerCase() &&
          t.artist.toLowerCase() === activeTrack.artist.toLowerCase()
      );
    }

    const prevIndex =
      currentIndex === -1
        ? 0
        : (currentIndex - 1 + activePlaylist.tracks.length) % activePlaylist.tracks.length;
    const prevTrack = activePlaylist.tracks[prevIndex];
    if (prevTrack) {
      setCurrentPlayingTrack(prevTrack);
      currentPlayingTrackRef.current = prevTrack;
      setIsPlaying(true);
    }
  };

  return (
    <div className={`min-h-screen bg-[#121212] text-[#FFFFFF] font-sans flex flex-col ${currentPlayingTrack ? 'pb-32 sm:pb-36' : 'pb-12'}`}>
      {/* Top Navbar */}
      <Navbar
        onOpenMyPlaylists={() => setIsMyPlaylistsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstallApp={() => setIsInstallModalOpen(true)}
        savedPlaylistsCount={savedPlaylistsCount}
        themeColor={settings.themeColor}
        isSearchBarVisible={settings.isSearchBarVisible}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6">
        {/* Hero Form Section */}
        <HeroSection
          onFetch={handleFetchPlaylist}
          isLoading={isLoading}
          error={error}
          onClearError={() => setError(null)}
          isSearchBarVisible={settings.isSearchBarVisible}
          onToggleSearchBar={() =>
            handleUpdateSettings({ isSearchBarVisible: !settings.isSearchBarVisible })
          }
          themeColor={settings.themeColor}
        />

        {/* Playlist Results Area */}
        {playlist && (
          <div className="animate-fadeIn">
            {/* Playlist Metadata Header Card */}
            <PlaylistCard playlist={playlist} themeColor={settings.themeColor} />

            {/* Action Bar (Download All Separately, Filters, Bitrate) */}
            <ActionBar
              totalTracks={playlist.tracks.length}
              selectedCount={selectedCount}
              allSelected={allSelected}
              onToggleSelectAll={handleToggleSelectAll}
              onDownloadAll={handleDownloadAll}
              isDownloadingAll={isDownloadingAll}
              downloadProgress={downloadProgress}
              onCancelDownload={handleCancelDownload}
              searchFilter={searchFilter}
              onSearchFilterChange={setSearchFilter}
              bitrate={bitrate}
              onBitrateChange={setBitrate}
              themeColor={settings.themeColor}
            />

            {/* Spotify-style Track Table */}
            <TrackList
              tracks={filteredTracks}
              onToggleTrackSelect={handleToggleTrackSelect}
              onDownloadSingle={handleDownloadSingle}
              onPlayTrack={handlePlayTrack}
              onDeleteTrack={handleDeleteTrack}
              currentPlayingTrackId={currentPlayingTrack?.id || null}
              isPlaying={isPlaying}
              onInspectTags={(track) => setInspectedTrack(track)}
              onWatchVideo={(track) => {
                setCurrentPlayingTrack(track);
                setIsPlaying(false);
                setForceOpenVideo(Date.now());
              }}
              themeColor={settings.themeColor}
            />
          </div>
        )}
      </main>

      {/* Persistent Bottom Audio Player Bar */}
      <AudioPlayerBar
        track={currentPlayingTrack}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onDownloadCurrent={() => {
          if (currentPlayingTrack) handleDownloadSingle(currentPlayingTrack);
        }}
        forceOpenVideo={forceOpenVideo}
        themeColor={settings.themeColor}
      />

      {/* My Playlists Management Dashboard Modal */}
      <MyPlaylistsModal
        isOpen={isMyPlaylistsOpen}
        onClose={() => setIsMyPlaylistsOpen(false)}
        onSelectPlaylist={(url) => handleFetchPlaylist(url)}
        onPlaylistsUpdated={(list) => setSavedPlaylistsCount(list.length)}
      />

      {/* Studio Settings & Theme Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
      />

      {/* ID3 Tag Inspector Modal */}
      <TagInspectorModal
        track={inspectedTrack}
        onClose={() => setInspectedTrack(null)}
      />

      {/* PWA / APK Mobile Phone Installation Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        themeColor={settings.themeColor}
      />
    </div>
  );
}
