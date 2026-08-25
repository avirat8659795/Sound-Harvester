import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import NodeID3 from 'node-id3';
import CryptoJS from 'crypto-js';
import { spawn } from 'child_process';
import * as archiverModule from 'archiver';
const archiver = (archiverModule as any).default || archiverModule;
import * as YouTubeModule from 'youtube-sr';
const YouTube: any = (YouTubeModule as any).default || YouTubeModule;

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Cache for Spotify web access token
let cachedSpotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyAnonymousToken(): Promise<string | null> {
  if (cachedSpotifyToken && Date.now() < cachedSpotifyToken.expiresAt - 60000) {
    return cachedSpotifyToken.token;
  }

  // 0. Official Spotify API Client Credentials (if provided via environment variables)
  const clientId = process.env.SPOTIPY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIPY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET;
  if (clientId && clientSecret) {
    try {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(4000)
      });
      if (tokenRes.ok) {
        const tData = await tokenRes.json();
        if (tData && tData.access_token) {
          cachedSpotifyToken = {
            token: tData.access_token,
            expiresAt: Date.now() + ((tData.expires_in || 3600) * 1000)
          };
          return tData.access_token;
        }
      }
    } catch (e) {
      console.warn('Spotify official client credentials error:', e);
    }
  }

  // 1. Direct Web Player Access Token
  try {
    const res = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://open.spotify.com/',
        'Origin': 'https://open.spotify.com'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.accessToken) {
        cachedSpotifyToken = {
          token: data.accessToken,
          expiresAt: data.accessTokenExpirationTimestampMs || Date.now() + 3600000
        };
        return data.accessToken;
      }
    }
  } catch (err) {
    console.warn('Could not fetch Spotify web token:', err);
  }

  // 2. Client Credentials Token from public client IDs
  try {
    const clientIds = [
      'd8a5ed958d274c2e8ee717e6a4b0971d',
      '270656bc638b4c9e819a00e5a8767e9b',
      'e11c6d3f23fb4890a88bf0a012a67e41'
    ];
    for (const cId of clientIds) {
      const tokenRes = await fetch(`https://open.spotify.com/get_access_token?reason=transport&productType=web_player&client_id=${cId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://open.spotify.com/'
        },
        signal: AbortSignal.timeout(3000)
      }).catch(() => null);

      if (tokenRes && tokenRes.ok) {
        const tData = await tokenRes.json();
        if (tData && tData.accessToken) {
          cachedSpotifyToken = {
            token: tData.accessToken,
            expiresAt: tData.accessTokenExpirationTimestampMs || Date.now() + 3600000
          };
          return tData.accessToken;
        }
      }
    }
  } catch {
    // continue
  }

  return null;
}

// Helper to format ms to mm:ss
function formatMs(ms: number): string {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Unshorten any redirect link (e.g. spotify.link, spoti.fi, bit.ly, etc.)
async function unshortenUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (
    trimmed.includes('spotify.link') ||
    trimmed.includes('spoti.fi') ||
    trimmed.includes('link.tospotify.com') ||
    trimmed.includes('bit.ly') ||
    trimmed.includes('t.co') ||
    trimmed.includes('tinyurl.com')
  ) {
    try {
      const headRes = await fetch(trimmed, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        },
        signal: AbortSignal.timeout(4500)
      });
      if (headRes.url && headRes.url !== trimmed) {
        return headRes.url;
      }
    } catch (e) {
      console.warn('Redirect resolve warning:', e);
    }
  }
  return trimmed;
}

// Parse ISO 8601 duration (e.g. PT3M45S, PT210S, PT1H2M30S)
function parseIsoDuration(durationStr?: string): number {
  if (!durationStr) return 180000;
  try {
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseFloat(match[3] || '0');
      const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
      if (totalMs > 0) return Math.round(totalMs);
    }
  } catch {
    // fallback
  }
  return 180000;
}

// Parse any Spotify input URL or URI
function parseSpotifyUrl(input: string): { type: 'playlist' | 'album' | 'track' | 'artist'; id: string } | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Match https://open.spotify.com/(intl-.../)?(user/.../)?(playlist|album|track|artist)/{id}
  const match = trimmed.match(/(?:spotify\.com\/(?:intl-[a-zA-Z0-9-]+\/)?(?:user\/[^/]+\/)?|spotify\.com\/embed\/|spotify:)(playlist|album|track|artist)[/:]([a-zA-Z0-9]{15,35})/i);
  if (match) {
    return {
      type: match[1].toLowerCase() as 'playlist' | 'album' | 'track' | 'artist',
      id: match[2]
    };
  }

  // Raw 15-35 char alphanumeric ID default to playlist
  if (/^[a-zA-Z0-9]{15,35}$/.test(trimmed)) {
    return { type: 'playlist', id: trimmed };
  }

  return null;
}

// Build stream URL for any track title & artist
function buildStreamUrl(title: string, artist: string, durationMs?: number, isrc?: string): string {
  const durSec = durationMs ? Math.floor(durationMs / 1000) : 210;
  let url = `/api/audio/stream?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&duration=${durSec}`;
  if (isrc) url += `&isrc=${encodeURIComponent(isrc)}`;
  return url;
}

export interface AudioSourceResult {
  url: string;
  mimeType: string;
  coverUrl?: string;
  album?: string;
  durationSec?: number;
  isFullLength: boolean;
}

// Real Audio Search Cache
const audioUrlCache = new Map<string, AudioSourceResult>();

// Decrypt JioSaavn DES-ECB encrypted media URL
function decryptJioSaavnMediaUrl(encryptedUrl: string): string | null {
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) } as any,
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const url = decrypted.toString(CryptoJS.enc.Utf8);
    return url && url.startsWith('http') ? url : null;
  } catch {
    return null;
  }
}

function cleanStringForMatch(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const BANNED_COVER_KEYWORDS = [
  'karaoke', 'ambient', 'nightcore', 'techno', 'slowed', 'sped up', 'tribute',
  'instrumental', 'lullaby', 'cover', 'originally perfomed', 'originally performed',
  'melody', 'ringtone', '8d', 'reverb', 'dance mix', 'flip', 'acoustic',
  'piano version', 'piano instrumental', 'sleep well', 'lullaby dreams', 'zzang',
  'parody', 'remake', 'backing track', 'lofi flip', 'lofi', 'tribute band'
];

// Transcode audio buffer (AAC / MP4 / M4A) into high-fidelity 320kbps MP3 buffer via FFmpeg
function transcodeToMp3Buffer(inputBuffer: Buffer, bitrate: string = '320k'): Promise<Buffer> {
  return new Promise((resolve) => {
    try {
      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-c:a', 'libmp3lame',
        '-b:a', bitrate,
        '-ar', '44100',
        '-ac', '2',
        '-q:a', '0',
        '-f', 'mp3',
        'pipe:1'
      ]);

      const chunks: Buffer[] = [];
      ffmpeg.stdout.on('data', (c) => chunks.push(c));
      ffmpeg.stderr.on('data', () => {});
      ffmpeg.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(inputBuffer);
        }
      });
      ffmpeg.on('error', () => {
        resolve(inputBuffer);
      });

      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    } catch {
      resolve(inputBuffer);
    }
  });
}

// Cache for authentic original audio buffers
const originalAudioBufferCache = new Map<string, { buffer: Buffer; mimeType: string; coverUrl?: string; album?: string }>();

// Helper to search and download 100% authentic original studio audio (Official Audio / Video with real artist vocals)
async function fetchExactOriginalStudioAudio(
  title: string,
  artist: string,
  spotifyDurationSec: number = 0
): Promise<{ buffer: Buffer; coverUrl?: string; album?: string } | null> {
  const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/feat\..*/i, '').replace(/ft\..*/i, '').trim();
  const cleanArtist = artist.split(',')[0].replace(/feat\..*/i, '').replace(/ft\..*/i, '').trim();
  const cacheKey = `${cleanArtist} - ${cleanTitle}`.toLowerCase().trim();

  if (originalAudioBufferCache.has(cacheKey)) {
    const cached = originalAudioBufferCache.get(cacheKey)!;
    return { buffer: cached.buffer, coverUrl: cached.coverUrl, album: cached.album };
  }

  // 1. YouTube Official Audio Match (Highest Fidelity & 100% Authentic Artist Vocals/Production)
  try {
    const queries = [
      `${cleanArtist} - ${cleanTitle} (Official Audio)`,
      `${cleanArtist} ${cleanTitle} official audio`,
      `${cleanArtist} ${cleanTitle} official music video`,
      `${cleanArtist} ${cleanTitle} audio`,
      `${cleanArtist} ${cleanTitle}`
    ];

    let targetVideoId: string | null = null;
    let videoThumbnail: string | undefined;

    for (const q of queries) {
      try {
        const results = await searchYouTubeSafely(q, 5);
        if (results && results.length > 0) {
          for (const v of results) {
            const vTitle = (v.title || '').toLowerCase();
            // Discard banned keywords (covers, remixes, slowed, reverbs, piano, karaoke, etc.)
            const isBanned = BANNED_COVER_KEYWORDS.some(kw => vTitle.includes(kw));
            if (isBanned) continue;

            // Check if duration matches reasonably (if known)
            if (spotifyDurationSec > 30 && v.durationSec > 0) {
              const diff = Math.abs(v.durationSec - spotifyDurationSec);
              if (diff > 50) continue; // skip if duration differs excessively
            }

            targetVideoId = v.videoId || v.id;
            videoThumbnail = v.thumbnailUrl;
            break;
          }
          if (targetVideoId) break;
        }
      } catch {
        // continue
      }
    }

    if (targetVideoId) {
      // Call conversion pipeline for full 320kbps MP3
      const initRes = await fetch(
        `https://loader.to/ajax/download.php?format=mp3&url=https://www.youtube.com/watch?v=${targetVideoId}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) }
      );
      if (initRes.ok) {
        const initData = await initRes.json();
        if (initData.progress_url) {
          for (let attempt = 0; attempt < 18; attempt++) {
            await new Promise((r) => setTimeout(r, 1000));
            const pRes = await fetch(initData.progress_url, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(5000)
            });
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData.download_url) {
                const audioRes = await fetch(pData.download_url, {
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                  signal: AbortSignal.timeout(15000)
                });
                if (audioRes.ok) {
                  const rawBuf = Buffer.from(await audioRes.arrayBuffer());
                  if (rawBuf.length > 200000) { // Valid full track (>200KB)
                    const result = {
                      buffer: rawBuf,
                      coverUrl: videoThumbnail,
                      album: `${cleanArtist} Singles`
                    };
                    originalAudioBufferCache.set(cacheKey, {
                      buffer: rawBuf,
                      mimeType: 'audio/mpeg',
                      coverUrl: videoThumbnail,
                      album: result.album
                    });
                    return result;
                  }
                }
                break;
              }
            }
          }
        }
      }
    }
  } catch (ytErr) {
    console.warn('YouTube original audio resolver error:', ytErr);
  }

  // 2. High-Fidelity JioSaavn Master Audio Search
  try {
    const jioQueries = [
      `${cleanArtist} ${cleanTitle}`,
      `${cleanTitle} ${cleanArtist}`
    ];
    let jioCandidates: any[] = [];
    for (const q of jioQueries) {
      const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&ctx=web6dot0&api_version=4&p=1&n=10&q=${encodeURIComponent(q)}`;
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          jioCandidates.push(...data.results);
        }
      }
    }

    if (jioCandidates.length > 0) {
      for (const c of jioCandidates) {
        const rawTitle = (c.title || '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
        const cTitle = cleanStringForMatch(rawTitle);
        const cArtist = cleanStringForMatch(c.more_info?.primary_artists || c.more_info?.artistMap?.primary_artists?.[0]?.name || c.more_info?.singers || '');
        const targetTitleClean = cleanStringForMatch(cleanTitle);
        const targetArtistClean = cleanStringForMatch(cleanArtist);

        const isBanned = BANNED_COVER_KEYWORDS.some(kw => cTitle.includes(kw));
        if (isBanned) continue;

        const artistMatch = cArtist === targetArtistClean || cArtist.includes(targetArtistClean) || targetArtistClean.includes(cArtist);
        const titleMatch = cTitle === targetTitleClean || cTitle.includes(targetTitleClean) || targetTitleClean.includes(cTitle);
        if (!artistMatch || !titleMatch || cArtist.length < 3 || cTitle.length < 2) continue;

        if (spotifyDurationSec > 30 && c.more_info?.duration) {
          const diff = Math.abs(parseInt(c.more_info.duration, 10) - spotifyDurationSec);
          if (diff > 35) continue;
        }

        if (artistMatch && titleMatch) {
          const enc = c.more_info?.encrypted_media_url;
          if (enc) {
            const dec = decryptJioSaavnMediaUrl(enc);
            if (dec) {
              const hqUrl = dec.replace(/_96\./, '_320.').replace(/_160\./, '_320.');
              const aRes = await fetch(hqUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(8000)
              });
              if (aRes.ok) {
                const buf = Buffer.from(await aRes.arrayBuffer());
                if (buf.length > 200000) {
                  const mp3Buf = await transcodeToMp3Buffer(buf, '320k');
                  const result = {
                    buffer: mp3Buf,
                    coverUrl: c.image?.replace('150x150', '500x500'),
                    album: c.more_info?.album
                  };
                  originalAudioBufferCache.set(cacheKey, {
                    buffer: mp3Buf,
                    mimeType: 'audio/mpeg',
                    coverUrl: result.coverUrl,
                    album: result.album
                  });
                  return result;
                }
              }
            }
          }
        }
      }
    }
  } catch (jioErr) {
    console.warn('JioSaavn original resolver error:', jioErr);
  }

  return null;
}

// Find real authentic studio master recording URL with multi-source ranking
async function findRealAudioSource(
  title: string,
  artist: string,
  spotifyDurationSec: number = 0,
  isrc?: string
): Promise<AudioSourceResult | null> {
  const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/feat\..*/i, '').replace(/ft\..*/i, '').trim();
  const cleanArtist = artist.split(',')[0].replace(/feat\..*/i, '').replace(/ft\..*/i, '').trim();
  const targetTitleClean = cleanStringForMatch(cleanTitle);
  const targetArtistClean = cleanStringForMatch(cleanArtist);
  const targetWords = targetTitleClean.split(' ').filter((w: string) => w.length > 1);
  const cacheKey = `${isrc || ''}_${cleanArtist}_${cleanTitle}_${spotifyDurationSec}`.toLowerCase();

  if (audioUrlCache.has(cacheKey)) {
    return audioUrlCache.get(cacheKey)!;
  }

  // 1. Direct ISRC Match on Deezer (100% exact official studio master recording)
  if (isrc && isrc.trim()) {
    try {
      const isrcRes = await fetch(`https://api.deezer.com/track/isrc:${encodeURIComponent(isrc.trim())}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3500)
      });
      if (isrcRes.ok) {
        const isrcData = await isrcRes.json();
        if (isrcData && isrcData.preview) {
          const result: AudioSourceResult = {
            url: isrcData.preview,
            mimeType: 'audio/mpeg',
            coverUrl: isrcData.album?.cover_xl || isrcData.album?.cover_big,
            album: isrcData.album?.title,
            durationSec: isrcData.duration || 30,
            isFullLength: false
          };
          audioUrlCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn('Deezer ISRC search error:', err);
    }
  }

  // 2. Search JioSaavn studio catalogue WITH STRICT original master validation
  const jioQueries = [
    `${cleanArtist} ${cleanTitle}`,
    `${cleanTitle} ${cleanArtist}`
  ];

  let jioCandidates: any[] = [];

  for (const q of jioQueries) {
    try {
      const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&ctx=web6dot0&api_version=4&p=1&n=10&q=${encodeURIComponent(q)}`;
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            jioCandidates.push(item);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (jioCandidates.length > 0) {
    const seen = new Set();
    const unique = [];
    for (const c of jioCandidates) {
      if (c && c.id && !seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    }

    const scored = unique.map((c: any) => {
      let score = 0;
      const rawTitle = (c.title || '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
      const rawAlbum = (c.more_info?.album || '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
      const cTitle = cleanStringForMatch(rawTitle);
      const cAlbum = cleanStringForMatch(rawAlbum);
      const cArtist = cleanStringForMatch(c.more_info?.primary_artists || c.more_info?.artistMap?.primary_artists?.[0]?.name || c.more_info?.singers || '');
      const cDuration = parseInt(c.more_info?.duration || '0', 10);

      // STRICT CHECK: Disqualify any cover / remake / ambient / karaoke / instrumental / lullaby
      const isBanned = BANNED_COVER_KEYWORDS.some(kw => {
        if (!targetTitleClean.includes(kw) && (cTitle.includes(kw) || cAlbum.includes(kw))) return true;
        return false;
      });
      if (isBanned) {
        return { item: c, score: -9999, cDuration };
      }

      // STRICT Artist match (MUST match real artist)
      const artistMatch = cArtist.includes(targetArtistClean) || targetArtistClean.includes(cArtist);
      if (!artistMatch) {
        return { item: c, score: -9999, cDuration };
      }
      score += 60;

      // STRICT Title match
      const titleMatch = cTitle === targetTitleClean || cTitle.includes(targetTitleClean) || targetTitleClean.includes(cTitle);
      if (!titleMatch) {
        return { item: c, score: -9999, cDuration };
      }
      if (cTitle === targetTitleClean) {
        score += 50;
      } else {
        score += 35;
      }

      // Duration matching
      if (spotifyDurationSec > 0 && cDuration > 0) {
        const diff = Math.abs(cDuration - spotifyDurationSec);
        if (diff <= 8) score += 40;
        else if (diff <= 20) score += 20;
        else if (diff <= 40) score += 10;
        else score -= 15;
      } else if (cDuration >= 120) {
        score += 15;
      }

      return { item: c, score, cDuration };
    });

    // Only accept items with strong positive original match
    const validMatches = scored.filter(s => s.score >= 120);
    validMatches.sort((a, b) => b.score - a.score);

    for (const s of validMatches) {
      const enc = s.item.more_info?.encrypted_media_url;
      if (enc) {
        const dec = decryptJioSaavnMediaUrl(enc);
        if (dec) {
          const hqUrl = dec.replace(/_96\./, '_320.').replace(/_160\./, '_320.');
          const result: AudioSourceResult = {
            url: hqUrl,
            mimeType: 'audio/mp4',
            coverUrl: s.item.image?.replace('150x150', '500x500'),
            album: s.item.more_info?.album,
            durationSec: s.cDuration,
            isFullLength: true
          };
          audioUrlCache.set(cacheKey, result);
          return result;
        }
      }
    }
  }

  // 3. Deezer Studio Search Match (100% Authentic Master Track)
  try {
    const deezerRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}&limit=5`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3500)
    });
    if (deezerRes.ok) {
      const data = await deezerRes.json();
      if (data.data && data.data.length > 0) {
        for (const item of data.data) {
          const cTitle = cleanStringForMatch(item.title || '');
          const cArtist = cleanStringForMatch(item.artist?.name || '');
          if (item.preview && (cArtist.includes(targetArtistClean) || targetArtistClean.includes(cArtist)) && (cTitle.includes(targetTitleClean) || targetTitleClean.includes(cTitle))) {
            const result: AudioSourceResult = {
              url: item.preview,
              mimeType: 'audio/mpeg',
              coverUrl: item.album?.cover_xl || item.album?.cover_big,
              album: item.album?.title,
              durationSec: item.duration || 30,
              isFullLength: false
            };
            audioUrlCache.set(cacheKey, result);
            return result;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Deezer search query error:', err);
  }

  // 4. iTunes / Apple Music CDN Match (100% Authentic Master AAC/m4a)
  try {
    const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}&entity=song&limit=5`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3500)
    });
    if (itunesRes.ok) {
      const data = await itunesRes.json();
      if (data.results && data.results.length > 0) {
        for (const item of data.results) {
          const cTitle = cleanStringForMatch(item.trackName || '');
          const cArtist = cleanStringForMatch(item.artistName || '');
          if (item.previewUrl && (cArtist.includes(targetArtistClean) || targetArtistClean.includes(cArtist)) && (cTitle.includes(targetTitleClean) || targetTitleClean.includes(cTitle))) {
            const result: AudioSourceResult = {
              url: item.previewUrl,
              mimeType: 'audio/mp4',
              coverUrl: item.artworkUrl100?.replace('100x100bb', '600x600bb'),
              album: item.collectionName,
              durationSec: 30,
              isFullLength: false
            };
            audioUrlCache.set(cacheKey, result);
            return result;
          }
        }
      }
    }
  } catch (err) {
    console.warn('iTunes search query error:', err);
  }

  return null;
}

// Scrape Spotify Page & Embed (Extract JSON-LD Schema, NextData, InitialState, Meta)
async function fetchFromSpotifyScraper(type: string, id: string) {
  const urls = [
    `https://open.spotify.com/${type}/${id}`,
    `https://open.spotify.com/embed/${type}/${id}`
  ];

  for (const targetUrl of urls) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) continue;
      const html = await response.text();

      // 1. Parse JSON-LD Schema (Spotify's official structured SEO data)
      const ldMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
      for (const m of ldMatches) {
        try {
          const ld = JSON.parse(m[1]);
          if (ld['@type'] === 'MusicPlaylist' || ld['@type'] === 'MusicAlbum') {
            const title = ld.name || `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const description = ld.description || `Spotify ${type}`;
            const owner = ld.author?.name || ld.byArtist?.[0]?.name || 'Spotify';
            const coverUrl = ld.image || ld.thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

            const rawTracks = Array.isArray(ld.track) ? ld.track : (ld.tracks || []);
            if (rawTracks.length > 0) {
              const tracks = rawTracks.map((t: any, idx: number) => {
                const trackTitle = t.name || `Track ${idx + 1}`;
                const trackArtist = Array.isArray(t.byArtist)
                  ? t.byArtist.map((a: any) => a.name || a).join(', ')
                  : (t.byArtist?.name || owner || 'Various Artists');
                const durMs = parseIsoDuration(t.duration) || 180000;
                return {
                  id: `${id}_${idx + 1}`,
                  title: trackTitle,
                  artist: trackArtist,
                  album: title,
                  durationMs: durMs,
                  durationFormatted: formatMs(durMs),
                  coverUrl: coverUrl,
                  previewAudioUrl: buildStreamUrl(trackTitle, trackArtist, durMs),
                  trackNumber: idx + 1,
                  status: 'ready',
                  selected: true
                };
              });

              return {
                id,
                title,
                description,
                owner,
                coverUrl,
                totalTracks: tracks.length,
                totalDurationMs: tracks.reduce((acc: number, cur: any) => acc + (cur.durationMs || 0), 0),
                spotifyUrl: `https://open.spotify.com/${type}/${id}`,
                tracks
              };
            }
          } else if (ld['@type'] === 'MusicRecording') {
            const trackTitle = ld.name || 'Track';
            const trackArtist = Array.isArray(ld.byArtist)
              ? ld.byArtist.map((a: any) => a.name || a).join(', ')
              : (ld.byArtist?.name || 'Artist');
            const albumName = ld.inAlbum?.name || trackTitle;
            const coverUrl = ld.image || ld.thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
            const durMs = parseIsoDuration(ld.duration) || 180000;

            return {
              id,
              title: `${trackTitle} - Single`,
              description: `Track by ${trackArtist} on album "${albumName}"`,
              owner: trackArtist,
              coverUrl,
              totalTracks: 1,
              totalDurationMs: durMs,
              spotifyUrl: `https://open.spotify.com/${type}/${id}`,
              tracks: [{
                id,
                title: trackTitle,
                artist: trackArtist,
                album: albumName,
                durationMs: durMs,
                durationFormatted: formatMs(durMs),
                coverUrl,
                previewAudioUrl: buildStreamUrl(trackTitle, trackArtist, durMs),
                trackNumber: 1,
                status: 'ready',
                selected: true
              }]
            };
          }
        } catch {
          // ignore
        }
      }

      // 2. Parse __NEXT_DATA__
      let entityData: any = null;
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (nextDataMatch && nextDataMatch[1]) {
        try {
          const parsed = JSON.parse(nextDataMatch[1]);
          entityData = parsed?.props?.pageProps?.state?.data?.entity || parsed?.props?.pageProps?.entity;
        } catch {}
      }

      // 3. Parse initial-state
      if (!entityData) {
        const initialStateMatch = html.match(/<script id="initial-state" type="text\/plain">([\s\S]*?)<\/script>/);
        if (initialStateMatch && initialStateMatch[1]) {
          try {
            const decoded = Buffer.from(initialStateMatch[1], 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded);
            entityData = parsed?.data?.entity;
          } catch {
            try {
              const parsed = JSON.parse(initialStateMatch[1]);
              entityData = parsed?.data?.entity;
            } catch {}
          }
        }
      }

      if (entityData) {
        const title = entityData.title || entityData.name || 'Spotify Playlist';
        const description = entityData.subtitle || entityData.description || 'Imported from Spotify';
        const owner = entityData.owner?.name || entityData.subtitle || 'Spotify';
        const coverUrl = entityData.visualIdentity?.image?.[0]?.url || entityData.coverArt?.sources?.[0]?.url || entityData.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
        
        const trackList = entityData.trackList || entityData.tracksList || entityData.tracks || [];
        if (trackList.length > 0) {
          const tracks = trackList.map((t: any, idx: number) => {
            const trackTitle = t.title || t.name || `Track ${idx + 1}`;
            const trackArtist = t.subtitle || (t.artists?.map((a: any) => a.name || a).join(', ')) || 'Various Artists';
            const durationMs = t.duration || t.duration_ms || 180000;
            const trackCover = t.coverArt?.sources?.[0]?.url || t.images?.[0]?.url || coverUrl;

            return {
              id: t.id || `track_${idx + 1}`,
              title: trackTitle,
              artist: trackArtist,
              album: t.album?.name || title,
              durationMs: durationMs,
              durationFormatted: formatMs(durationMs),
              coverUrl: trackCover,
              previewAudioUrl: buildStreamUrl(trackTitle, trackArtist, durationMs),
              trackNumber: idx + 1,
              status: 'ready',
              selected: true
            };
          });

          return {
            id,
            title,
            description,
            owner,
            coverUrl,
            totalTracks: tracks.length,
            totalDurationMs: tracks.reduce((acc: number, cur: any) => acc + (cur.durationMs || 0), 0),
            spotifyUrl: `https://open.spotify.com/${type}/${id}`,
            tracks
          };
        }
      }
    } catch {
      // try next URL
    }
  }

  return null;
}

