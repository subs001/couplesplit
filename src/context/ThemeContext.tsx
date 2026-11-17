import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  isSakura: boolean;
  isPastel: boolean;
  chartColors: {
    primary: string;
    secondary: string;
    accent1: string;
    accent2: string;
    accent3: string;
    accent4: string;
    accent5: string;
    text: string;
    grid: string;
    tooltipBg: string;
    tooltipBorder: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('duospend_theme');
    if (saved === 'dark' || saved === 'sakura' || saved === 'pastel' || saved === 'light') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('duospend_theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Chart color palette tailored for each theme
  const chartColors = {
    light: {
      primary: '#4F46E5', // Indigo
      secondary: '#0D9488', // Teal
      accent1: '#F59E0B', // Amber
      accent2: '#EC4899', // Pink
      accent3: '#8B5CF6', // Purple
      accent4: '#10B981', // Emerald
      accent5: '#06B6D4', // Cyan
      text: '#475569',
      grid: '#E2E8F0',
      tooltipBg: '#FFFFFF',
      tooltipBorder: '#CBD5E1',
    },
    dark: {
      primary: '#6366F1',
      secondary: '#14B8A6',
      accent1: '#FBBF24',
      accent2: '#F472B6',
      accent3: '#A78BFA',
      accent4: '#34D399',
      accent5: '#38BDF8',
      text: '#94A3B8',
      grid: '#334155',
      tooltipBg: '#1E293B',
      tooltipBorder: '#475569',
    },
    sakura: {
      primary: '#E11D48', // Rose 600
      secondary: '#BE185D', // Pink 700
      accent1: '#FB7185', // Rose 400
      accent2: '#F43F5E', // Rose 500
      accent3: '#D97706', // Warm Amber
      accent4: '#059669', // Emerald
      accent5: '#9333EA', // Purple
      text: '#78350F',
      grid: '#FFE4E6',
      tooltipBg: '#FFF1F2',
      tooltipBorder: '#FECDD3',
    },
    pastel: {
      primary: '#6C8EEF', // Pastel Cornflower Blue
      secondary: '#56B8A6', // Pastel Mint Teal
      accent1: '#F2B863', // Pastel Honey Apricot
      accent2: '#E38BA3', // Pastel Dusty Rose
      accent3: '#A18BE6', // Pastel Lavender
      accent4: '#76C48D', // Pastel Sage Green
      accent5: '#6DBCE0', // Pastel Sky Blue
      text: '#5A687A',
      grid: '#E2E8F0',
      tooltipBg: '#FFFFFF',
      tooltipBorder: '#D9E1EC',
    },
  }[theme];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark: theme === 'dark',
        isSakura: theme === 'sakura',
        isPastel: theme === 'pastel',
        chartColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
