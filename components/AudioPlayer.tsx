
import React, { useRef, useState, useEffect } from 'react';
import { Download, Play, Pause, RefreshCw, CheckCircle2, Square, Activity, Edit3 } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  isLoading: boolean;
  onAction: () => void;
  actionLabel: string;
  hasText: boolean;
  speed: number;
  disabled: boolean;
  isMaster?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioUrl, isLoading, onAction, actionLabel, hasText, speed, disabled, isMaster
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Update playback rate when speed changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [audioUrl, speed]);

  // Auto-play for Preview mode (when not Master)
  useEffect(() => {
    if (audioUrl && audioRef.current && !isMaster) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Auto-play prevented:", error);
          setIsPlaying(false);
        });
      }
    }
  }, [audioUrl, isMaster]);

  const handleMainClick = () => {
    if (audioUrl) {
      // Toggle Play/Stop if audio exists
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
    } else {
      // Generate audio if it doesn't exist
      onAction();
    }
  };

  return (
    <div className="w-full space-y-4">
      <audio 
        ref={audioRef} 
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        onEnded={() => setIsPlaying(false)} 
        className="hidden" 
        src={audioUrl || undefined} 
      />
      
      <div className="relative">
        <button
          onClick={handleMainClick} 
          disabled={isLoading || !hasText || disabled}
          aria-live="polite"
          className={`w-full py-3.5 rounded-md text-[11px] font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-3 active:scale-[0.98] border ${
            isMaster
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 shadow-sm' 
              : (audioUrl && isPlaying)
                ? 'bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20 hover:border-destructive shadow-sm'
                : (audioUrl && !isPlaying)
                ? 'bg-[var(--color-accent-primary-subtle)] border-[var(--color-accent-primary)]/50 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-subtle)] hover:border-[var(--color-accent-primary)] shadow-sm'
                  : 'bg-card border-border text-foreground hover:bg-accent/50 shadow-sm'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : isMaster ? (
            <><CheckCircle2 className="w-4 h-4" /> {actionLabel}</>
          ) : (audioUrl && isPlaying) ? (
            <><Square className="w-4 h-4 fill-current" /> Stop Preview</>
          ) : (audioUrl && !isPlaying) ? (
            <><Play className="w-4 h-4 fill-current" /> Replay Preview</>
          ) : (
            <><Edit3 className="w-4 h-4" /> {actionLabel}</>
          )}
        </button>
      </div>

      {/* Only show standard player controls + Download for Master Mode */}
      {isMaster && audioUrl && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
          <button 
            onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="p-4 rounded-sm border border-border bg-card hover:bg-accent hover:border-[var(--color-accent-primary)]/50 transition-all text-[var(--color-accent-primary)]"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <a 
            href={audioUrl} download="voice-master.wav"
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-sm border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-mono font-bold uppercase tracking-widest transition-all text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50"
          >
            <Download className="w-4 h-4" /> Download Master
          </a>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
