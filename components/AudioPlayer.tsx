import React, { useRef, useEffect, useState } from 'react';
import { Download, Play, Pause, RefreshCw } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  isLoading: boolean;
  onGenerate: () => void;
  hasText: boolean;
  speed: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, isLoading, onGenerate, hasText, speed }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      // Ensure speed is applied when new audio is loaded
      audioRef.current.playbackRate = speed;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [audioUrl]);

  // Update playback rate dynamically if prop changes while playing
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const buttonBaseClass = "flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";

  return (
    <div className="flex flex-col w-full mt-6 p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50 backdrop-blur-sm gap-6">
      <audio 
        ref={audioRef} 
        onEnded={handleEnded} 
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        className="hidden" 
      />

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isLoading || !hasText}
            className={`${buttonBaseClass} flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating Speech...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Generate Speech
              </>
            )}
          </button>

          {/* Play/Download Controls (Only visible if audio exists) */}
          {audioUrl && (
            <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
                onClick={togglePlay}
                className="flex items-center justify-center p-4 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white transition-colors min-w-[60px]"
                title={isPlaying ? "Pause" : "Replay"}
              >
                 {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>
              
              <a
                href={audioUrl}
                download="gemini-speech.wav"
                className={`${buttonBaseClass} bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white border border-slate-600`}
              >
                <Download className="w-5 h-5" />
                Download WAV
              </a>
            </div>
          )}
      </div>
    </div>
  );
};

export default AudioPlayer;