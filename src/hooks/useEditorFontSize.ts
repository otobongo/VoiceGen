import { useCallback, useEffect, useState } from 'react';

// Editor font size in px. Persisted so the choice sticks:
//  - to the active user / browser via localStorage (survives reloads & revisits)
//  - for the whole session via React state, even if storage is unavailable
//    (private mode, blocked cookies) — reads/writes are guarded so it never throws.
// Shared by the Prepare and Preview editors (the hook is created once in Studio).
const STORAGE_KEY = 'voicegen-editor-font';
const MIN = 14;
const MAX = 28;
const DEFAULT = 18;
const STEP = 2;

function clamp(n: number): number {
  return Math.min(MAX, Math.max(MIN, n));
}

function readStored(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : null;
  } catch {
    // Storage blocked/unavailable — fall back to the in-memory default.
    return null;
  }
}

function writeStored(value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Storage blocked — the React state below still persists for the session.
  }
}

function getInitial(): number {
  return readStored() ?? DEFAULT;
}

export function useEditorFontSize() {
  const [size, setSize] = useState<number>(getInitial);

  // Persist on every change (no-op if storage is unavailable).
  useEffect(() => {
    writeStored(size);
  }, [size]);

  const increase = useCallback(() => setSize((s) => clamp(s + STEP)), []);
  const decrease = useCallback(() => setSize((s) => clamp(s - STEP)), []);
  const reset = useCallback(() => setSize(DEFAULT), []);

  return {
    size,
    increase,
    decrease,
    reset,
    canIncrease: size < MAX,
    canDecrease: size > MIN,
    isDefault: size === DEFAULT,
  };
}

export type EditorFontSize = ReturnType<typeof useEditorFontSize>;