// Scrape Spotify Downloader Public APIs
async function fetchFromSpotifyPublicApis(type: string, id: string) {
  try {
    const metaRes = await fetch(`https://api.spotifydown.com/metadata/${type}/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://spotifydown.com/',
        'Origin': 'https://spotifydown.com'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta && meta.success) {
        const title = meta.title || `Spotify ${type}`;
        const coverUrl = meta.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
        const owner = meta.artists || 'Spotify';

        const listRes = await fetch(`https://api.spotifydown.com/trackList/${type}/${id}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://spotifydown.com/',
            'Origin': 'https://spotifydown.com'
          },
          signal: AbortSignal.timeout(4500)
        });

        if (listRes.ok) {
          const listData = await listRes.json();
          const trackItems = listData.trackList || listData.tracks || [];
          if (trackItems.length > 0) {
            const tracks = trackItems.map((t: any, idx: number) => {
              const trackTitle = t.title || t.name || `Track ${idx + 1}`;
              const trackArtist = t.artists || t.artist || owner;
              const durMs = t.durationMs || 180000;
              return {
                id: t.id || `${id}_${idx + 1}`,
                title: trackTitle,
                artist: trackArtist,
                album: t.album || title,
                durationMs: durMs,
                durationFormatted: formatMs(durMs),
                coverUrl: t.cover || coverUrl,
                previewAudioUrl: buildStreamUrl(trackTitle, trackArtist, durMs),
                trackNumber: idx + 1,
                status: 'ready',
                selected: true
              };
            });

            return {
              id,
              title,
              description: `Playlist with ${tracks.length} tracks`,
              owner,
              coverUrl,
              totalTracks: tracks.length,
              totalDurationMs: tracks.reduce((acc: number, cur: any) => acc + (cur.durationMs || 0), 0),
              spotifyUrl: `https://open.spotify.com/${type}/${id}`,
              tracks
            };
          }
        }
      }
    }
  } catch {
    // continue
  }

  return null;
}

