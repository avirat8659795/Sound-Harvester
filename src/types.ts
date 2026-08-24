export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  durationFormatted: string;
  coverUrl: string;
  previewAudioUrl?: string;
  youtubeVideoId?: string;
  year?: string;
  trackNumber?: number;
  spotifyUrl?: string;
  isrc?: string;
  status: 'ready' | 'downloading' | 'completed' | 'error';
  progress?: number;
  error?: string;
  selected?: boolean;
}

export interface PlaylistMetadata {
  id: string;
  title: string;
  description: string;
  owner: string;
  coverUrl: string;
  totalTracks: number;
  totalDurationMs: number;
  spotifyUrl: string;
  tracks: Track[];
}

export interface SavedUserPlaylist {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  lastLoadedAt?: number;
}

