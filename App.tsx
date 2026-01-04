
import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Sparkles, Command, PauseCircle, Gauge, Globe, Ghost, Volume2, Wand2, Undo2,
  Smile, Frown, Wind, FastForward, Activity, Settings2, Loader2, Send, Clock,
  Flame, Moon, Sun, Angry, Waves, ShieldCheck, Cpu, Coffee, Briefcase, 
  Search, HelpCircle, Radio, Newspaper, Zap, Music, Sliders, Key, AlertTriangle, ExternalLink,
  BarChart3
} from 'lucide-react';
import VoiceSelector from './components/VoiceSelector';
import AudioPlayer from './components/AudioPlayer';
import { VoiceName, TTSState, PersonaType, ModeType } from './types';
import { generateSpeech, analyzeScript } from './services/geminiService';
import { processGeminiAudio } from './utils/audioUtils';

// The window.aistudio global is assumed to be pre-configured in the environment.
// Manual declaration is removed to avoid modifier conflicts.

const App: React.FC = () => {
  const [state, setState] = useState<TTSState>({
    text: "Welcome to Voice Studio. [pause] This is your professional Nigerian persona. [pause][pause]\n\nExperience high-fidelity speech synthesis. [whisper] We handle subtle nuances with ease. [pause] Or [shout] project with power when needed! [pause][pause]\n\nUse the command bar below to direct the AI. [pause][pause]",
    previousText: null,
    voice: VoiceName.Kore,
    persona: 'nigerian',
    isLoading: false,
    isAnalyzing: false,
    audioUrl: null,
    error: null,
    previewDuration: 10,
    mode: 'light',
  });

  const [speed, setSpeed] = useState(1.0);
  const [directive, setDirective] = useState("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDark = state.mode === 'dark';

  useEffect(() => {
    // Initial check for API key
    const checkKey = async () => {
      try {
        const active = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(active);
      } catch (e) {
        setHasApiKey(false);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Mitigate race condition: assume success after triggering the selection dialog
      setHasApiKey(true);
      setState(prev => ({ ...prev, error: null }));
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    const msg = err?.message || "";
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      setState(prev => ({ ...prev, error: "QUOTA_EXHAUSTED" }));
    } else if (msg.includes('Requested entity was not found')) {
      setHasApiKey(false);
      handleOpenKeySelector();
    } else {
      setState(prev => ({ ...prev, error: "Something went wrong. Please try again." }));
    }
  };

  const handleAnalyze = async (customInstruction?: string) => {
    if (!state.text.trim() || state.isAnalyzing) return;
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));
    try {
      const enhancedText = await analyzeScript(state.text, customInstruction);
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        previousText: prev.text,
        text: enhancedText 
      }));
      if (customInstruction) setDirective("");
    } catch (err: any) {
      setState(prev => ({ ...prev, isAnalyzing: false }));
      handleError(err);
    }
  };

  const handleGenerate = async () => {
    if (!state.text.trim()) return;
    setState(prev => ({ ...prev, isLoading: true, error: null, audioUrl: null }));
    try {
      const base64Audio = await generateSpeech(state.text, state.voice, state.persona);
      const audioUrl = await processGeminiAudio(base64Audio);
      setState(prev => ({ ...prev, isLoading: false, audioUrl }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      handleError(err);
    }
  };

  const insertAtCursor = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart || state.text.length;
    const end = textarea.selectionEnd || state.text.length;
    const newText = state.text.substring(0, start) + tag + state.text.substring(end);
    setState(prev => ({ ...prev, text: newText }));
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + tag.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const palette = [
    { id: 'Pause', tag: '[pause]', icon: PauseCircle, color: 'text-indigo-500', hint: 'Adds a natural break' },
    { id: 'Breathe', tag: '[break]', icon: Waves, color: 'text-blue-400', hint: 'Longer structural silence' },
    { id: 'Whisper', tag: '[whisper]', icon: Wind, color: 'text-slate-400', hint: 'Low volume, breathy air' },
    { id: 'Shout', tag: '[shout]', icon: Volume2, color: 'text-rose-500', hint: 'High volume, intense power' },
    { id: 'Happy', tag: '[happy]', icon: Smile, color: 'text-emerald-500', hint: 'Cheerful, upbeat inflection' },
    { id: 'Sad', tag: '[sad]', icon: Frown, color: 'text-sky-500', hint: 'Somber, mournful tone' },
    { id: 'Angry', tag: '[angry]', icon: Angry, color: 'text-red-600', hint: 'Stern, forceful articulation' },
    { id: 'Pulse', tag: '[stutter]', icon: Activity, color: 'text-purple-500', hint: 'Slight rhythmic repetition' },
    { id: 'Mystic', tag: '[mysterious]', icon: Ghost, color: 'text-indigo-400', hint: 'Low pitch, intriguing feel' },
    { id: 'Suspense', tag: '[suspense]', icon: Music, color: 'text-orange-500', hint: 'Slower, dramatic tension' },
    { id: 'Radio', tag: '[announcer]', icon: Radio, color: 'text-blue-600', hint: 'High-energy, compressed' },
    { id: 'News', tag: '[news]', icon: Newspaper, color: 'text-slate-700', hint: 'Neutral reporting style' },
    { id: 'Robot', tag: '[robotic]', icon: Cpu, color: 'text-slate-500', hint: 'Flat mechanical monotone' },
    { id: 'Breathe', tag: '[breathy]', icon: ShieldCheck, color: 'text-teal-400', hint: 'Heavy air intake texture' },
    { id: 'Formal', tag: '[formal]', icon: Briefcase, color: 'text-slate-800', hint: 'Precise, professional focus' },
    { id: 'Confused', tag: '[confused]', icon: HelpCircle, color: 'text-amber-600', hint: 'Hesitant, uncertain pitch' },
    { id: 'Energy', tag: '[energetic]', icon: Zap, color: 'text-yellow-500', hint: 'Fast-paced, high spirit' },
    { id: 'Chill', tag: '[relaxed]', icon: Coffee, color: 'text-orange-400', hint: 'Casual, laid-back tone' },
  ];

  const durations = [10, 30, 60, 0];

  return (
    <div className={`flex flex-col h-screen transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-900'}`}>
      {/* Quota Banner */}
      {state.error === "QUOTA_EXHAUSTED" && (
        <div className="bg-amber-600 text-white px-8 py-3 flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4" />
            <span>Quota exhausted on the linked key. Use a paid project key for higher limits.</span>
          </div>
          <button onClick={handleOpenKeySelector} className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-md flex items-center gap-2 transition-all">
            <Key className="w-3.5 h-3.5" /> Select Different Key
          </button>
        </div>
      )}

      {/* Header */}
      <header className={`flex items-center justify-between px-8 py-4 border-b z-20 shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-md ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
              <Mic className="w-4 h-4 text-indigo-600" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Voice<span className="text-indigo-600">Studio</span></h1>
          </div>

          {/* Quota & Status Display */}
          <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-100 dark:border-slate-800">
            <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-0.5">API Status</span>
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${!hasApiKey ? 'bg-slate-400' : state.error === 'QUOTA_EXHAUSTED' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className={`text-[10px] font-bold ${!hasApiKey ? 'text-slate-400' : state.error === 'QUOTA_EXHAUSTED' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {!hasApiKey ? 'Unlinked' : state.error === 'QUOTA_EXHAUSTED' ? 'Exhausted' : 'Quota Active'}
                    </span>
                  </div>
                  {hasApiKey && (
                    <a 
                      href="https://aistudio.google.com/app/usage" target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      <BarChart3 className="w-3 h-3" /> Check Usage
                    </a>
                  )}
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleOpenKeySelector}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}`}
          >
            <Key className="w-3.5 h-3.5" /> {hasApiKey ? 'Change Key' : 'Setup Key'}
          </button>
          
          <button 
            onClick={() => setState(prev => ({ ...prev, mode: isDark ? 'light' : 'dark' }))}
            className={`p-2 rounded-md transition-all ${isDark ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          {state.previousText && (
            <button 
              onClick={() => setState(prev => ({ ...prev, text: prev.previousText!, previousText: null }))} 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all flex items-center gap-2 ${isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden flex-col lg:flex-row relative">
        {/* Editor Section */}
        <section className={`flex-1 flex flex-col min-w-0 border-r ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={state.text}
              onChange={(e) => setState(prev => ({ ...prev, text: e.target.value }))}
              disabled={state.isLoading || state.isAnalyzing}
              className="w-full h-full p-12 bg-transparent focus:outline-none resize-none text-xl leading-relaxed font-medium selection:bg-indigo-100"
              placeholder="Start writing your script..."
            />
            {state.isAnalyzing && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center z-10 transition-opacity">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="font-bold text-[10px] tracking-widest uppercase opacity-60">Synthesizing changes...</p>
                </div>
              </div>
            )}
          </div>

          {/* AI Panel */}
          <div className={`p-8 pt-16 border-t transition-all ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
                <div className="flex-1 relative w-full">
                  <div className={`absolute -top-7 left-0 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>AI Directive Command</span>
                  </div>
                  <div className={`flex items-center gap-2 rounded-md border transition-all ${isDark ? 'bg-slate-900 border-slate-700 focus-within:border-indigo-600' : 'bg-white border-slate-200 focus-within:border-indigo-600'}`}>
                    <input 
                      type="text" value={directive} onChange={(e) => setDirective(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze(directive)}
                      placeholder="e.g. 'Add cinematic pauses', 'Make it more mysterious'..."
                      className="flex-1 bg-transparent px-4 py-3 text-sm outline-none font-medium"
                    />
                    <button 
                      onClick={() => handleAnalyze(directive)} disabled={!directive.trim() || state.isAnalyzing}
                      className="mx-1.5 px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold tracking-wider transition-all disabled:opacity-30"
                    >
                      EXECUTE
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleAnalyze()} disabled={state.isAnalyzing || !state.text.trim()}
                  className={`flex items-center gap-3 px-5 py-3 rounded-md border transition-all shrink-0 ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600'}`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-70">Smart Enhance</span>
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
                {palette.map((tag) => (
                  <button
                    key={tag.id} 
                    onClick={() => insertAtCursor(tag.tag)}
                    title={tag.hint}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-all hover:border-slate-400 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                  >
                    <tag.icon className={`w-3.5 h-3.5 shrink-0 ${tag.color}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 truncate group-hover:opacity-100">{tag.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar Controls */}
        <aside className={`w-full lg:w-[380px] p-8 space-y-8 overflow-y-auto shrink-0 border-l ${isDark ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-50/30 border-slate-100'}`}>
          
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" /> Persona
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['nigerian', 'british', 'american', 'storyteller', 'corporate', 'neutral'].map((p) => (
                <button
                  key={p} onClick={() => setState(prev => ({ ...prev, persona: p as any }))}
                  className={`py-2.5 rounded-md text-[11px] font-bold capitalize border transition-all ${state.persona === p ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" /> Playback Speed
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="0.5" max="2.0" step="0.1" 
                value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700"
              />
              <span className="text-[11px] font-black tabular-nums w-8">{speed.toFixed(1)}x</span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Preview length
            </label>
            <div className={`flex p-1 rounded-md border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              {durations.map(d => (
                <button 
                  key={d} onClick={() => setState(prev => ({ ...prev, previewDuration: d }))} 
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${state.previewDuration === d ? 'bg-indigo-600 text-white' : 'opacity-40 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  {d === 0 ? 'FULL' : d >= 60 ? '1M' : `${d}S`}
                </button>
              ))}
            </div>
          </div>

          <VoiceSelector 
            selectedVoice={state.voice} 
            onSelect={(v) => setState(prev => ({ ...prev, voice: v }))} 
            speed={speed} 
            persona={state.persona} 
            previewDuration={state.previewDuration} 
            previewText={state.text}
            isDark={isDark}
            onError={handleError}
          />

          <div className="sticky bottom-0 bg-transparent pt-4">
            <AudioPlayer 
              audioUrl={state.audioUrl} 
              isLoading={state.isLoading} 
              onGenerate={handleGenerate} 
              hasText={state.text.length > 0} 
              speed={speed} 
              isDark={isDark}
            />
            {state.error && state.error !== "QUOTA_EXHAUSTED" && (
              <p className="mt-3 text-[10px] text-rose-500 font-bold text-center uppercase tracking-widest">{state.error}</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
             <a 
              href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer"
              className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 uppercase tracking-widest"
             >
              Billing Documentation <ExternalLink className="w-2.5 h-2.5" />
             </a>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default App;
