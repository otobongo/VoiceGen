import { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play } from 'lucide-react';
import { Button } from './Button';
import { Waveform } from './Waveform';
import { downloadBlob } from '@/lib/audio';
import type { Take } from '@/lib/types';

interface AudioPlayerProps {
  take: Take;
  speed: number;
  /**
   * Returns a speed-baked WAV blob for download, or null on failure (in which
   * case it has already surfaced an error banner via the studio).
   */
  onExport: (takeId: string, speed: number) => Blob | null;
  /** Report a download failure (browser blocked the save) by error code. */
  onError?: (code: string) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ take, speed, onExport, onError }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  // New take: reset transport and reflect current speed.
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrent(0);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) el.pause();
    else void el.play();
  };

  const seek = (fraction: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = fraction * el.duration;
    setProgress(fraction);
  };

  const download = () => {
    // onExport returns null AND shows a banner on encode/missing-audio failure.
    const blob = onExport(take.id, speed);
    if (!blob) return;
    const ok = downloadBlob(blob, `voicegen-${take.voice.toLowerCase()}-${take.scope}.wav`);
    if (!ok) onError?.('DOWNLOAD_FAILED');
  };

  // The displayed duration accounts for the speed the file will play at.
  const effectiveDuration = duration / speed;
  const effectiveCurrent = current / speed;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm animate-slide-up">
      <audio
        ref={audioRef}
        src={take.audioUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrent(el.currentTime);
          if (Number.isFinite(el.duration) && el.duration > 0) {
            setProgress(el.currentTime / el.duration);
          }
        }}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <span className="label-micro">
          {take.scope === 'full' ? 'Full master' : 'Preview'} · {take.voice}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatTime(effectiveCurrent)} / {formatTime(effectiveDuration)}
        </span>
      </div>

      <Waveform url={take.audioUrl} progress={progress} onSeek={seek} />

      <div className="flex items-center gap-2">
        <Button
          onClick={toggle}
          size="md"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-11 px-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </Button>
        <Button onClick={download} variant="secondary" size="md" className="flex-1">
          <Download className="h-4 w-4" />
          Download WAV
        </Button>
      </div>
    </div>
  );
}
