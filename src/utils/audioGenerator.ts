import JSZip from 'jszip';
import { Track } from '../types';

/**
 * Triggers browser download for a single track with real studio audio and embedded ID3 tags & cover art
 */
export async function triggerTrackDownload(track: Track): Promise<void> {
  const safeName = `${track.artist} - ${track.title}`.replace(/[\\/*?:"<>|]/g, '').trim() || 'Track';

  // 1. Primary: Server-side tagged studio MP3 download
  try {
    const durSec = Math.floor((track.durationMs || 180000) / 1000);
    const params = new URLSearchParams({
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      coverUrl: track.coverUrl || '',
      year: track.year || '',
      trackNumber: String(track.trackNumber || 1),
      isrc: track.isrc || '',
      duration: String(durSec),
      durationMs: String(track.durationMs || 180000)
    });

    const res = await fetch(`/api/download/track?${params.toString()}`);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return;
      }
    }
  } catch (err) {
    console.warn('Backend download endpoint error:', err);
  }

  // 2. Secondary: Direct authentic stream fetch
  try {
    const streamParams = new URLSearchParams({
      title: track.title,
      artist: track.artist,
      isrc: track.isrc || ''
    });
    const streamRes = await fetch(`/api/audio/stream?${streamParams.toString()}`);
    if (streamRes.ok) {
      const blob = await streamRes.blob();
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return;
      }
    }
  } catch (err) {
    console.warn('Direct stream download error:', err);
  }

  throw new Error(`Could not download authentic audio stream for "${track.title}".`);
}

/**
 * Downloads all selected tracks separately one by one with a progress callback and abort support
 */
export async function downloadTracksSequentially(
  tracks: Track[],
  onProgress: (currentIndex: number, totalCount: number, currentTrack: Track, percent: number) => void,
  abortSignal?: AbortSignal
): Promise<{ successCount: number; failedTracks: string[] }> {
  let successCount = 0;
  const failedTracks: string[] = [];

  for (let i = 0; i < tracks.length; i++) {
    if (abortSignal?.aborted) {
      break;
    }

    const track = tracks[i];
    const percent = Math.round(((i + 1) / tracks.length) * 100);

    onProgress(i + 1, tracks.length, track, percent);

    try {
      await triggerTrackDownload(track);
      successCount++;
    } catch (err) {
      console.error(`Failed to download song ${track.title}:`, err);
      failedTracks.push(track.title);
    }

    // A small delay (700ms) between songs gives the browser time to initiate each file download smoothly
    if (i < tracks.length - 1 && !abortSignal?.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }

  return { successCount, failedTracks };
}

/**
 * Creates and downloads a complete ZIP archive with all selected tracks + M3U playlist file (Legacy/Alternative)
 */
export async function generateAndDownloadPlaylistZip(
  playlistTitle: string,
  tracks: Track[],
  onProgress?: (percent: number, currentTrack: string) => void
): Promise<void> {
  const safePlaylistName = playlistTitle.replace(/[\\/*?:"<>|]/g, '').trim() || 'Spotify_Playlist';

  // 1. Try High-Speed Server-Side ZIP generation first
  try {
    if (onProgress) onProgress(15, 'Requesting high-speed ZIP bundle from server...');

    const cleanTracks = tracks.map((t, idx) => ({
      id: String(t.id || `track_${idx}`),
      title: String(t.title || 'Unknown Title'),
      artist: String(t.artist || 'Unknown Artist'),
      album: String(t.album || ''),
      durationMs: Number(t.durationMs || 180000),
      durationFormatted: String(t.durationFormatted || '3:00'),
      coverUrl: String(t.coverUrl || ''),
      year: String(t.year || ''),
      trackNumber: Number(t.trackNumber || idx + 1),
      isrc: String(t.isrc || '')
    }));

    const res = await fetch('/api/download/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistTitle: safePlaylistName, tracks: cleanTracks })
    });

    if (res.ok) {
      if (onProgress) onProgress(80, 'Receiving ZIP archive...');
      const blob = await res.blob();
      if (blob.size > 0) {
        if (onProgress) onProgress(100, 'Saving to device...');

        const zipUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `${safePlaylistName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(zipUrl), 4000);
        return;
      }
    }
  } catch (err) {
    console.warn('Server ZIP failed, falling back to client-side JSZip fetcher:', err);
  }

  // 2. Client-side JSZip generation fetching authentic audio tracks
  const zip = new JSZip();
  const folder = zip.folder(safePlaylistName) || zip;
  let m3uContent = '#EXTM3U\n';

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const trackNum = (i + 1).toString().padStart(2, '0');
    const safeTrackName = `${trackNum}. ${track.artist} - ${track.title}`.replace(/[\\/*?:"<>|]/g, '').trim();
    const fileName = `${safeTrackName}.mp3`;

    if (onProgress) {
      const pct = Math.round(((i) / tracks.length) * 85);
      onProgress(pct, `Downloading "${track.title}" by ${track.artist}`);
    }

    try {
      const params = new URLSearchParams({
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        coverUrl: track.coverUrl || '',
        year: track.year || '',
        trackNumber: String(i + 1),
        isrc: track.isrc || ''
      });

      const trackRes = await fetch(`/api/download/track?${params.toString()}`);
      if (trackRes.ok) {
        const audioBlob = await trackRes.blob();
        folder.file(fileName, audioBlob);
      } else {
        // Try direct stream
        const sRes = await fetch(`/api/audio/stream?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&isrc=${encodeURIComponent(track.isrc || '')}`);
        if (sRes.ok) {
          const audioBlob = await sRes.blob();
          folder.file(fileName, audioBlob);
        }
      }
    } catch (trackErr) {
      console.warn(`Could not bundle track "${track.title}":`, trackErr);
    }

    const durationSec = Math.floor(track.durationMs / 1000);
    m3uContent += `#EXTINF:${durationSec},${track.artist} - ${track.title}\n${fileName}\n`;
  }

  folder.file(`${safePlaylistName}.m3u`, m3uContent);

  if (onProgress) {
    onProgress(92, 'Finalizing ZIP compression...');
  }

  const zipContent = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  }, (metadata) => {
    if (onProgress) {
      const finalPct = 90 + Math.round(metadata.percent * 0.1);
      onProgress(finalPct, `Finalizing zip archive (${Math.round(metadata.percent)}%)...`);
    }
  });

  const zipUrl = URL.createObjectURL(zipContent);
  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = `${safePlaylistName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(zipUrl), 4000);
}