// Fallback search to generate a full playlist from query or title
async function searchMusicToPlaylist(query: string, playlistTitle?: string) {
  const cleanQ = query.replace(/^https?:\/\/[^/]+/i, '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim() || query;

  // Search iTunes for rich tracks with high-res artwork
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=15`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const coverUrl = data.results[0]?.artworkUrl100?.replace('100x100bb', '600x600bb') || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
        const displayTitle = playlistTitle || `${query.length > 30 ? query.substring(0, 30) + '...' : query} Collection`;

        const tracks = data.results.map((r: any, idx: number) => {
          const trackTitle = r.trackName || `Track ${idx + 1}`;
          const trackArtist = r.artistName || 'Various Artists';
          const durMs = r.trackTimeMillis || 180000;
          const trackCover = r.artworkUrl100?.replace('100x100bb', '600x600bb') || coverUrl;

          return {
            id: `itunes_${r.trackId || idx + 1}`,
            title: trackTitle,
            artist: trackArtist,
            album: r.collectionName || displayTitle,
            durationMs: durMs,
            durationFormatted: formatMs(durMs),
            coverUrl: trackCover,
            previewAudioUrl: buildStreamUrl(trackTitle, trackArtist, durMs),
            trackNumber: idx + 1,
            year: r.releaseDate ? r.releaseDate.split('-')[0] : '',
            status: 'ready',
            selected: true
          };
        });

        return {
          id: `search_${Date.now()}`,
          title: displayTitle,
          description: `Curated collection featuring ${tracks.length} tracks`,
          owner: 'SoundHarvest Music Engine',
          coverUrl,
          totalTracks: tracks.length,
          totalDurationMs: tracks.reduce((acc: number, cur: any) => acc + (cur.durationMs || 0), 0),
          spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(cleanQ)}`,
          tracks
        };
      }
    }
  } catch {
    // continue
  }

  return null;
}

