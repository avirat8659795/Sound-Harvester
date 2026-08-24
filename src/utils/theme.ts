export interface ThemeOption {
  id: string;
  name: string;
  primary: string;
  hover: string;
  rgb: string;
}

export const THEME_PRESETS: ThemeOption[] = [
  {
    id: 'spotify-green',
    name: 'Spotify Green',
    primary: '#1DB954',
    hover: '#1ed760',
    rgb: '29, 185, 84'
  },
  {
    id: 'electric-cyan',
    name: 'Electric Cyan',
    primary: '#00F2FE',
    hover: '#38BDF8',
    rgb: '0, 242, 254'
  },
  {
    id: 'ultra-violet',
    name: 'Ultra Violet',
    primary: '#A855F7',
    hover: '#C084FC',
    rgb: '168, 85, 247'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    primary: '#F97316',
    hover: '#FB923C',
    rgb: '249, 115, 22'
  },
  {
    id: 'neon-ruby',
    name: 'Neon Ruby',
    primary: '#EF4444',
    hover: '#F87171',
    rgb: '239, 68, 68'
  },
  {
    id: 'hot-magenta',
    name: 'Hot Magenta',
    primary: '#EC4899',
    hover: '#F472B6',
    rgb: '236, 72, 153'
  },
  {
    id: 'acoustic-gold',
    name: 'Acoustic Gold',
    primary: '#EAB308',
    hover: '#FACC15',
    rgb: '234, 179, 8'
  },
  {
    id: 'arctic-sky',
    name: 'Arctic Sky',
    primary: '#38BDF8',
    hover: '#7DD3FC',
    rgb: '56, 189, 248'
  },
  {
    id: 'lime-pulse',
    name: 'Lime Pulse',
    primary: '#84CC16',
    hover: '#A3E635',
    rgb: '132, 204, 22'
  }
];

export interface AppSettings {
  themeColor: string;
  themeId: string;
  isSearchBarVisible: boolean;
  autoPlayNext: boolean;
  soundEffects: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeColor: '#1DB954',
  themeId: 'spotify-green',
  isSearchBarVisible: true,
  autoPlayNext: true,
  soundEffects: true
};

export const STORAGE_KEY_SETTINGS = 'soundharvester_app_settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error loading settings from localStorage:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    const safePayload = {
      themeColor: String(settings.themeColor || '#1DB954'),
      themeId: String(settings.themeId || 'spotify-green'),
      isSearchBarVisible: Boolean(settings.isSearchBarVisible),
      autoPlayNext: Boolean(settings.autoPlayNext),
      soundEffects: Boolean(settings.soundEffects)
    };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(safePayload));
    applyThemeToDocument(safePayload.themeColor);
  } catch (e) {
    console.error('Error saving settings to localStorage:', e);
  }
}

export function hexToRgb(hex: string): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  if (c.length !== 6) return '29, 185, 84';
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

export function applyThemeToDocument(hexColor: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const rgb = hexToRgb(hexColor);
  
  root.style.setProperty('--accent-color', hexColor);
  root.style.setProperty('--accent-rgb', rgb);
  root.style.setProperty('--accent-glow', `rgba(${rgb}, 0.45)`);
  root.style.setProperty('--accent-glow-subtle', `rgba(${rgb}, 0.18)`);
}
