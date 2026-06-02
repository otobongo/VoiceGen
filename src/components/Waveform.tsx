import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface WaveformProps {
  /** Blob URL of the audio to visualize. */
  url: string;
  /** 0..1 playback progress for the filled portion. */
  progress: number;
  /** Seek callback with a 0..1 fraction. */
  onSeek: (fraction: number) => void;
  bars?: number;
}

// Decode an audio URL into N normalized peak values (0..1) for bar rendering.
async function extractPeaks(url: string, bars: number): Promise<number[]> {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new Ctx();
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const audio = await ctx.decodeAudioData(buf);
    const data = audio.getChannelData(0);
    const block = Math.floor(data.length / bars) || 1;
    const peaks: number[] = [];
    let max = 0;
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const start = i * block;
      for (let j = 0; j < block; j++) {
        const v = Math.abs(data[start + j] ?? 0);
        if (v > peak) peak = v;
      }
      peaks.push(peak);
      if (peak > max) max = peak;
    }
    // Normalize so the loudest bar is full height.
    return peaks.map((p) => (max > 0 ? p / max : 0));
  } finally {
    void ctx.close();
  }
}

export function Waveform({ url, progress, onSeek, bars = 56 }: WaveformProps) {
  const [peaks, setPeaks] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setPeaks([]);
    extractPeaks(url, bars)
      .then((p) => {
        if (!cancelled) setPeaks(p);
      })
      .catch(() => {
        // Fallback: flat-ish placeholder bars if decode fails.
        if (!cancelled) setPeaks(Array.from({ length: bars }, () => 0.3));
      });
    return () => {
      cancelled = true;
    };
  }, [url, bars]);

  const display = useMemo(
    () => (peaks.length ? peaks : Array.from({ length: bars }, () => 0.15)),
    [peaks, bars],
  );

  const seekFromEvent = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(fraction);
  };

  return (
    <div
      ref={containerRef}
      onClick={(e) => seekFromEvent(e.clientX)}
      className="flex h-14 w-full cursor-pointer items-center gap-[2px]"
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.05));
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.05));
      }}
    >
      {display.map((p, i) => {
        const filled = i / display.length < progress;
        return (
          <span
            key={i}
            className={cn(
              'flex-1 rounded-full transition-colors',
              filled ? 'bg-foreground' : 'bg-border-strong',
            )}
            style={{ height: `${Math.max(8, p * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