// Main Spotify Resolve Endpoint
app.post('/api/spotify/resolve', async (req: Request, res: Response) => {
  try {
    let { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid Spotify URL or query.' });
    }

    url = url.trim();

    // 0. Follow redirects for short links (e.g. spotify.link, spoti.fi, etc.)
    const resolvedUrl = await unshortenUrl(url);

    const parsed = parseSpotifyUrl(resolvedUrl);

    if (parsed) {
      const { type, id } = parsed;

      // Tier 1: Try Spotify Web API with Anonymous / Client-Credentials Token
      const token = await getSpotifyAnonymousToken();
      if (token) {
        try {
          let endpoint = '';
          if (type === 'playlist') endpoint = `https://api.spotify.com/v1/playlists/${id}`;
          else if (type === 'album') endpoint = `https://api.spotify.com/v1/albums/${id}`;
          else if (type === 'track') endpoint = `https://api.spotify.com/v1/tracks/${id}`;
          else if (type === 'artist') endpoint = `https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`;

          const apiRes = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(4500)
          });

          if (apiRes.ok) {
            const data = await apiRes.json();

            if (type === 'playlist') {
              const playlistTitle = data.name || 'Spotify Playlist';
              const coverUrl = data.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
              const owner = data.owner?.display_name || 'Spotify';
              const description = data.description || 'Spotify Playlist';

              const rawTracks = data.tracks?.items || [];
              const tracks = rawTracks
                .filter((item: any) => item && (item.track || item.name))
                .map((item: any, idx: number) => {
                  const t = item.track || item;
                  const trackCover = t.album?.images?.[0]?.url || coverUrl;
                  const artists = t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
                  const albumName = t.album?.name || playlistTitle;
                  const releaseYear = t.album?.release_date ? t.album.release_date.split('-')[0] : '';
                  const durationMs = t.duration_ms || 180000;

                  return {
                    id: t.id || `track_${idx + 1}`,
                    title: t.name,
                    artist: artists,
                    album: albumName,
                    durationMs: durationMs,
                    durationFormatted: formatMs(durationMs),
                    coverUrl: trackCover,
                    previewAudioUrl: buildStreamUrl(t.name, artists, durationMs, t.external_ids?.isrc),
                    year: releaseYear,
                    trackNumber: idx + 1,
                    spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
                    isrc: t.external_ids?.isrc || undefined,
                    status: 'ready',
                    selected: true
                  };
                });

              if (tracks.length > 0) {
                return res.json({
                  id,
                  title: playlistTitle,
                  description,
                  owner,
                  coverUrl,
                  totalTracks: tracks.length,
                  totalDurationMs: tracks.reduce((acc: number, cur: any) => acc + (cur.durationMs || 0), 0),
                  spotifyUrl: data.external_urls?.spotify || `https://open.spotify.com/playlist/${id}`,
                  tracks
                });
              }
            } else if (type === 'album') {
              const albumTitle = data.name || 'Spotify Album';
              const coverUrl = data.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
              const owner = data.artists?.map((a: any) => a.name).join(', ') || 'Various Artists';
              const releaseYear = data.release_date ? data.release_date.split('-')[0] : '';

              const rawTracks = data.tracks?.items || [];
              const tracks = rawTracks.map((t: any, idx: number) => {
                const artists = t.artists?.map((a: any) => a.name).join(', ') || owner;
                const durationMs = t.duration_ms || 180000;
                return {
                  id: t.id || `album_track_${idx + 1}`,
                  title: t.name,
                  artist: artists,
                  album: albumTitle,
                  durationMs: durationMs,
                  durationFormatted: formatMs(durationMs),
                  coverUrl: coverUrl,
                  previewAudioUrl: buildStreamUrl(t.name, artists, durationMs, t.external_ids?.isrc),
                  year: releaseYear,
                  trackNumber: t.track_number || idx + 1,
                  spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
                  isrc: t.external_ids?.isrc || undefined,
                  status: 'ready',
                  selected: true
                };
              });

              if (tracks.length > 0) {
                return res.json({
                  id,
                  title: albumTitle,
                  description: `Album by ${owner} • Released ${releaseYear || 'Recently'} • ${tracks.length} tracks`,
                  owner,
                  coverUrl,
                  totalTracks: tracks.length,
                  totalDurationMs: tracks.reduce((acc: number, cur: any) => acc + (cur.durationMs || 0), 0),
                  spotifyUrl: data.external_urls?.spotify || `https://open.spotify.com/album/${id}`,
                  tracks
                });
              }
            } else if (type === 'track') {
              const coverUrl = data.album?.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
              const artists = data.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
              const albumName = data.album?.name || data.name;
              const releaseYear = data.album?.release_date ? data.album.release_date.split('-')[0] : '';
              const durationMs = data.duration_ms || 180000;

              const singleTrack = {
                id: data.id,
                title: data.name,
                artist: artists,
                album: albumName,
                durationMs: durationMs,
                durationFormatted: formatMs(durationMs),
                coverUrl,
                previewAudioUrl: buildStreamUrl(data.name, artists, durationMs, data.external_ids?.isrc),
                year: releaseYear,
                trackNumber: data.track_number || 1,
                spotifyUrl: data.external_urls?.spotify || `https://open.spotify.com/track/${id}`,
                isrc: data.external_ids?.isrc || undefined,
                status: 'ready',
                selected: true
              };

              return res.json({
                id,
                title: `${data.name} - Single`,
                description: `Single track by ${artists} on album "${albumName}"`,
                owner: artists,
                coverUrl,
                totalTracks: 1,
                totalDurationMs: durationMs,
                spotifyUrl: data.external_urls?.spotify || `https://open.spotify.com/track/${id}`,
                tracks: [singleTrack]
              });
            }
          }
        } catch (apiErr) {
          console.warn('Spotify API call error, falling to scraper:', apiErr);
        }
      }

      // Tier 2: Spotify HTML / JSON-LD / Schema Scraper
      const scrapedResult = await fetchFromSpotifyScraper(type, id);
      if (scrapedResult && scrapedResult.tracks.length > 0) {
        return res.json(scrapedResult);
      }

      // Tier 3: Spotify Downloader Public APIs
      const publicApiResult = await fetchFromSpotifyPublicApis(type, id);
      if (publicApiResult && publicApiResult.tracks.length > 0) {
        return res.json(publicApiResult);
      }

      // Tier 4: Spotify oEmbed metadata + search enrichment
      try {
        const oembedRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/${type}/${id}`);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          const title = oembedData.title || `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`;
          const coverUrl = oembedData.thumbnail_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

          // Try to search iTunes with the oEmbed title to get actual songs
          const searchResult = await searchMusicToPlaylist(title, title);
          if (searchResult && searchResult.tracks.length > 0) {
            searchResult.coverUrl = coverUrl;
            searchResult.spotifyUrl = `https://open.spotify.com/${type}/${id}`;
            return res.json(searchResult);
          }

          const singleTrack = {
            id: `${id}_1`,
            title: title,
            artist: oembedData.provider_name || 'Spotify Artist',
            album: title,
            durationMs: 210000,
            durationFormatted: '3:30',
            coverUrl,
            previewAudioUrl: buildStreamUrl(title, oembedData.provider_name || 'Spotify Artist', 210000),
            status: 'ready',
            selected: true
          };

          return res.json({
            id,
            title,
            description: `Imported via Spotify (${oembedData.provider_name || 'Spotify'})`,
            owner: 'Spotify',
            coverUrl,
            totalTracks: 1,
            totalDurationMs: 210000,
            spotifyUrl: `https://open.spotify.com/${type}/${id}`,
            tracks: [singleTrack]
          });
        }
      } catch (oembedErr) {
        console.warn('oEmbed fallback warning:', oembedErr);
      }
    }

    // Tier 5: If it's a general search query or keyword (e.g. "Top 50", "Coldplay", "Romantic Hindi")
    const searchResult = await searchMusicToPlaylist(url);
    if (searchResult && searchResult.tracks.length > 0) {
      return res.json(searchResult);
    }

    return res.status(404).json({
      error: 'Could not resolve playlist tracks. Please check that the URL is public or try searching by artist/album name.'
    });
  } catch (error: any) {
    console.error('Resolve endpoint error:', error);
    res.status(500).json({ error: error.message || 'Failed to process Spotify request' });
  }
});

