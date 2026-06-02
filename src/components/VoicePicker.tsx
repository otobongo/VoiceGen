import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mars, Pause, Play, Venus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { generateSpeech, ApiError } from '@/lib/api';
import { decodeGeminiAudio } from '@/lib/audio';
import { VOICE_OPTIONS, type PersonaType, type VoiceName } from '@/lib/types';

interface VoicePickerProps {
  selected: VoiceName;
  persona: PersonaType;
  onSelect: (voice: VoiceName) => void;
  onError: (code: string) => void;
}

// Short, fixed line so auditions are instant, consistent, and cheap — they tell
// you what a VOICE sounds like, independent of your actual script.
const AUDITION_LINE = 'Hi, this is how I sound. Ready when you are.';

export function VoicePicker({ selected, persona, onSelect, onError }: VoicePickerProps) {
  const [loadingVoice, setLoadingVoice] = useState<VoiceName | null>(null);
  const [playingVoice, setPlayingVoice] = useState<VoiceName | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<VoiceName, string>>(new Map());

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      audioRef.current?.pause();
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  // Auditions depend on persona; clear the cache when it changes.
  useEffect(() => {
    const cache = cacheRef.current;
    for (const url of cache.values()) URL.revokeObjectURL(url);
    cache.clear();
  }, [persona]);

  const stop = () => {
    audioRef.current?.pause();
    setPlayingVoice(null);
  };

  const audition = async (voice: VoiceName) => {
    if (playingVoice === voice) {
      stop();
      return;
    }
    audioRef.current?.pause();
    try {
      let url = cacheRef.current.get(voice);
      if (!url) {
        setLoadingVoice(voice);
        const res = await generateSpeech({
          text: AUDITION_LINE,
          voice,
          persona,
          scope: 'preview',
        });
        url = decodeGeminiAudio(res.audioChunks, res.sampleRate).url;
        cacheRef.current.set(voice, url);
      }
      const audio = new Audio(url);
      audio.onended = () => setPlayingVoice(null);
      audioRef.current = audio;
      await audio.play();
      setPlayingVoice(voice);
    } catch (err) {
      onError(err instanceof ApiError ? err.code : 'UNKNOWN');
    } finally {
      setLoadingVoice(null);
    }
  };

  return (
    <section className="space-y-2.5">
      <p className="label-micro">Voice</p>

      <div
        role="radiogroup"
        aria-label="Voice"
        className="overflow-hidden rounded-lg border border-border bg-card"
      >
        {VOICE_OPTIONS.map((opt, i) => {
          const isSelected = selected === opt.id;
          const isLoading = loadingVoice === opt.id;
          const isPlaying = playingVoice === opt.id;
          const GenderIcon = opt.gender === 'Male' ? Mars : Venus;
          return (
            <div
              key={opt.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelect(opt.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(opt.id);
                }
              }}
              className={cn(
                'group flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                i !== 0 && 'border-t border-border',
                isSelected ? 'bg-foreground/[0.05]' : 'hover:bg-muted/60',
              )}
            >
              {/* Selection dot */}
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  isSelected ? 'border-foreground bg-foreground' : 'border-border-strong',
                )}
                aria-hidden="true"
              >
                {isSelected && <Check className="h-2 w-2 text-background" />}
              </span>

              {/* Name */}
              <span className="shrink-0 text-sm font-medium">{opt.name}</span>

              {/* Tone (fills, truncates) */}
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {opt.tone}
              </span>

              {/* Gender icon + accessible text */}
              <span
                className="flex shrink-0 items-center gap-1 text-muted-foreground"
                title={opt.gender}
              >
                <GenderIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{opt.gender}</span>
              </span>

              {/* Audition */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  audition(opt.id);
                }}
                aria-label={isPlaying ? `Stop ${opt.name} audition` : `Hear ${opt.name}`}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors',
                  'hover:bg-background hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
