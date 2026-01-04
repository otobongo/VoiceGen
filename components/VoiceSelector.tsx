import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Loader2, Volume2 } from 'lucide-react';
import { VoiceName, VOICE_OPTIONS, VoiceOption } from '../types';
import { generateSpeech } from '../services/geminiService';
import { processGeminiAudio } from '../utils/audioUtils';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
  disabled?: boolean;
  previewText?: string;
  speed: number;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onSelect, disabled, previewText, speed }) => {
  const [previewingVoice, setPreviewingVoice] = useState<VoiceName | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<VoiceName | null>(null);
  
  // Refs to hold audio instances
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePreview = async (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation(); // Prevent card selection

    // If clicking the currently playing voice, stop it
    if (previewingVoice === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPreviewingVoice(null);
      return;
    }

    // Stop any other playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setLoadingVoice(voice.id);

    try {
      // Use provided text or fallback.
      const textToPlay = previewText && previewText.trim().length > 0 
        ? previewText 
        : `Hello, I am ${voice.name}. This is how my voice sounds.`;

      const base64Audio = await generateSpeech(textToPlay, voice.id);
      const audioUrl = await processGeminiAudio(base64Audio);

      const audio = new Audio(audioUrl);
      
      // Apply speed immediately
      audio.playbackRate = speed;
      
      audio.onended = () => setPreviewingVoice(null);
      audio.onerror = () => {
         setPreviewingVoice(null);
         setLoadingVoice(null);
         console.error("Audio playback error");
      };
      
      await audio.play();
      audioRef.current = audio;
      setPreviewingVoice(voice.id);
    } catch (error) {
      console.error("Preview failed:", error);
    } finally {
      setLoadingVoice(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>Select Voice</span>
        {previewingVoice && (
            <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Previewing ({speed}x)...
            </span>
        )}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {VOICE_OPTIONS.map((option: VoiceOption) => {
            const isSelected = selectedVoice === option.id;
            const isPreviewing = previewingVoice === option.id;
            const isLoadingPreview = loadingVoice === option.id;

            return (
              <div
                key={option.id}
                onClick={() => !disabled && onSelect(option.id)}
                className={`
                  relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200 group
                  ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        !disabled && onSelect(option.id);
                    }
                }}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`font-semibold ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                    {option.name}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-900/50 text-slate-400 border border-slate-700/50">
                    {option.gender}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-2">{option.description}</p>
                
                {/* Preview Button */}
                <button
                    onClick={(e) => handlePreview(e, option)}
                    disabled={disabled || (loadingVoice !== null && !isLoadingPreview)}
                    className={`
                        mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors z-10
                        ${isPreviewing 
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                        }
                    `}
                    title={`Preview at ${speed}x speed`}
                >
                    {isLoadingPreview ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isPreviewing ? (
                        <Square className="w-3 h-3 fill-current" />
                    ) : (
                        <Play className="w-3 h-3 fill-current" />
                    )}
                    {isPreviewing ? 'Stop' : 'Preview'}
                </button>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                )}
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default VoiceSelector;