
import React, { useRef, useState, useEffect } from 'react';
import { Download, Play, Pause, RefreshCw } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  isLoading: boolean;
  onGenerate: () => void;
  hasText: boolean;
  speed: number;
  isDark: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, isLoading, onGenerate, hasText, speed, isDark }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl, speed]);

  return (
    <div className="w-full space-y-3">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} className="hidden" />
      
      <button
        onClick={onGenerate} disabled={isLoading || !hasText}
        className="w-full py-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-30 active:scale-95 flex items-center justify-center gap-3"
      >
        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'GENERATE MASTER'}
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
            href={audioUrl} download="voice-master.wav"
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-md border text-[10px] font-bold uppercase tracking-widest transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
          >
            <Download className="w-4 h-4" /> Download WAV
          </a>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