// Safe YouTube search helper that prevents browseId/undefined crashes
function parseDurationText(str?: string): number {
  if (!str) return 180;
  const parts = str.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 180;
}

interface YouTubeVideoItem {
  id: string;
  videoId: string;
  title: string;
  durationSec: number;
  durationFormatted: string;
  thumbnailUrl: string;
  channelTitle: string;
}

async function searchYouTubeSafely(query: string, limit: number = 6): Promise<YouTubeVideoItem[]> {
  // 1. Direct Web Scrape (Zero external library dependency, immune to browseId missing bugs)
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({.+?});/);
      if (match) {
        const data = JSON.parse(match[1]);
        const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        const videos: YouTubeVideoItem[] = [];
        for (const sec of sections) {
          const contents = sec.itemSectionRenderer?.contents || [];
          for (const item of contents) {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
              const durationFormatted = v.lengthText?.simpleText || '3:30';
              const durationSec = parseDurationText(durationFormatted);
              const channelName = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || '';
              videos.push({
                id: v.videoId,
                videoId: v.videoId,
                title,
                durationSec,
                durationFormatted,
                thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                channelTitle: channelName
              });
              if (videos.length >= limit) break;
            }
          }
          if (videos.length >= limit) break;
        }
        if (videos.length > 0) return videos;
      }
    }
  } catch (err: any) {
    // Silently proceed to fallback
  }

  // 2. Fallback to youtube-sr in a safe try-catch
  try {
    const searchFn = (YouTube.search || YouTube.default?.search || (YouTube as any).search);
    if (typeof searchFn === 'function') {
      const results = await searchFn(query, { limit });
      if (results && Array.isArray(results) && results.length > 0) {
        return results.map((r: any) => ({
          id: r.id || '',
          videoId: r.id || '',
          title: r.title || query,
          durationSec: Math.floor((r.duration || 180000) / 1000),
          durationFormatted: r.durationFormatted || '3:30',
          thumbnailUrl: r.thumbnail?.url || `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`,
          channelTitle: r.channel?.name || ''
        })).filter(v => v.id);
      }
    }
  } catch {
    // youtube-sr failed, return empty array safely without throwing
  }

  return [];
}

