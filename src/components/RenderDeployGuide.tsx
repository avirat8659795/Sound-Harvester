import React, { useState } from 'react';
import { X, Server, Terminal, CheckCircle2, Copy, Check, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';

interface RenderDeployGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RenderDeployGuide: React.FC<RenderDeployGuideProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#141414] border border-[#282828] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#282828] bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Deploying Sound Harvester to Render
              </h3>
              <p className="text-xs text-[#A7A7A7]">
                Complete DevOps walkthrough for deploying the Dockerized Python Flask backend.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#A7A7A7] hover:text-white bg-[#222222] hover:bg-[#2c2c2c] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Guide Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-[#CCCCCC]">
          {/* Step 1 */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1DB954] text-black font-extrabold flex items-center justify-center text-xs">
                  1
                </span>
                Initialize Git Repository & Commit Files
              </h4>
            </div>
            <p className="text-xs text-[#A7A7A7] mb-3">
              Create a local directory named <code className="text-[#1DB954]">soundharvest</code>, copy all files from the Project Files inspector, and commit them.
            </p>
            <div className="relative bg-[#101010] p-3 rounded-lg border border-[#242424] font-mono text-xs text-[#1DB954]">
              <pre>{`mkdir soundharvest && cd soundharvest
# (Extract or paste app.py, Dockerfile, requirements.txt, templates/, static/)
git init
git add .
git commit -m "feat: initial SoundHarvest Spotify MP3 downloader release"
git branch -M main`}</pre>
              <button
                onClick={() =>
                  copyCode(
                    `mkdir soundharvest && cd soundharvest\ngit init\ngit add .\ngit commit -m "feat: initial SoundHarvest Spotify MP3 downloader release"\ngit branch -M main`,
                    1
                  )
                }
                className="absolute top-2.5 right-2.5 bg-[#222222] hover:bg-[#333333] text-white p-1.5 rounded text-xs flex items-center gap-1 cursor-pointer"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-[#1DB954]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1DB954] text-black font-extrabold flex items-center justify-center text-xs">
                  2
                </span>
                Push to GitHub
              </h4>
            </div>
            <p className="text-xs text-[#A7A7A7] mb-3">
              Create a new repository on GitHub (e.g. <code className="text-white">soundharvest</code>) and push your local branch.
            </p>
            <div className="relative bg-[#101010] p-3 rounded-lg border border-[#242424] font-mono text-xs text-white">
              <pre>{`git remote add origin https://github.com/YOUR_GITHUB_USERNAME/soundharvest.git
git push -u origin main`}</pre>
              <button
                onClick={() =>
                  copyCode(
                    `git remote add origin https://github.com/YOUR_GITHUB_USERNAME/soundharvest.git\ngit push -u origin main`,
                    2
                  )
                }
                className="absolute top-2.5 right-2.5 bg-[#222222] hover:bg-[#333333] text-white p-1.5 rounded text-xs flex items-center gap-1 cursor-pointer"
              >
                {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-[#1DB954]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1DB954] text-black font-extrabold flex items-center justify-center text-xs">
                  3
                </span>
                Configure Web Service on Render
              </h4>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-xs text-[#B3B3B3] leading-relaxed">
              <li>Log in to your dashboard on <strong className="text-white">dashboard.render.com</strong>.</li>
              <li>Click <strong className="text-white">New +</strong> &rarr; Select <strong className="text-white">Web Service</strong>.</li>
              <li>Select and connect your <code className="text-[#1DB954]">soundharvest</code> GitHub repository.</li>
              <li>Render will automatically detect the <code className="text-[#1DB954]">Dockerfile</code>. Verify:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-[#A7A7A7]">
                  <li><span className="text-white">Runtime:</span> Docker</li>
                  <li><span className="text-white">Region:</span> Oregon (US West) or closest to your users</li>
                  <li><span className="text-white">Instance Type:</span> Free / Starter</li>
                </ul>
              </li>
            </ol>
          </div>

          {/* Step 4 */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1DB954] text-black font-extrabold flex items-center justify-center text-xs">
                  4
                </span>
                Environment Variables (Optional & Recommended)
              </h4>
            </div>
            <p className="text-xs text-[#A7A7A7] mb-3">
              SoundHarvest includes a built-in scraper/oEmbed fallback, but you can configure Spotify Developer credentials for full API access:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#121212] p-3 rounded-lg border border-[#282828]">
                <p className="font-mono text-emerald-400 font-bold mb-1">SPOTIPY_CLIENT_ID</p>
                <p className="text-[#6A6A6A]">Your Spotify Developer Client ID (from developer.spotify.com)</p>
              </div>
              <div className="bg-[#121212] p-3 rounded-lg border border-[#282828]">
                <p className="font-mono text-emerald-400 font-bold mb-1">SPOTIPY_CLIENT_SECRET</p>
                <p className="text-[#6A6A6A]">Your Spotify Developer Client Secret token</p>
              </div>
            </div>
          </div>

          {/* Architecture Highlights */}
          <div className="bg-gradient-to-r from-[#181818] to-[#1e1e1e] border border-[#282828] rounded-xl p-5">
            <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1DB954]" />
              Production Architecture Highlights
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#A7A7A7]">
              <div>
                <strong className="text-white block mb-0.5">FFmpeg In Docker</strong>
                Pre-configured in Dockerfile to automatically transcode audio streams into high-fidelity MP3.
              </div>
              <div>
                <strong className="text-white block mb-0.5">Mutagen ID3 Tagging</strong>
                Embeds song title, artist, album, track number, and album artwork into MP3 frames.
              </div>
              <div>
                <strong className="text-white block mb-0.5">Auto-Cleanup</strong>
                Temporary MP3s and ZIP files in <code className="text-[#1DB954]">/tmp</code> are deleted immediately after download stream completes.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#282828] bg-[#181818] flex items-center justify-between">
          <span className="text-xs text-[#6A6A6A]">
            SoundHarvest • Tested on Python 3.10-slim + Render Docker Runtime
          </span>
          <button
            onClick={onClose}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer"
          >
            Got It, Back to App
          </button>
        </div>
      </div>
    </div>
  );
};
