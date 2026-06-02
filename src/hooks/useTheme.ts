import { useCallback, useEffect, useState } from 'react';
import type { ThemeMode } from '@/lib/types';

// Two independent axes:
//  - mode: light | dark  (applied via the `dark` class on <html>)
//  - skin: cal | shadcn  (applied via data-skin on <html>; cal is default)
// Both persist to localStorage so the choice follows the active user/browser.

export type ThemeSkin = 'cal' | 'shadcn';

const MODE_KEY = 'voicegen-theme';
const SKIN_KEY = 'voicegen-skin';

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage blocked */
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getInitialSkin(): ThemeSkin {
  if (typeof window === 'undefined') return 'cal';
  try {
    const stored = localStorage.getItem(SKIN_KEY);
    if (stored === 'cal' || stored === 'shadcn') return stored;
  } catch {
    /* storage blocked */
  }
  return 'cal';
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [skin, setSkin] = useState<ThemeSkin>(getInitialSkin);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode;
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* storage blocked */
    }
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    // 'cal' is the default skin (no attribute); 'shadcn' opts in.
    if (skin === 'shadcn') root.setAttribute('data-skin', 'shadcn');
    else root.removeAttribute('data-skin');
    try {
      localStorage.setItem(SKIN_KEY, skin);
    } catch {
      /* storage blocked */
    }
  }, [skin]);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  return { mode, isDark: mode === 'dark', toggle, skin, setSkin };
}