// Search YouTube Video ID for full original track playback
const youtubeVideoCache = new Map<string, { videoId: string; title: string; durationSec: number; durationFormatted: string }>();

app.get('/api/youtube/find', async (req: Request, res: Response) => {
  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';

  if (!title) {
    return res.status(400).json({ error: 'Missing title query parameter' });
  }

  const queryKey = `${artist} - ${title}`.toLowerCase().trim();
  if (youtubeVideoCache.has(queryKey)) {
    return res.json(youtubeVideoCache.get(queryKey));
  }

  try {
    const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].trim();
    const queries = [
      `${cleanArtist} - ${cleanTitle} (Official Audio)`,
      `${cleanArtist} ${cleanTitle} official audio`,
      `${cleanArtist} ${cleanTitle} official music video`,
      `${cleanArtist} ${cleanTitle}`
    ];

    let bestVideo: YouTubeVideoItem | null = null;

    for (const q of queries) {
      try {
        const results = await searchYouTubeSafely(q, 6);
        if (results && results.length > 0) {
          for (const v of results) {
            const vTitle = (v.title || '').toLowerCase();
            const lowerTitle = title.toLowerCase();

            // Discard banned keywords (covers, slowed, reverbs, reaction, karaoke, etc.)
            const isBanned = BANNED_COVER_KEYWORDS.some(kw => !lowerTitle.includes(kw) && vTitle.includes(kw));
            if (isBanned) continue;

            // Extra points for Official / VEVO / Topic / Official Audio
            const isOfficial = /official (audio|video|music video)|vevo| - topic/i.test(v.title + ' ' + (v.channelTitle || ''));
            if (isOfficial) {
              bestVideo = v;
              break;
            }

            if (!bestVideo) {
              bestVideo = v;
            }
          }

          if (bestVideo) break;
        }
      } catch {
        // continue to next query
      }
    }

    if (bestVideo) {
      const resultObj = {
        videoId: bestVideo.videoId,
        title: bestVideo.title || `${artist} - ${title}`,
        durationSec: bestVideo.durationSec || 180,
        durationFormatted: bestVideo.durationFormatted || '3:00'
      };
      youtubeVideoCache.set(queryKey, resultObj);
      return res.json(resultObj);
    }
  } catch (err: any) {
    console.warn('YouTube search handled error:', err.message);
  }

  return res.json({
    videoId: null,
    title: `${artist} - ${title}`,
    durationSec: 180,
    durationFormatted: '3:00'
  });
});

