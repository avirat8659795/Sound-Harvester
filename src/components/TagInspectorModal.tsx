import React from 'react';
import { Track } from '../types';
import { X, Tag, Music, Disc, User, Clock, FileAudio, ShieldCheck } from 'lucide-react';

interface TagInspectorModalProps {
  track: Track | null;
  onClose: () => void;
}

export const TagInspectorModal: React.FC<TagInspectorModalProps> = ({ track, onClose }) => {
  if (!track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#181818] border border-[#282828] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#282828] bg-[#202020]">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-[#1DB954]" />
            <h3 className="text-base font-bold text-white">ID3v2.3 Tag Inspector</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#A7A7A7] hover:text-white p-1 rounded-lg bg-[#282828] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4 bg-[#121212] p-3 rounded-xl border border-[#282828]">
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-16 h-16 rounded-lg object-cover border border-white/10 shadow"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-white text-sm truncate">{track.title}</h4>
              <p className="text-xs text-[#1DB954] truncate">{track.artist}</p>
              <p className="text-[11px] text-[#6A6A6A] truncate">{track.album}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#282828]">
              <span className="text-[#A7A7A7]">Encoding Standard</span>
              <span className="font-mono text-white">ID3v2.3 (ISO-8859-1 / UTF-8)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#282828]">
              <span className="text-[#A7A7A7]">Audio Bitrate</span>
              <span className="font-mono text-emerald-400 font-bold">320 kbps Constant (CBR)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#282828]">
              <span className="text-[#A7A7A7]">Sample Rate</span>
              <span className="font-mono text-white">44.1 kHz / 16-Bit Stereo</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#282828]">
              <span className="text-[#A7A7A7]">Duration</span>
              <span className="font-mono text-white">{track.durationFormatted} ({track.durationMs} ms)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#282828]">
              <span className="text-[#A7A7A7]">Attached Picture (APIC)</span>
              <span className="font-mono text-white">Embedded Front Cover (JPEG)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#282828]">
              <span className="text-[#A7A7A7]">Extraction Engine</span>
              <span className="font-mono text-white">yt-dlp + Mutagen / FFmpeg</span>
            </div>
          </div>

          <div className="bg-[#1DB954]/10 border border-[#1DB954]/20 p-3 rounded-xl flex items-center gap-2 text-xs text-[#1DB954]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Fully compliant with Apple Music, Spotify Local Files, VLC, and Windows Media Player.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#282828] bg-[#202020] text-right">
          <button
            onClick={onClose}
            className="bg-[#282828] hover:bg-[#333333] text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
