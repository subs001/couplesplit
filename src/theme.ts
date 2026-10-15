export type AppThemeId = 
  | 'emerald-light' 
  | 'pink-light'
  | 'teal-light'
  | 'lavender-light'
  | 'peach-light'
  | 'midnight-dark' 
  | 'indigo-night' 
  | 'forest-dark' 
  | 'amethyst-dark' 
  | 'sunset-warm';

export interface ThemeConfig {
  id: AppThemeId;
  name: string;
  tagline: string;
  mode: 'light' | 'dark';
  metaThemeColor: string;
  swatch: {
    bg: string;
    card: string;
    accent: string;
    border: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'emerald-light',
    name: 'Emerald Clean',
    tagline: 'Default crisp mint & emerald light theme',
    mode: 'light',
    metaThemeColor: '#10b981',
    swatch: {
      bg: '#f8fafc',
      card: '#ffffff',
      accent: '#10b981',
      border: '#e2e8f0',
    },
  },
  {
    id: 'pink-light',
    name: 'Rose Blush',
    tagline: 'Soft rose petal, pastel blush & pink light theme',
    mode: 'light',
    metaThemeColor: '#ec4899',
    swatch: {
      bg: '#fff1f4',
      card: '#ffffff',
      accent: '#ec4899',
      border: '#fbcfe8',
    },
  },
  {
    id: 'teal-light',
    name: 'Ocean Teal',
    tagline: 'Crisp seafoam, turquoise & cool cyan light theme',
    mode: 'light',
    metaThemeColor: '#0d9488',
    swatch: {
      bg: '#f0fdfa',
      card: '#ffffff',
      accent: '#0d9488',
      border: '#99f6e4',
    },
  },
  {
    id: 'lavender-light',
    name: 'Pastel Lavender',
    tagline: 'Lilac blossom, gentle lavender & calm purple daylight',
    mode: 'light',
    metaThemeColor: '#8b5cf6',
    swatch: {
      bg: '#faf5ff',
      card: '#ffffff',
      accent: '#8b5cf6',
      border: '#e9d5ff',
    },
  },
  {
    id: 'peach-light',
    name: 'Peach Blossom',
    tagline: 'Warm golden apricot & soft amber sunlit glow',
    mode: 'light',
    metaThemeColor: '#ea580c',
    swatch: {
      bg: '#fff7ed',
      card: '#ffffff',
      accent: '#ea580c',
      border: '#fed7aa',
    },
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    tagline: 'True dark mode with deep slate & vibrant emerald',
    mode: 'dark',
    metaThemeColor: '#090d16',
    swatch: {
      bg: '#090d16',
      card: '#111827',
      accent: '#10b981',
      border: '#283548',
    },
  },
  {
    id: 'indigo-night',
    name: 'Indigo Sapphire',
    tagline: 'Royal navy night with brilliant cobalt and sky accents',
    mode: 'dark',
    metaThemeColor: '#070a14',
    swatch: {
      bg: '#070a14',
      card: '#10162a',
      accent: '#6366f1',
      border: '#273663',
    },
  },
  {
    id: 'forest-dark',
    name: 'Forest Canopy',
    tagline: 'Deep pine woods & soothing herbal mint accents',
    mode: 'dark',
    metaThemeColor: '#06110a',
    swatch: {
      bg: '#06110a',
      card: '#0c1f14',
      accent: '#22c55e',
      border: '#1e4530',
    },
  },
  {
    id: 'amethyst-dark',
    name: 'Royal Amethyst',
    tagline: 'Deep velvet violet dark theme with radiant purple',
    mode: 'dark',
    metaThemeColor: '#0b0714',
    swatch: {
      bg: '#0b0714',
      card: '#150f26',
      accent: '#a855f7',
      border: '#3c2a63',
    },
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Terracotta',
    tagline: 'Warm amber glow with cozy dark espresso tones',
    mode: 'dark',
    metaThemeColor: '#160e0c',
    swatch: {
      bg: '#160e0c',
      card: '#221614',
      accent: '#f97316',
      border: '#4d312b',
    },
  },
];

const STORAGE_KEY = 'couplesplit_app_theme';

export function getSavedTheme(): AppThemeId {
  if (typeof window === 'undefined') return 'emerald-light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as AppThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
  }
  return 'emerald-light';
}

export function applyTheme(themeId: AppThemeId): void {
  if (typeof document === 'undefined') return;
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  // Set data-theme attribute on root and body
  document.documentElement.setAttribute('data-theme', theme.id);
  if (document.body) {
    document.body.setAttribute('data-theme', theme.id);
    document.body.style.backgroundColor = theme.swatch.bg;
  }

  // Set / remove .dark and .light classes for compatibility
  if (theme.mode === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    if (document.body) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    if (document.body) {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
  }

  // Update meta theme-color tag for mobile browsers and PWA status bar
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', theme.metaThemeColor);

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
  } catch (e) {
    console.warn('Failed to save theme to localStorage:', e);
  }
}