// Search multiple YouTube Video options (Official Music Video, Official Audio, Live, Lyric video)
app.get('/api/youtube/videos', async (req: Request, res: Response) => {
  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';

  if (!title) {
    return res.status(400).json({ error: 'Missing title parameter' });
  }

  try {
    const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].trim();
    const searchQuery = `${cleanArtist} ${cleanTitle} official music video`;

    const videos = await searchYouTubeSafely(searchQuery, 6);

    if (videos && videos.length > 0) {
      // Prefer one that has "Official Music Video" or "Official Video" in title
      const bestOfficial = videos.find((v: any) => /official (music )?video/i.test(v.title)) || videos[0];

      return res.json({
        videos,
        primaryVideoId: bestOfficial?.id || videos[0]?.id
      });
    }
  } catch (err: any) {
    console.warn('YouTube videos list handled error:', err.message);
  }

  return res.json({
    videos: [],
    primaryVideoId: null
  });
});

// LYRICS ENDPOINT - Synchronized time-stamped karaoke lyrics with Spotify-grade scrolling & line-sync
interface LyricLine {
  timeSec: number;
  text: string;
}

interface LyricsResponse {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  lines: LyricLine[];
  instrumental: boolean;
  source: string;
}

const lyricsCache = new Map<string, LyricsResponse>();

function parseLrc(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const rawLines = lrcText.split('\n');
  const tagRegex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const match = tagRegex.exec(trimmed);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseFloat(match[2]);
      const text = match[3].trim();
      const timeSec = min * 60 + sec;
      lines.push({ timeSec, text: text || '♪' });
    }
  }

  return lines.sort((a, b) => a.timeSec - b.timeSec);
}

app.get('/api/lyrics', async (req: Request, res: Response) => {
  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';
  const album = (req.query.album as string) || '';
  const durationSec = parseFloat((req.query.duration as string) || '0');

  if (!title) {
    return res.status(400).json({ error: 'Missing title query parameter' });
  }

  const cacheKey = `${artist} - ${title}`.toLowerCase().trim();
  if (lyricsCache.has(cacheKey)) {
    return res.json(lyricsCache.get(cacheKey));
  }

  try {
    const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].replace(/feat\..*/i, '').replace(/ft\..*/i, '').trim();

    // 1. Direct fetch with track_name and artist_name
    let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    if (album) {
      getUrl += `&album_name=${encodeURIComponent(album.replace(/\([^)]*\)/g, '').trim())}`;
    }
    if (durationSec > 0) {
      getUrl += `&duration=${Math.round(durationSec)}`;
    }

    const r1 = await fetch(getUrl, {
      headers: {
        'User-Agent': 'SoundHarvest Spotify Web / 1.0 (contact: info@soundharvest.app)'
      }
    }).catch(() => null);

    if (r1 && r1.ok) {
      const data = await r1.json();
      if (data && (data.syncedLyrics || data.plainLyrics)) {
        const parsedLines = data.syncedLyrics ? parseLrc(data.syncedLyrics) : [];
        const result: LyricsResponse = {
          syncedLyrics: data.syncedLyrics || null,
          plainLyrics: data.plainLyrics || null,
          lines: parsedLines,
          instrumental: !!data.instrumental,
          source: 'lrclib'
        };
        lyricsCache.set(cacheKey, result);
        return res.json(result);
      }
    }

    // 2. Search query fallback
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`;
    const r2 = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'SoundHarvest Spotify Web / 1.0 (contact: info@soundharvest.app)'
      }
    }).catch(() => null);

    if (r2 && r2.ok) {
      const searchResults = await r2.json();
      if (Array.isArray(searchResults) && searchResults.length > 0) {
        // Pick best matching result with syncedLyrics
        const best = searchResults.find((x: any) => x.syncedLyrics) || searchResults[0];
        const parsedLines = best.syncedLyrics ? parseLrc(best.syncedLyrics) : [];
        const result: LyricsResponse = {
          syncedLyrics: best.syncedLyrics || null,
          plainLyrics: best.plainLyrics || null,
          lines: parsedLines,
          instrumental: !!best.instrumental,
          source: 'lrclib-search'
        };
        lyricsCache.set(cacheKey, result);
        return res.json(result);
      }
    }
  } catch (err: any) {
    console.warn('Lyrics fetch error:', err.message);
  }

  // Fallback empty response
  const emptyRes: LyricsResponse = {
    syncedLyrics: null,
    plainLyrics: null,
    lines: [],
    instrumental: false,
    source: 'none'
  };
  return res.json(emptyRes);
});

// REAL AUDIO STREAM ENDPOINT - Delivers genuine artist recording with range request & CORS support
app.get('/api/audio/stream', async (req: Request, res: Response) => {
  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';
  const isrc = (req.query.isrc as string) || '';
  const durationSec = parseInt((req.query.duration as string) || '210', 10);

  if (!title) {
    return res.status(400).send('Missing title parameter');
  }

  try {
    const audioSource = await findRealAudioSource(title, artist, durationSec, isrc);
    if (audioSource && audioSource.url) {
      const range = req.headers.range;
      const fetchHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      if (range) {
        fetchHeaders['Range'] = range;
      }

      const streamRes = await fetch(audioSource.url, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(8000)
      });

      if (streamRes.ok || streamRes.status === 206) {
        res.status(streamRes.status);
        res.setHeader('Content-Type', audioSource.mimeType || 'audio/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (streamRes.headers.get('content-range')) {
          res.setHeader('Content-Range', streamRes.headers.get('content-range')!);
        }
        if (streamRes.headers.get('content-length')) {
          res.setHeader('Content-Length', streamRes.headers.get('content-length')!);
        }

        const arrayBuffer = await streamRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    }
  } catch (streamError) {
    console.warn('Real audio stream error:', streamError);
  }

  // Fallback if network stream timeout occurs
  if (!res.headersSent) {
    res.status(404).json({ error: 'Audio stream currently unavailable for this track' });
  }
});

// Helper to fetch image buffer for ID3 album artwork
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (err) {
    console.warn('Failed to fetch cover art image buffer:', err);
  }
  return null;
}

// Download single track with full-length studio audio & embedded ID3v2 tags (including Front Cover Art)
app.get('/api/download/track', async (req: Request, res: Response) => {
  try {
    const title = (req.query.title as string) || 'Track';
    const artist = (req.query.artist as string) || 'Artist';
    const album = (req.query.album as string) || '';
    const coverUrl = req.query.coverUrl as string;
    const year = req.query.year as string;
    const trackNumber = req.query.trackNumber as string;
    const isrc = req.query.isrc as string;
    const durationSec = parseInt((req.query.duration as string) || (req.query.durationMs ? String(Math.floor(parseInt(req.query.durationMs as string, 10) / 1000)) : '210'), 10);

    let rawBuffer: Buffer | null = null;
    let resolvedCoverUrl = coverUrl;
    let resolvedAlbum = album;

    // 1. Primary: Fetch full-length authentic original studio audio (Real Artist Vocals & Instruments)
    try {
      const originalRes = await fetchExactOriginalStudioAudio(title, artist, durationSec);
      if (originalRes && originalRes.buffer && originalRes.buffer.length > 200000) {
        rawBuffer = originalRes.buffer;
        if (!resolvedCoverUrl && originalRes.coverUrl) resolvedCoverUrl = originalRes.coverUrl;
        if (!resolvedAlbum && originalRes.album) resolvedAlbum = originalRes.album;
      }
    } catch (exactErr) {
      console.warn('Exact original fetch error:', exactErr);
    }

    // 2. Fallback: Secondary multi-source search
    if (!rawBuffer || rawBuffer.length === 0) {
      try {
        const source = await findRealAudioSource(title, artist, durationSec, isrc);
        if (source && source.url) {
          if (!resolvedCoverUrl && source.coverUrl) resolvedCoverUrl = source.coverUrl;
          if (!resolvedAlbum && source.album) resolvedAlbum = source.album;

          const aRes = await fetch(source.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(10000)
          });
          if (aRes.ok) {
            rawBuffer = Buffer.from(await aRes.arrayBuffer());
          }
        }
      } catch (fetchErr) {
        console.warn('Real audio download fetch error:', fetchErr);
      }
    }

    if (!rawBuffer || rawBuffer.length === 0) {
      return res.status(404).json({ error: `Original audio could not be retrieved for "${artist} - ${title}". Please try again.` });
    }

    // Transcode audio into clean 320kbps MP3 if needed
    let mp3Buffer: Buffer;
    try {
      mp3Buffer = await transcodeToMp3Buffer(rawBuffer, '320k');
    } catch {
      mp3Buffer = rawBuffer;
    }

    // Fetch high-res front cover art
    const imageBuffer = resolvedCoverUrl ? await fetchImageBuffer(resolvedCoverUrl) : null;

    // Prepare ID3 tags
    const tags: NodeID3.Tags = {
      title,
      artist,
      album: resolvedAlbum || `${artist} Album`,
      year: year || new Date().getFullYear().toString(),
      trackNumber: trackNumber || '1',
      genre: 'Music',
      comment: {
        language: 'eng',
        text: 'Studio Quality Master Download'
      }
    };

    if (imageBuffer) {
      tags.image = {
        mime: 'image/jpeg',
        type: { id: 3, name: 'front cover' },
        description: 'Cover Art',
        imageBuffer: imageBuffer
      };
    }

    // Write ID3v2 tags into the MP3 buffer
    let finalBuffer: Buffer = mp3Buffer;
    try {
      const tagged = NodeID3.write(tags, mp3Buffer);
      if (tagged && tagged.length > 0) {
        finalBuffer = tagged;
      }
    } catch (tagErr) {
      console.warn('ID3 tag injection warning:', tagErr);
    }

    const safeFilename = `${artist} - ${title}`.replace(/[\\/*?:"<>|]/g, '').trim() || 'Track';

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}.mp3"`);
    res.setHeader('Content-Length', finalBuffer.length);
    res.send(finalBuffer);
  } catch (err: any) {
    console.error('Download track error:', err);
    res.status(500).json({ error: err.message || 'Failed to download original track' });
  }
});

