import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  Radio,
  Bell,
  Lock,
  Headphones,
  Info,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor?: string;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  themeColor = '#1DB954'
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'webapk' | 'ios'>('android');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    try {
      // Detect if already running in standalone mode (PWA installed)
      const isStandalone =
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (typeof window !== 'undefined' && (window.navigator as any)?.standalone === true);
      if (isStandalone) {
        setIsInstalled(true);
      }
    } catch {
      // ignore
    }

    // Auto-detect OS
    const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '').toLowerCase() : '';
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }

    // Capture PWA beforeinstallprompt event
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleCopyLink = () => {
    const textToCopy = typeof window !== 'undefined' ? window.location.origin : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    } else if (typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.value = textToCopy;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      } catch {
        // ignore
      }
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#181818] border border-[#2e2e2e] w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative text-white my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white bg-[#242424] hover:bg-[#303030] transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{
              backgroundColor: themeColor,
              boxShadow: `0 0 20px ${themeColor}55`
            }}
          >
            <Smartphone className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Install Android App / PWA
              <span
                className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${themeColor}22`,
                  color: themeColor,
                  borderColor: `${themeColor}44`
                }}
              >
                WebAPK
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Lock-screen notification controls & seamless background music on your phone
            </p>
          </div>
        </div>

        {/* Feature Benefits Pills */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 bg-[#202020] border border-[#2c2c2c] p-2.5 rounded-xl text-xs">
            <Lock className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
            <span className="text-gray-200 font-medium">Screen-Off Playback</span>
          </div>
          <div className="flex items-center gap-2 bg-[#202020] border border-[#2c2c2c] p-2.5 rounded-xl text-xs">
            <Bell className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
            <span className="text-gray-200 font-medium">Notification Controls</span>
          </div>
          <div className="flex items-center gap-2 bg-[#202020] border border-[#2c2c2c] p-2.5 rounded-xl text-xs">
            <Headphones className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
            <span className="text-gray-200 font-medium">Headset & Bluetooth</span>
          </div>
          <div className="flex items-center gap-2 bg-[#202020] border border-[#2c2c2c] p-2.5 rounded-xl text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
            <span className="text-gray-200 font-medium">Official WebAPK Sign</span>
          </div>
        </div>

        {/* Native 1-Tap Install Button (if Chrome prompt ready) */}
        {deferredPrompt && (
          <div className="mb-4">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 rounded-2xl text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all cursor-pointer animate-pulse"
              style={{
                backgroundColor: themeColor,
                boxShadow: `0 4px 20px ${themeColor}66`
              }}
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
              Tap to Install SoundHarvest on Android
            </button>
          </div>
        )}

        {isInstalled && (
          <div className="mb-4 p-3 rounded-2xl bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1DB954] shrink-0" />
            <span className="text-xs text-gray-200 font-medium">
              SoundHarvest is running in standalone app mode! Background audio and lock screen controls are fully active.
            </span>
          </div>
        )}

        {/* OS Platform Tabs */}
        <div className="flex rounded-xl bg-[#121212] p-1 border border-[#262626] mb-4">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'android'
                ? 'bg-[#282828] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Android (Instant 1-Click)
          </button>
          <button
            onClick={() => setActiveTab('webapk')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'webapk'
                ? 'bg-[#282828] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Package into .APK
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ios'
                ? 'bg-[#282828] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            iPhone (Safari)
          </button>
        </div>

        {/* Instructions Content */}
        {activeTab === 'android' ? (
          <div className="space-y-3 bg-[#1e1e1e] p-4 rounded-2xl border border-[#2a2a2a] text-xs">
            <div className="font-bold text-gray-200 text-sm flex items-center justify-between mb-1">
              <span>Android WebAPK Installation:</span>
              <button
                onClick={handleCopyLink}
                className="text-[11px] font-semibold text-gray-400 hover:text-white flex items-center gap-1 bg-[#282828] px-2 py-1 rounded-md"
              >
                {copiedLink ? <Check className="w-3 h-3 text-[#1DB954]" /> : <Share className="w-3 h-3" />}
                {copiedLink ? 'Copied' : 'Copy URL for Phone'}
              </button>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shrink-0 text-xs mt-0.5"
                style={{ backgroundColor: themeColor }}
              >
                1
              </div>
              <p className="text-gray-300 leading-relaxed">
                Open this app link in <strong>Google Chrome</strong> or <strong>Brave</strong> on your phone.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shrink-0 text-xs mt-0.5"
                style={{ backgroundColor: themeColor }}
              >
                2
              </div>
              <p className="text-gray-300 leading-relaxed">
                Tap Chrome's <strong>three dots (⋮)</strong> in the top-right corner.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shrink-0 text-xs mt-0.5"
                style={{ backgroundColor: themeColor }}
              >
                3
              </div>
              <p className="text-gray-300 leading-relaxed">
                Tap <strong>"Install app"</strong> (or <em>"Add to Home screen"</em>) and click <strong>Install</strong>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shrink-0 text-xs mt-0.5"
                style={{ backgroundColor: themeColor }}
              >
                4
              </div>
              <p className="text-gray-300 leading-relaxed">
                Android automatically mints a signed <strong>WebAPK</strong> onto your app drawer. You get real lock screen controls, notification playback bar, and uninterrupted music playback when locked!
              </p>
            </div>
          </div>
        ) : activeTab === 'webapk' ? (
          <div className="space-y-3 bg-[#1e1e1e] p-4 rounded-2xl border border-[#2a2a2a] text-xs">
            <div className="font-bold text-gray-200 text-sm mb-1">
              Building a standalone Android .APK package:
            </div>
            <p className="text-gray-300 leading-relaxed">
              Standard zip code files contain web assets (HTML/JS/TS) and cannot simply have their extension renamed to <code>.apk</code> because Android packages require compiled DEX binaries and signed Android manifests.
            </p>
            <div className="bg-[#141414] p-3 rounded-xl border border-[#262626] space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" style={{ color: themeColor }} />
                <span>Instant 1-Step APK Generator (PWABuilder / Capacitor):</span>
              </div>
              <p className="text-gray-400">
                1. Copy your app URL: <code className="text-gray-200 bg-[#222] px-1.5 py-0.5 rounded">{window.location.origin}</code>
              </p>
              <p className="text-gray-400">
                2. Visit <a href="https://www.pwabuilder.com" target="_blank" rel="noopener noreferrer" className="text-[#1DB954] underline inline-flex items-center gap-1">PWABuilder.com <ExternalLink className="w-3 h-3" /></a> and paste the link.
              </p>
              <p className="text-gray-400">
                3. Click <strong>"Package for Android"</strong> to instantly download a ready-to-install <code>.apk</code> package for your device!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-[#1e1e1e] p-4 rounded-2xl border border-[#2a2a2a] text-xs">
            <div className="font-bold text-gray-200 text-sm flex items-center gap-2 mb-1">
              <span>iPhone & iPad Setup:</span>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shrink-0 text-xs mt-0.5"
                style={{ backgroundColor: themeColor }}
              >
                1
              </div>
              <p className="text-gray-300 leading-relaxed">
                Open this website in <strong>Safari</strong> on your iPhone or iPad.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shrink-0 text-xs mt-0.5"
                style={{ backgroundColor: themeColor }}
              >
                2
              </div>
              <p className="text-gray-300 leading-relaxed flex items-center gap-1.5 flex-wrap">
                Tap the <strong>Share button</strong> <Share className="w-3.5 h-3.5 inline text-blue-400" /> at the bottom of Safari.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shrink-0 text-xs mt-0.5"
                style={{ backgroundColor: themeColor }}
              >
                3
              </div>
              <p className="text-gray-300 leading-relaxed flex items-center gap-1.5 flex-wrap">
                Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-gray-300" />.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shrink-0 text-xs mt-0.5"
                style={{ backgroundColor: themeColor }}
              >
                4
              </div>
              <p className="text-gray-300 leading-relaxed">
                Tap <strong>Add</strong>. Open the icon from your home screen for full standalone audio with Dynamic Island & Lock Screen controls!
              </p>
            </div>
          </div>
        )}

        {/* Note info */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-400 bg-[#121212] p-3 rounded-xl border border-[#252525]">
          <Info className="w-4 h-4 shrink-0 text-gray-400" />
          <span>
            Android WebAPK automatically hooks into your phone's native media manager (MediaSession API) just like Spotify.
          </span>
        </div>
      </div>
    </div>
  );
};
