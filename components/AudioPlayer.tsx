import React, { useRef, useState, useEffect } from 'react';
import { Download, Play, Pause, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  isLoading: boolean;
  onGenerate: () => void;
  hasText: boolean;
  speed: number;
  isDark: boolean;
  isGenerateDisabled: boolean;
  isFullMaster: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioUrl, isLoading, onGenerate, hasText, speed, isDark, isGenerateDisabled, isFullMaster 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [audioUrl, speed]);

  // Reset confirmation when a full generation completes or when generation is disabled (script changes)
  useEffect(() => {
    if (isFullMaster) {
      setIsConfirmed(false);
    }
  }, [isFullMaster]);

  useEffect(() => {
    if (isGenerateDisabled) {
      setIsConfirmed(false);
    }
  }, [isGenerateDisabled]);

  const handleGenerate = () => {
    if (isConfirmed && !isLoading && hasText && !isGenerateDisabled) {
      onGenerate();
    }
  };

  return (
    <div className="w-full space-y-4">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} className="hidden" src={audioUrl || undefined} />
      
      {!isFullMaster && !isGenerateDisabled && (
        <div 
          onClick={() => setIsConfirmed(!isConfirmed)}
          className={`p-3 rounded-md border cursor-pointer transition-all flex items-start gap-3 ${
            isConfirmed 
              ? 'bg-indigo-500/10 border-indigo-500/30' 
              : isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
            isConfirmed 
              ? 'bg-indigo-600 border-indigo-600' 
              : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
          }`}>
            {isConfirmed && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <div className="flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isConfirmed ? 'text-indigo-400' : 'opacity-60'}`}>
              Ready for Master
            </p>
            <p className={`text-[9px] leading-relaxed font-medium ${isConfirmed ? 'text-indigo-300/80' : 'opacity-40'}`}>
              I confirm the script is finalized and previewed. I understand full generation consumes API quota.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleGenerate} 
        disabled={isLoading || !hasText || isGenerateDisabled || (!isConfirmed && !isFullMaster)}
        className={`w-full py-4 rounded-md text-[11px] font-bold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg ${
          isFullMaster 
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
            : isConfirmed 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
        } disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : isFullMaster ? (
          <><CheckCircle2 className="w-4 h-4" /> RE-GENERATE FULL MASTER</>
        ) : (
          'GENERATE & DOWNLOAD FULL'
        )}
      </button>

      {audioUrl && (
        <div className="flex gap-2">
          <button 
            onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
            className={`p-4 rounded-md border transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
          >
            {isPlaying ? <Pause className="w-5 h-5 text-indigo-600" /> : <Play className="w-5 h-5 text-indigo-600 fill-current" />}
          </button>
          <a 
            href={audioUrl} download={isFullMaster ? "voice-master.wav" : "voice-preview.wav"}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-md border text-[10px] font-bold uppercase tracking-widest transition-all ${
              isFullMaster 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20' 
                : isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <Download className="w-4 h-4" /> {isFullMaster ? 'Download Master' : 'Download Preview'}
          </a>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;