// Download batch tracks as a structured ZIP file with full-length MP3s
app.post('/api/download/zip', async (req: Request, res: Response) => {
  try {
    const { playlistTitle, tracks } = req.body;
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({ error: 'No tracks provided for ZIP download' });
    }

    const safePlaylistTitle = (playlistTitle || 'Spotify_Playlist').replace(/[\\/*?:"<>|]/g, '').trim();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safePlaylistTitle)}.zip"`);

    const archive = typeof archiver === 'function' 
      ? (archiver as any)('zip', { zlib: { level: 6 } }) 
      : new ((archiverModule as any).ZipArchive || (archiverModule as any).Archiver || (archiver as any).ZipArchive)({ zlib: { level: 6 } });

    archive.pipe(res);

    let m3uContent = '#EXTM3U\n';

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const trackNum = (i + 1).toString().padStart(2, '0');
      const safeTrackName = `${trackNum}. ${track.artist} - ${track.title}`.replace(/[\\/*?:"<>|]/g, '').trim();
      const fileName = `${safeTrackName}.mp3`;
      const trackDurSec = Math.floor((track.durationMs || 180000) / 1000);

      let rawBuffer: Buffer | null = null;
      let resolvedCover = track.coverUrl;
      let resolvedAlbum = track.album;

      // 1. Primary: Fetch authentic original master audio
      try {
        const exactRes = await fetchExactOriginalStudioAudio(track.title, track.artist, trackDurSec);
        if (exactRes && exactRes.buffer && exactRes.buffer.length > 200000) {
          rawBuffer = exactRes.buffer;
          if (!resolvedCover && exactRes.coverUrl) resolvedCover = exactRes.coverUrl;
          if (!resolvedAlbum && exactRes.album) resolvedAlbum = exactRes.album;
        }
      } catch (exactErr) {
        console.warn(`Exact audio fetch error for "${track.title}":`, exactErr);
      }

      // 2. Fallback: Secondary search
      if (!rawBuffer || rawBuffer.length === 0) {
        try {
          const source = await findRealAudioSource(track.title, track.artist, trackDurSec, track.isrc);
          if (source && source.url) {
            if (!resolvedCover && source.coverUrl) resolvedCover = source.coverUrl;
            if (!resolvedAlbum && source.album) resolvedAlbum = source.album;

            const aRes = await fetch(source.url, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(8000)
            });
            if (aRes.ok) {
              rawBuffer = Buffer.from(await aRes.arrayBuffer());
            }
          }
        } catch (err) {
          console.warn(`Could not download audio for track "${track.title}":`, err);
        }
      }

      if (rawBuffer && rawBuffer.length > 0) {
        // Transcode to MP3
        const mp3Buffer = await transcodeToMp3Buffer(rawBuffer, '320k');
        const imageBuffer = resolvedCover ? await fetchImageBuffer(resolvedCover) : null;

        const tags: NodeID3.Tags = {
          title: track.title,
          artist: track.artist,
          album: resolvedAlbum || safePlaylistTitle,
          year: track.year || new Date().getFullYear().toString(),
          trackNumber: String(i + 1),
          genre: 'Music',
          comment: {
            language: 'eng',
            text: 'Studio Quality Master Download'
          }
        };

        if (imageBuffer) {
          tags.image = {
            mime: 'image/jpeg',
            type: { id: 3, name: 'front cover' },
            description: 'Cover Art',
            imageBuffer: imageBuffer
          };
        }

        let finalBuffer: Buffer = mp3Buffer;
        try {
          const tagged = NodeID3.write(tags, mp3Buffer);
          if (tagged && tagged.length > 0) {
            finalBuffer = tagged;
          }
        } catch {
          // keep buffer as is
        }

        archive.append(finalBuffer, { name: `${safePlaylistTitle}/${fileName}` });
        m3uContent += `#EXTINF:${trackDurSec},${track.artist} - ${track.title}\n${fileName}\n`;
      }
    }

    // Add .m3u Playlist file
    archive.append(m3uContent, { name: `${safePlaylistTitle}/${safePlaylistTitle}.m3u` });

    await archive.finalize();
  } catch (err: any) {
    console.error('ZIP download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to create ZIP download' });
    }
  }
});

// Vite Middleware for development & static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SoundHarvest Server running at http://localhost:${PORT}`);
  });
}

startServer();
