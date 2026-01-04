import React, { useState, useRef } from 'react';
import { Mic, Sparkles, Command, MessageSquare, PauseCircle, Zap, MousePointerClick, Gauge } from 'lucide-react';
import VoiceSelector from './components/VoiceSelector';
import AudioPlayer from './components/AudioPlayer';
import { VoiceName, TTSState } from './types';
import { generateSpeech } from './services/geminiService';
import { processGeminiAudio } from './utils/audioUtils';

const App: React.FC = () => {
  const [state, setState] = useState<TTSState>({
    text: "Welcome to Gemini Voice Studio! [pause] I can speak naturally... noticing the small details. [break] Try changing my speed or voice!",
    voice: VoiceName.Kore,
    isLoading: false,
    audioUrl: null,
    error: null,
  });

  const [speed, setSpeed] = useState(1.0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!state.text.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, audioUrl: null }));

    try {
      const base64Audio = await generateSpeech(state.text, state.voice);
      const audioUrl = await processGeminiAudio(base64Audio);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        audioUrl: audioUrl
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to generate speech. Please check your API key."
      }));
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, text: e.target.value }));
  };

  const handleVoiceSelect = (voice: VoiceName) => {
    setState(prev => ({ ...prev, voice }));
  };

  const insertAtCursor = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Grab current cursor position or default to end if undefined
    const start = textarea.selectionStart || state.text.length;
    const end = textarea.selectionEnd || state.text.length;
    const currentText = state.text;

    // Insert the tag
    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    
    setState(prev => ({ ...prev, text: newText }));

    // Restore focus and move cursor after the inserted tag
    requestAnimationFrame(() => {
        textarea.focus();
        const newCursorPos = start + tag.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/10 mb-4">
            <Mic className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Gemini <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Voice Studio</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Transform text into lifelike speech with the new Gemini 2.5 Flash TTS model. 
            Experience high-fidelity nuances, whispers, and natural pacing.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Text Input Area */}
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={state.text}
                  onChange={handleTextChange}
                  disabled={state.isLoading}
                  placeholder="Type something amazing here..."
                  className="w-full h-64 p-6 bg-[#1e293b] text-slate-100 rounded-xl border border-slate-700/50 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all resize-none text-lg leading-relaxed placeholder:text-slate-600 shadow-xl"
                />
              </div>
            </div>

            {/* Pro Tips / Actions Section */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
               <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Quick Actions</span>
                   </div>
                   <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MousePointerClick className="w-3 h-3" />
                      <span>Click to insert at cursor</span>
                   </div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <button 
                    onClick={() => insertAtCursor('... ')}
                    className="flex flex-col gap-1 p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 transition-all text-left group active:scale-95 shadow-sm"
                  >
                      <div className="flex items-center gap-2 text-blue-300 font-mono text-xs group-hover:text-blue-200">
                          <MessageSquare className="w-3 h-3" />
                          <span className="font-bold">...</span>
                      </div>
                      <span className="text-slate-400 text-xs font-medium">Short pause</span>
                  </button>

                  <button 
                    onClick={() => insertAtCursor('[break]')}
                    className="flex flex-col gap-1 p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 transition-all text-left group active:scale-95 shadow-sm"
                  >
                      <div className="flex items-center gap-2 text-blue-300 font-mono text-xs group-hover:text-blue-200">
                          <Command className="w-3 h-3" />
                          <span className="font-bold">[break]</span>
                      </div>
                      <span className="text-slate-400 text-xs font-medium">Breath / Medium</span>
                  </button>

                  <button 
                    onClick={() => insertAtCursor('[pause]')}
                    className="flex flex-col gap-1 p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 transition-all text-left group active:scale-95 shadow-sm"
                  >
                      <div className="flex items-center gap-2 text-blue-300 font-mono text-xs group-hover:text-blue-200">
                          <PauseCircle className="w-3 h-3" />
                          <span className="font-bold">[pause]</span>
                      </div>
                      <span className="text-slate-400 text-xs font-medium">Long dramatic</span>
                  </button>

                  <button 
                    onClick={() => insertAtCursor('!')}
                    className="flex flex-col gap-1 p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 transition-all text-left group active:scale-95 shadow-sm"
                  >
                      <div className="flex items-center gap-2 text-blue-300 font-mono text-xs group-hover:text-blue-200">
                          <Zap className="w-3 h-3" />
                          <span className="font-bold">!</span>
                      </div>
                      <span className="text-slate-400 text-xs font-medium">High Energy (Click repeatedly)</span>
                  </button>
               </div>
            </div>
          </div>

          {/* Speed Control (Moved Above Voice Selector) */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 flex flex-col sm:flex-row items-center gap-6">
             <div className="flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Gauge className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200">Speaking Speed</span>
                    <span className="text-xs text-slate-400">{speed.toFixed(1)}x</span>
                </div>
             </div>
             
             <div className="relative flex-1 w-full flex items-center gap-4">
                 <span className="text-xs text-slate-500 font-medium">0.5x</span>
                 <input 
                    type="range" 
                    min="0.5" 
                    max="2.0" 
                    step="0.1" 
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
                <span className="text-xs text-slate-500 font-medium">2.0x</span>
             </div>
          </div>

          {/* Voice Selection */}
          <VoiceSelector 
            selectedVoice={state.voice} 
            onSelect={handleVoiceSelect} 
            disabled={state.isLoading}
            previewText={state.text}
            speed={speed}
          />

          {/* Error Message */}
          {state.error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm">
              {state.error}
            </div>
          )}

          {/* Actions & Player */}
          <AudioPlayer 
            audioUrl={state.audioUrl} 
            isLoading={state.isLoading} 
            onGenerate={handleGenerate}
            hasText={state.text.length > 0}
            speed={speed}
          />

        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-slate-600">
          <p>Powered by Google Gemini 2.5 Flash TTS</p>
        </div>
      </div>
    </div>
  );
};

export default App;