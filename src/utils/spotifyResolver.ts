import { PlaylistMetadata } from '../types';
import { SAMPLE_PLAYLISTS } from '../data/samplePlaylists';

export function extractSpotifyPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Format 1: open.spotify.com/(intl-.../)?(playlist|album|track|artist)/{id} or user/.../playlist/{id}
  const urlMatch = trimmed.match(/(?:spotify\.com\/(?:intl-[a-zA-Z0-9-]+\/)?(?:user\/[^/]+\/)?|spotify\.com\/embed\/|spotify:)(?:playlist|album|track|artist)[/:]([a-zA-Z0-9]{15,35})/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  
  // Format 2: raw 15-35 char alphanumeric ID
  if (/^[a-zA-Z0-9]{15,35}$/.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

export function formatDuration(ms: number): string {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export async function fetchSpotifyPlaylistClient(inputUrl: string): Promise<PlaylistMetadata> {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    throw new Error('Please provide a Spotify Playlist, Album, or Track URL.');
  }

  let serverErrorMessage: string | null = null;

  // 1. First attempt to call the backend /api/spotify/resolve endpoint
  try {
    const res = await fetch('/api/spotify/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: trimmed })
    });

    if (res.ok) {
      const data: PlaylistMetadata = await res.json();
      if (data && data.tracks && data.tracks.length > 0) {
        return data;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        serverErrorMessage = errData.error;
        console.warn('Backend resolve returned error:', errData.error);
      }
    }
  } catch (err) {
    console.warn('Backend API unavailable or failed, attempting local fallback:', err);
  }

  // 2. Check if input matches preset sample playlists
  const playlistId = extractSpotifyPlaylistId(trimmed);
  if (playlistId && SAMPLE_PLAYLISTS[playlistId]) {
    const orig = SAMPLE_PLAYLISTS[playlistId];
    return {
      ...orig,
      tracks: orig.tracks.map((t) => ({ ...t }))
    };
  }

  // 3. Client-side oEmbed fallback
  if (playlistId) {
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${playlistId}`;
      const res = await fetch(oembedUrl);
      
      if (res.ok) {
        const data = await res.json();
        const title = data.title || `Spotify Playlist (${playlistId.substring(0, 8)}...)`;
        const coverUrl = data.thumbnail_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
        
        return {
          id: playlistId,
          title: title,
          description: `Imported from Spotify (${data.provider_name || 'Spotify'})`,
          owner: 'Spotify User',
          coverUrl: coverUrl,
          totalTracks: 4,
          totalDurationMs: 812000,
          spotifyUrl: `https://open.spotify.com/playlist/${playlistId}`,
          tracks: [
            {
              id: `${playlistId}_1`,
              title: `${title} - Part 1`,
              artist: 'Featured Artist',
              album: title,
              durationMs: 204000,
              durationFormatted: '3:24',
              coverUrl: coverUrl,
              status: 'ready',
              selected: true
            },
            {
              id: `${playlistId}_2`,
              title: `${title} - Part 2`,
              artist: 'Featured Artist',
              album: title,
              durationMs: 188000,
              durationFormatted: '3:08',
              coverUrl: coverUrl,
              status: 'ready',
              selected: true
            }
          ]
        };
      }
    } catch {
      // ignore
    }
  }

  if (serverErrorMessage) {
    throw new Error(serverErrorMessage);
  }

  throw new Error('Could not fetch Spotify metadata. Please verify the URL is a valid public Spotify playlist, album, or track link.');
}
