
import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Loader2 } from 'lucide-react';
import { VoiceName, VOICE_OPTIONS, VoiceOption, PersonaType } from '../types';
import { generateSpeech } from '../services/geminiService';
import { processGeminiAudio } from '../utils/audioUtils';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
  disabled?: boolean;
  previewText?: string;
  speed: number;
  persona: PersonaType;
  previewDuration: number;
  isDark: boolean;
  onError?: (error: any) => void;
  onPreviewComplete?: (url: string) => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ 
  selectedVoice, onSelect, disabled, previewText, speed, persona, previewDuration, isDark, onError, onPreviewComplete
}) => {
  const [previewingVoice, setPreviewingVoice] = useState<VoiceName | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<VoiceName | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<number | null>(null);

  const handlePreview = async (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();
    if (previewingVoice === voice.id) {
      audioRef.current?.pause();
      setPreviewingVoice(null);
      return;
    }

    setLoadingVoice(voice.id);
    setProgress(0);
    progressInterval.current = window.setInterval(() => setProgress(p => p < 90 ? p + 10 : p), 200);

    try {
      const b64 = await generateSpeech(previewText || `Sample for ${voice.name}`, voice.id, persona, previewDuration);
      const url = await processGeminiAudio(b64);
      const audio = new Audio(url);
      audio.playbackRate = speed;
      audio.onended = () => setPreviewingVoice(null);
      await audio.play();
      audioRef.current = audio;
      setPreviewingVoice(voice.id);
      
      if (onPreviewComplete) {
        onPreviewComplete(url);
      }
    } catch (err: any) {
      console.error("Voice preview failed", err);
      if (onError) onError(err);
    } finally {
      setLoadingVoice(null);
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Voice Talent</label>
      <div className="grid grid-cols-2 gap-3">
        {VOICE_OPTIONS.map(opt => (
          <div 
            key={opt.id} onClick={() => !disabled && onSelect(opt.id)}
            className={`relative p-4 rounded-md border transition-all cursor-pointer ${selectedVoice === opt.id ? 'bg-indigo-600 border-indigo-600' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 hover:border-indigo-100'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`text-[11px] font-bold ${selectedVoice === opt.id ? 'text-white' : ''}`}>{opt.name}</span>
              <button 
                onClick={(e) => handlePreview(e, opt)}
                disabled={disabled}
                className={`p-1.5 rounded-md transition-all ${selectedVoice === opt.id ? 'bg-white/20 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600'}`}
              >
                {loadingVoice === opt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : previewingVoice === opt.id ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
            </div>
            <p className={`text-[10px] font-medium leading-tight ${selectedVoice === opt.id ? 'text-indigo-100' : 'text-slate-500'}`}>{opt.description}</p>
            {loadingVoice === opt.id && (
              <div className="absolute bottom-0 left-0 h-1 bg-indigo-400/50 transition-all rounded-b-md" style={{ width: `${progress}%` }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceSelector;
