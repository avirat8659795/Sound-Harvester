import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Error Boundary to prevent white/black screen crashes on mobile
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SoundHarvest Root Error Caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center mb-4">
            <span className="text-2xl font-black text-[#1DB954]">H</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Sound Harvester</h2>
          <p className="text-sm text-gray-400 max-w-sm mb-6">
            Something went wrong while loading the interface. Tap below to reload.
          </p>
          <button
            onClick={() => {
              if ('caches' in window) {
                caches.keys().then((names) => {
                  names.forEach((name) => caches.delete(name));
                });
              }
              window.location.reload();
            }}
            className="bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 text-black font-bold px-6 py-3 rounded-full text-sm transition-all"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Service Worker Registration for PWA / Mobile Background Audio (Production Only)
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.debug('ServiceWorker registration note:', err);
        });
    });
  } else {
    // In dev mode, unregister any stale workers to prevent blocking module imports on mobile
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
}

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </StrictMode>
    );
  }
} catch (err) {
  console.error('Fatal initialization error:', err);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background-color: #121212; color: #ffffff; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; font-family: sans-serif;">
        <div style="width: 56px; height: 56px; border-radius: 16px; background: rgba(29, 185, 84, 0.2); border: 1px solid rgba(29, 185, 84, 0.4); display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 900; color: #1DB954;">H</span>
        </div>
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">Sound Harvester</h2>
        <p style="font-size: 14px; color: #a0a0a0; max-width: 320px; margin-bottom: 24px;">
          Failed to initialize interface. Tap below to reload.
        </p>
        <button onclick="window.location.reload(true)" style="background: #1DB954; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 9999px; border: none; font-size: 14px; cursor: pointer;">
          Reload App
        </button>
      </div>
    `;
  }
}


