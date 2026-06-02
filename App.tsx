
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { 
  Mic, Sparkles, Command, PauseCircle, Gauge, Globe, Ghost, Volume2, Wand2, Undo2,
  Smile, Frown, Wind, FastForward, Activity, Settings2, Loader2, Send, Clock,
  Flame, Moon, Sun, Angry, Waves, ShieldCheck, Cpu, Coffee, Briefcase, 
  Search, HelpCircle, Radio, Newspaper, Zap, Music, Sliders, Key, AlertTriangle, ExternalLink,
  BarChart3, Info, LogOut, ChevronRight, Edit3, Lock, FileAudio, Check, Coins, ScanSearch, CheckCheck, XCircle, PlayCircle, Layers, ArrowLeft, MoreHorizontal, MessageSquarePlus, ArrowRight, Download, Package, X, History, FileText, CheckCircle
} from 'lucide-react';
import VoiceSelector from './components/VoiceSelector';
import AudioPlayer from './components/AudioPlayer';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import { HighlightedTextarea, renderHighlightedText } from './components/HighlightedTextarea';
import { VoiceName, TTSState, PersonaType, ModeType, ViewMode, VOICE_OPTIONS, ScriptIssue, AnalysisChange } from './types';
import { generateSpeech, analyzeScript, auditScript } from './services/geminiService';
import { processGeminiAudio } from './utils/audioUtils';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// --- Token Usage Storage Helper ---
const STORAGE_KEY_USAGE = 'voice_studio_session_usage';
const STORAGE_KEY_PROJECT = 'voice_studio_project_state';
const STORAGE_KEY_HISTORY = 'voice_studio_project_history';
const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredUsage {
  tokens: number;
  startTime: number;
}

export interface ProjectSnapshot {
  id: string;
  timestamp: number;
  text: string;
  voice: string;
  persona: string;
  speed: number;
}

const getStoredProject = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECT);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse stored project state", e);
  }
  return null;
};

const getStoredUsage = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USAGE);
    if (!raw) return 0;
    const data: StoredUsage = JSON.parse(raw);
    // Reset if older than 24 hours
    if (Date.now() - data.startTime > USAGE_WINDOW_MS) {
      return 0;
    }
    return data.tokens;
  } catch {
    return 0;
  }
};

const updateUsageInStorage = (additionalTokens: number): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USAGE);
    let data: StoredUsage = { tokens: 0, startTime: Date.now() };
    
    if (raw) {
       const parsed: StoredUsage = JSON.parse(raw);
       // Check if current session is still valid (within 24h)
       if (Date.now() - parsed.startTime <= USAGE_WINDOW_MS) {
         data = parsed;
       } 
       // Else data remains new session (tokens: 0, startTime: now)
    }

    data.tokens += additionalTokens;
    localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(data));
    return data.tokens;
  } catch {
    return 0;
  }
};

// --- Action Toolbar Component ---
interface ActionToolbarProps {
  onInsert: (tag: string) => void;
  onClose?: () => void;
  palette: any[];
}

const ActionToolbar: React.FC<ActionToolbarProps> = ({ onInsert, onClose, palette }) => {
  const [showMenu, setShowMenu] = useState(false);
  const visibleActions = palette.slice(0, 6);
  const hiddenActions = palette.slice(6);

  return (
    <div className="px-3 py-2 border-t border-border bg-card flex items-center justify-between gap-2 shrink-0">
       <div className="flex items-center gap-1.5 flex-wrap">
         {visibleActions.map((p) => (
             <button 
               key={p.id} 
               onClick={() => onInsert(p.tag)} 
               title={p.hint}
               aria-label={p.hint}
               className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border transition-all group/btn ${
                 p.simple 
                   ? 'border-transparent text-muted-foreground hover:text-[var(--color-accent-primary)] hover:bg-accent'
                   : 'bg-muted border-border text-muted-foreground hover:border-[var(--color-accent-primary)]/50 hover:text-foreground shadow-sm'
               }`}
             >
               <p.icon className={`w-3.5 h-3.5 ${p.simple ? 'opacity-70 group-hover/btn:opacity-100' : ''} ${p.color}`} />
               {!p.simple && <span className="text-[9px] font-mono font-bold uppercase tracking-wider whitespace-nowrap">{p.id}</span>}
             </button>
          ))}
       </div>

       <div className="flex items-center gap-1">
         {/* More Actions Dropdown */}
         {hiddenActions.length > 0 && (
            <div className="relative shrink-0">
               <button 
                 onClick={() => setShowMenu(!showMenu)}
                 className={`p-1.5 rounded-sm transition-all border border-transparent ${showMenu ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)]' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                 title="More actions"
                 aria-label="More actions"
                 aria-expanded={showMenu}
                 aria-haspopup="true"
               >
                 <MoreHorizontal className="w-4 h-4" />
               </button>

               {showMenu && (
                 <>
                   <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden="true" />
                   <div className="absolute right-0 bottom-full mb-2 w-48 border border-border bg-popover rounded-sm shadow-2xl z-50 overflow-hidden py-1">
                      <div className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-widest border-b border-border mb-1 text-muted-foreground bg-muted/50">
                        Advanced Tags
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {hiddenActions.map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => { onInsert(p.tag); setShowMenu(false); }}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 transition-colors group/item hover:bg-accent text-foreground"
                          >
                              <div className="p-1 rounded bg-muted group-hover/item:bg-background transition-colors">
                                <p.icon className={`w-3 h-3 ${p.color}`} />
                              </div>
                              <span className="text-xs font-mono font-medium">{p.id}</span>
                          </button>
                        ))}
                      </div>
                   </div>
                 </>
               )}
            </div>
         )}

         {onClose && (
           <button 
             onClick={onClose}
             className="p-1.5 rounded-sm transition-all border border-transparent text-muted-foreground hover:bg-accent hover:text-destructive"
             title="Close panel"
             aria-label="Close panel"
           >
             <X className="w-4 h-4" />
           </button>
         )}
       </div>
    </div>
  );
};

const VoiceStudioApp: React.FC = () => {
  const { user, logout } = useAuth();
  
  const INITIAL_TEXT = "Welcome to the studio. [pause] \n[whisper] Listen closely to the dynamic range. [break] \nSuddenly [shout] we can project power and authority! [pause] \n[happy] And just as easily switch to a cheerful, bright tone. [pause] \n[slow] We can slow things down for emphasis... [fast] or speed them up to convey excitement! [break] \nHow will you direct the voice today?";
  
  const storedProject = getStoredProject();

  const [state, setState] = useState<TTSState>(() => {
    const savedTheme = localStorage.getItem('theme');
    const sysTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode = savedTheme === 'dark' || (!savedTheme && sysTheme) ? 'dark' : 'light';
    
    return {
      text: storedProject?.text ?? INITIAL_TEXT,
      previousText: null,
      voice: storedProject?.voice ?? VoiceName.Fenrir,
      persona: storedProject?.persona ?? 'nigerian',
      isLoading: false,
      isAnalyzing: false,
      audioUrl: null,
      masterUrls: null,
      error: null,
      previewDuration: 10,
      mode: initialMode,
      viewMode: 'prepare',
      sessionUsage: getStoredUsage(),
      lastUsage: 0,
      isAuditing: false,
      scriptIssues: [],
      lastAuditedText: storedProject?.text ?? INITIAL_TEXT,
      analysisChanges: []
    };
  });

  const [speed, setSpeed] = useState(storedProject?.speed ?? 1.0);
  const [history, setHistory] = useState<ProjectSnapshot[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to parse stored history", e);
    }
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        const newMode = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newMode);
        setState(prev => ({ ...prev, mode: newMode }));
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Auto-save project state and history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify({
        text: state.text,
        voice: state.voice,
        persona: state.persona,
        speed: speed
      }));
    } catch (e) {
      console.warn("Failed to save project state", e);
    }

    // Debounced history save
    const handler = setTimeout(() => {
      setHistory(prev => {
        // Don't save if text is empty or same as the most recent history entry
        if (!state.text.trim()) return prev;
        if (prev.length > 0 && prev[0].text === state.text) return prev;

        const newSnapshot: ProjectSnapshot = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          text: state.text,
          voice: state.voice,
          persona: state.persona,
          speed: speed
        };
        const newHistory = [newSnapshot, ...prev].slice(0, 30); // Keep last 30 versions
        try {
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
        } catch (e) {
          console.warn("Failed to save history", e);
        }
        return newHistory;
      });
    }, 5000); // Save to history after 5 seconds of inactivity

    return () => clearTimeout(handler);
  }, [state.text, state.voice, state.persona, speed]);

  const handleRollback = (snap: ProjectSnapshot) => {
    setState(prev => ({
      ...prev,
      text: snap.text,
      voice: snap.voice as VoiceName,
      persona: snap.persona as PersonaType
    }));
    setSpeed(snap.speed);
    setShowHistoryModal(false);
  };

  const [directive, setDirective] = useState("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [prepMode, setPrepMode] = useState<'full' | 'tags' | 'skip' | null>(null);
  const [showActions, setShowActions] = useState(false);
  
  const estimatedTokens = Math.ceil(state.text.length / 4);

  // Ref for the single editor in Preview Mode
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  const isDark = state.mode === 'dark';

  // Computed properties
  const isDirty = state.text !== state.lastAuditedText;
  const hasIssues = state.scriptIssues.length > 0;
  const isBlocked = state.isAuditing || (isDirty && state.viewMode === 'prepare') || hasIssues;

  useEffect(() => {
    // Reset audio when key parameters change
    if (state.viewMode !== 'finalize') {
      setState(prev => ({ ...prev, audioUrl: null, masterUrls: null }));
    }
  }, [state.text, state.voice, state.persona, state.viewMode]);

  // Debounced Audit in Prepare Mode
  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.viewMode === 'prepare' && state.text && state.text.trim() !== "" && state.text !== state.lastAuditedText && !state.isAuditing) {
        performAudit(state.text);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [state.text, state.lastAuditedText, state.isAuditing, state.viewMode]);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHasApiKey(data.hasKey);
          return;
        }
      } catch (e) {
        console.error("Health check failed", e);
      }
      
      try {
        if ((window as any).aistudio) {
            const active = await (window as any).aistudio.hasSelectedApiKey();
            setHasApiKey(active);
            return;
        }
      } catch (e) {}
      setHasApiKey(false);
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    try {
      if ((window as any).aistudio) {
          await (window as any).aistudio.openSelectKey();
          // After selecting, re-check server or just optimistically set
          setHasApiKey(true);
          setState(prev => ({ ...prev, error: null }));
      } else {
          alert("GEMINI_API_KEY environment variable is missing on the server. Please add it to your environment variables.");
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const handleLogout = () => {
    if (state.text.trim().length > 0 && state.text !== INITIAL_TEXT) {
      setShowLogoutConfirm(true);
    } else {
      logout();
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    let msg = "";
    if (typeof err === 'string') {
      msg = err;
    } else if (err?.message) {
      msg = err.message;
    } else if (err?.error?.message) {
      msg = err.error.message;
    } else {
      try {
        msg = JSON.stringify(err);
      } catch (e) {
        msg = "Unknown error";
      }
    }
    
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('billing details')) {
      setState(prev => ({ ...prev, error: "QUOTA_EXHAUSTED" }));
    } else if (msg.includes('Requested entity was not found') || msg.includes('API Key missing')) {
      setHasApiKey(false);
      handleOpenKeySelector();
    } else {
      // Display specific error message for better debugging
      setState(prev => ({ ...prev, error: msg || "Something went wrong. Please try again." }));
    }
  };

  const performAudit = async (textToAudit: string) => {
    setState(prev => ({ ...prev, isAuditing: true, error: null }));
    try {
      const result = await auditScript(textToAudit);
      const updatedTotal = updateUsageInStorage(result.usage.totalTokens);
      setState(prev => ({ 
        ...prev, 
        isAuditing: false, 
        scriptIssues: result.issues,
        lastAuditedText: textToAudit,
        sessionUsage: updatedTotal
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isAuditing: false }));
      console.warn("Audit failed:", err);
    }
  };

  const handleAutoFix = () => {
    if (state.scriptIssues.length === 0) return;
    let newText = state.text;
    state.scriptIssues.forEach(issue => {
      const regex = new RegExp(`\\b${issue.original}\\b`, 'gi');
      newText = newText.replace(regex, issue.suggestion);
    });
    setState(prev => ({ ...prev, text: newText, lastAuditedText: newText, scriptIssues: [] }));
  };

  const handleAnalyze = async (customInstruction?: string) => {
    if (!state.text.trim() || state.isAnalyzing) return;
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));
    try {
      const preserveText = prepMode !== 'full';
      const result = await analyzeScript(state.text, customInstruction, preserveText);
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        previousText: prev.text,
        text: result.text,
        analysisChanges: result.changes,
        lastAuditedText: result.text,
        scriptIssues: [] 
      }));
      if (customInstruction) setDirective("");
      setPrepMode('skip');
    } catch (err: any) {
      setState(prev => ({ ...prev, isAnalyzing: false }));
      handleError(err);
    }
  };

  const handleRevertChange = (change: AnalysisChange) => {
    if (state.text.includes(change.newSnippet)) {
      const newText = state.text.replace(change.newSnippet, change.originalSnippet);
      setState(prev => ({
        ...prev,
        text: newText,
        analysisChanges: prev.analysisChanges.filter(c => c !== change)
      }));
    } else {
       console.warn("Could not find exact snippet to revert:", change.newSnippet);
    }
  };

  const revertChanges = () => {
    setState(prev => ({
        ...prev,
        text: prev.previousText || prev.text,
        previousText: null,
        analysisChanges: []
    }));
  };

  const handleGenerate = async (isMaster: boolean) => {
    if (!state.text.trim() || (isBlocked && state.viewMode === 'prepare')) return;
    
    // Clear previous audio
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      audioUrl: isMaster ? prev.audioUrl : null, 
      masterUrls: isMaster ? null : prev.masterUrls
    }));

    try {
      const duration = isMaster ? 0 : state.previewDuration;
      const result = await generateSpeech(state.text, state.voice, state.persona, duration);
      
      if (isMaster) {
        // --- MASTER GENERATION (WAV) ---
        // Reuse the existing WAV processor
        const wavUrl = await processGeminiAudio(result.audioData);
        
        const updatedTotal = updateUsageInStorage(result.usage.totalTokens);

        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          audioUrl: wavUrl, // Use WAV for main player
          masterUrls: { wav: wavUrl },
          sessionUsage: updatedTotal,
          lastUsage: result.usage.totalTokens
        }));
      } else {
        // --- PREVIEW GENERATION (WAV) ---
        const audioUrl = await processGeminiAudio(result.audioData);
        const updatedTotal = updateUsageInStorage(result.usage.totalTokens);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          audioUrl,
          sessionUsage: updatedTotal,
          lastUsage: result.usage.totalTokens
        }));
      }

    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      handleError(err);
    }
  };

  // Insert tag into the single editor
  const insertTag = (tag: string) => {
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart || state.text.length;
    const end = editorRef.current.selectionEnd || state.text.length;
    const newText = state.text.substring(0, start) + tag + state.text.substring(end);
    setState(prev => ({ ...prev, text: newText }));
    
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      const newPos = start + tag.length;
      editorRef.current?.setSelectionRange(newPos, newPos);
    });
  };

  const palette = [
    // Simple Actions (Icon Only)
    { id: 'Pause', tag: '[pause]', icon: PauseCircle, color: 'text-[var(--color-accent-primary)]', hint: 'Inserts a slight natural break.', simple: true },
    { id: 'Breathe', tag: '[break]', icon: Waves, color: 'text-blue-400', hint: 'Inserts a longer silence.', simple: true },
    { id: 'Happy', tag: '[happy]', icon: Smile, color: 'text-emerald-500', hint: 'Adds a cheerful inflection.', simple: true },
    { id: 'Sad', tag: '[sad]', icon: Frown, color: 'text-sky-500', hint: 'Delivers words with a somber tone.', simple: true },
    
    // Complex Actions (Icon + Text)
    { id: 'Whisper', tag: '[whisper]', icon: Wind, color: 'text-muted-foreground', hint: 'Lowers volume to a breathy air.', simple: false },
    { id: 'Shout', tag: '[shout]', icon: Volume2, color: 'text-rose-500', hint: 'Projects voice with high power.', simple: false },
    
    // Dropdown Actions (Icon + Text in Menu)
    { id: 'Angry', tag: '[angry]', icon: Angry, color: 'text-destructive', hint: 'Forces a stern articulation.' },
    { id: 'Pulse', tag: '[stutter]', icon: Activity, color: 'text-purple-500', hint: 'Simulates a slight repetition.' },
    { id: 'Mystic', tag: '[mysterious]', icon: Ghost, color: 'text-[var(--color-accent-primary)]', hint: 'Lowers pitch for a cinematic feel.' },
    { id: 'Suspense', tag: '[suspense]', icon: Music, color: 'text-orange-500', hint: 'Slows delivery to build tension.' },
    { id: 'Radio', tag: '[announcer]', icon: Radio, color: 'text-blue-600', hint: 'Adds broadcast presence.' },
    { id: 'News', tag: '[news]', icon: Newspaper, color: 'text-foreground', hint: 'Neutral, objective reporting.' },
    { id: 'Robot', tag: '[robotic]', icon: Cpu, color: 'text-muted-foreground', hint: 'Mechanical monotone.' },
    { id: 'Formal', tag: '[formal]', icon: Briefcase, color: 'text-[var(--color-accent-primary)]', hint: 'Precise, steady focus.' },
  ];

  return (
    <div className="vs-app-zone flex flex-col h-screen overflow-hidden transition-colors duration-200 bg-background text-foreground">
      {/* Quota Alert */}
      {state.error === "QUOTA_EXHAUSTED" && (
        <div className="bg-amber-600 text-white px-8 py-3 flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-300" aria-live="assertive">
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
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-[var(--color-accent-primary-subtle)]">
              <Mic className="w-4 h-4 text-[var(--color-accent-primary)]" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Voice<span className="text-[var(--color-accent-primary)]">Studio</span></h1>
          </div>
          
          {/* Workflow Stepper */}
          <div className="flex items-center gap-2" role="list" aria-label="Workflow steps">
            <div 
              role="listitem"
              aria-current={state.viewMode === 'prepare' ? 'step' : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${state.viewMode === 'prepare' ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)]' : 'text-muted-foreground'}`}
            >
              <Edit3 className="w-3 h-3" /> Prepare
            </div>
            <div className="w-6 h-px bg-border" aria-hidden="true"></div>
            <div 
              role="listitem"
              aria-current={state.viewMode === 'preview' ? 'step' : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${state.viewMode === 'preview' ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)]' : 'text-muted-foreground'}`}
            >
              <PlayCircle className="w-3 h-3" /> Preview
            </div>
             <div className="w-6 h-px bg-border" aria-hidden="true"></div>
            <div 
              role="listitem"
              aria-current={state.viewMode === 'finalize' ? 'step' : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${state.viewMode === 'finalize' ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)]' : 'text-muted-foreground'}`}
            >
              <Check className="w-3 h-3" /> Produce
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-2 rounded-md transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80"
            title="Version History"
            aria-label="Version History"
            aria-haspopup="dialog"
            aria-expanded={showHistoryModal}
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const newMode = state.mode === 'dark' ? 'light' : 'dark';
              localStorage.setItem('theme', newMode);
              document.documentElement.setAttribute('data-theme', newMode);
              setState(prev => ({ ...prev, mode: newMode }));
            }}
            className="p-2 rounded-md transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card">
             {user?.avatarUrl && <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full" />}
             <span className="text-[10px] font-bold">{user?.name}</span>
          </div>
          <button 
            onClick={handleLogout} 
            aria-label="Log out" 
            aria-haspopup="dialog"
            aria-expanded={showLogoutConfirm}
            className="p-2 rounded-md transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden flex-col lg:flex-row relative">
        
        {/* VIEW 1: PREPARE */}
        {state.viewMode === 'prepare' && (
           <>
            <section className="flex-1 flex flex-col min-w-0 p-6 bg-background">
                {/* Framed Editor */}
                <div className="flex-1 flex flex-col rounded-xl border border-border overflow-hidden relative shadow-sm bg-card">
                    
                    {/* Title Bar */}
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                <FileText className="w-4 h-4 text-[var(--color-accent-primary)]" /> Script Preparation
                            </h2>
                            <span className="text-xs text-muted-foreground hidden sm:inline-block">
                              Paste your script and let AI format it for TTS.
                            </span>
                        </div>
                        
                        {/* Validation Status / Actions */}
                        <div className="flex items-center gap-3">
                            {state.isAuditing ? (
                              <div className="flex items-center gap-2 bg-[var(--color-accent-primary-subtle)] border border-[var(--color-accent-primary)]/20 px-3 py-1.5 rounded-full animate-pulse">
                                  <ScanSearch className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent-primary)]">Scanning</span>
                              </div>
                            ) : isDirty ? (
                              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Unchecked</span>
                              </div>
                            ) : hasIssues ? (
                              <div className="flex items-center gap-3" aria-live="polite">
                                  <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-full">
                                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-destructive">{state.scriptIssues.length} Issues</span>
                                  </div>
                                  <button onClick={handleAutoFix} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0">
                                      <Sparkles className="w-3 h-3" /> Auto-Fix All
                                  </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Valid</span>
                              </div>
                            )}
                        </div>
                    </div>

                    {/* Text Area */}
                    <div className="flex-1 relative">
                      <HighlightedTextarea
                        value={state.text}
                        onChange={(e) => setState(prev => ({ ...prev, text: e.target.value }))}
                        disabled={state.isLoading || state.isAnalyzing}
                        className="vs-script-text absolute inset-0 w-full h-full p-8 bg-transparent focus:outline-none resize-none selection:bg-[var(--color-accent-primary-subtle)] selection:text-transparent placeholder:text-transparent"
                        placeholder="Paste your script here..."
                      />

                      {state.isAnalyzing && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10" aria-live="polite">
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent-primary)]" />
                            <p className="font-bold text-[10px] tracking-widest uppercase opacity-60">Synthesizing changes...</p>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
            </section>

            {/* Sidebar for Analysis Changes & Proceed */}
            <aside className="w-full lg:w-[400px] p-6 space-y-6 overflow-y-auto shrink-0 border-l border-border flex flex-col bg-muted/30">
                {state.analysisChanges.length > 0 && (
                  <div className="flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider text-foreground">
                       <Sparkles className="w-3.5 h-3.5 text-amber-500"/> AI Improvements
                    </h3>
                    <div className="text-[9px] font-bold px-2 py-1 rounded text-muted-foreground bg-muted">{state.analysisChanges.length}</div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto min-h-0">
                  {state.analysisChanges.length > 0 && (
                    <ul className="space-y-4">
                        {state.analysisChanges.map((change, i) => (
                            <li key={i} className="border border-border rounded-xl p-2 space-y-2 group/change relative bg-card shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[11px] font-bold uppercase tracking-wide leading-tight text-foreground">
                                    {change.description}
                                  </p>
                                  <button 
                                    onClick={() => handleRevertChange(change)}
                                    className="p-1.5 rounded-md transition-colors border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground shrink-0"
                                    title="Revert this change"
                                    aria-label="Revert this change"
                                  >
                                    <Undo2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <div className="vs-diff-before">
                                    {renderHighlightedText(change.originalSnippet)}
                                  </div>
                                  <div className="vs-diff-after">
                                    {renderHighlightedText(change.newSnippet)}
                                  </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                  )}
                </div>

                <div className="mt-auto space-y-4 pt-4 border-t border-border shrink-0">
                   {state.previousText && (
                       <button 
                         onClick={revertChanges} 
                         className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-bold border border-border rounded-lg transition-all uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent"
                       >
                           <Undo2 className="w-3.5 h-3.5" /> Revert All Changes
                       </button>
                   )}

                   <div className="flex flex-col gap-3 mb-4">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Preparation Options</p>
                       
                       <label className="flex items-start gap-3 cursor-pointer group select-none">
                           <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${prepMode === 'full' ? 'border-[var(--color-accent-primary)]' : 'border-muted-foreground group-hover:border-[var(--color-accent-primary)]'}`}>
                               {prepMode === 'full' && <div className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]" />}
                           </div>
                           <input type="radio" className="sr-only" checked={prepMode === 'full'} onChange={() => setPrepMode('full')} />
                           <div className="text-left">
                               <span className={`block text-[11px] font-bold uppercase tracking-widest transition-colors ${prepMode === 'full' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>Review & Add Tags</span>
                               <span className="block text-[10px] text-muted-foreground mt-0.5">AI corrects grammar, flow, and adds SSML tags</span>
                           </div>
                       </label>

                       <label className="flex items-start gap-3 cursor-pointer group select-none">
                           <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${prepMode === 'tags' ? 'border-[var(--color-accent-primary)]' : 'border-muted-foreground group-hover:border-[var(--color-accent-primary)]'}`}>
                               {prepMode === 'tags' && <div className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]" />}
                           </div>
                           <input type="radio" className="sr-only" checked={prepMode === 'tags'} onChange={() => setPrepMode('tags')} />
                           <div className="text-left">
                               <span className={`block text-[11px] font-bold uppercase tracking-widest transition-colors ${prepMode === 'tags' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>Add Tags Only</span>
                               <span className="block text-[10px] text-muted-foreground mt-0.5">Keep my exact words, only add SSML tags</span>
                           </div>
                       </label>

                       <label className="flex items-start gap-3 cursor-pointer group select-none">
                           <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${prepMode === 'skip' ? 'border-[var(--color-accent-primary)]' : 'border-muted-foreground group-hover:border-[var(--color-accent-primary)]'}`}>
                               {prepMode === 'skip' && <div className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]" />}
                           </div>
                           <input type="radio" className="sr-only" checked={prepMode === 'skip'} onChange={() => setPrepMode('skip')} />
                           <div className="text-left">
                               <span className={`block text-[11px] font-bold uppercase tracking-widest transition-colors ${prepMode === 'skip' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>Skip Preparation</span>
                               <span className="block text-[10px] text-muted-foreground mt-0.5">My script is already tagged and ready</span>
                           </div>
                       </label>
                   </div>

                   {(prepMode === 'full' || prepMode === 'tags') && (
                       <button 
                         onClick={() => handleAnalyze()} 
                         disabled={state.isAnalyzing || !state.text.trim()} 
                         className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border text-[11px] font-bold uppercase tracking-widest shadow-sm transition-all bg-background hover:bg-accent text-foreground disabled:opacity-50"
                       >
                         <Sparkles className="w-4 h-4 text-amber-500" /> 
                         Prepare Copy
                       </button>
                   )}

                   {(prepMode === 'skip' || prepMode === null) && (
                       <button 
                          onClick={() => setState(prev => ({ ...prev, viewMode: 'preview' }))}
                          disabled={prepMode === null || isBlocked || state.text.length === 0 || state.isAnalyzing}
                          className="w-full px-8 py-4 rounded-md bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-[var(--color-accent-on-accent)] text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-lg"
                        >
                          <span className="vs-button-text">Proceed to Preview</span> <ChevronRight className="w-4 h-4" />
                        </button>
                   )}
                </div>
            </aside>
           </>
        )}

        {/* VIEW 2: PREVIEW */}
        {state.viewMode === 'preview' && (
           <>
            <section className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden p-6 bg-background">
               <div className="flex-1 flex flex-col rounded-xl border border-border transition-all overflow-hidden relative shadow-sm bg-card">
                   <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
                     <div className="flex items-center gap-3">
                         <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                           <Layers className="w-4 h-4 text-[var(--color-accent-primary)]" /> Script Editor
                         </h2>
                         <span className="text-xs text-muted-foreground hidden sm:inline-block">
                           Review your script above before generating audio previews.
                         </span>
                     </div>
                     <button onClick={() => setState(prev => ({ ...prev, viewMode: 'prepare' }))} className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Prepare
                     </button>
                   </div>
                   
                   {/* Editor Area */}
                   <HighlightedTextarea
                        ref={editorRef}
                        value={state.text}
                        onChange={(e) => setState(prev => ({ ...prev, text: e.target.value }))}
                        containerClassName="flex-1 w-full flex flex-col min-h-0"
                        className="vs-script-text flex-1 w-full bg-transparent px-8 py-6 resize-none focus:outline-none block overflow-y-auto selection:bg-[var(--color-accent-primary-subtle)] selection:text-transparent placeholder:text-transparent"
                        placeholder="Enter text..."
                      />
                      
                      {/* Actions Toolbar (Collapsed by default) */}
                      {showActions ? (
                         <div className="shrink-0 z-10">
                            <ActionToolbar onInsert={insertTag} onClose={() => setShowActions(false)} palette={palette} />
                         </div>
                      ) : (
                         /* Floating Toggle Button */
                         <div className="absolute bottom-6 right-6 z-20">
                            <button 
                              onClick={() => setShowActions(true)}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all hover:scale-105 active:scale-95 bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)] hover:bg-[var(--color-accent-primary-hover)]"
                              aria-expanded={showActions}
                              aria-haspopup="true"
                            >
                               <Sparkles className="w-4 h-4" />
                               <span className="vs-button-text">Add Action</span>
                            </button>
                         </div>
                      )}
                  </div>
            </section>

            <aside className="w-full lg:w-[380px] p-8 space-y-8 overflow-y-auto shrink-0 border-l border-border bg-muted/30">
              <div className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="persona-select" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Persona Style</label>
                    <div className="relative">
                      <select 
                        id="persona-select"
                        value={state.persona} 
                        onChange={(e) => setState(prev => ({ ...prev, persona: e.target.value as PersonaType }))}
                        className="w-full p-3 rounded-md text-sm font-medium border border-border outline-none capitalize bg-card text-foreground appearance-none"
                      >
                        {['nigerian', 'british', 'american', 'storyteller', 'corporate', 'neutral'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="speed-range" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex justify-between">
                    <span>Speed</span> <span className="text-foreground">{speed.toFixed(1)}X</span>
                  </label>
                  <input id="speed-range" type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full h-1.5 bg-border rounded-lg cursor-pointer accent-foreground" />
                </div>
              </div>

              <VoiceSelector selectedVoice={state.voice} onSelect={(v) => setState(prev => ({ ...prev, voice: v }))} />

              <div className="sticky bottom-0 bg-transparent pt-4 space-y-3">
                {state.error && state.error !== "QUOTA_EXHAUSTED" && state.viewMode === 'preview' && (
                   <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-[10px] text-destructive font-bold" aria-live="polite">
                     {state.error}
                   </div>
                )}
                <div className="flex justify-between items-center px-1 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preview Audio</span>
                  <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
                    <Activity className="w-3 h-3" /> ~{estimatedTokens} tokens
                  </span>
                </div>
                <AudioPlayer 
                  audioUrl={state.audioUrl} 
                  isLoading={state.isLoading} 
                  onAction={() => handleGenerate(false)} 
                  actionLabel="Preview Audio"
                  hasText={state.text.length > 0} 
                  speed={speed} 
                  disabled={false}
                  isMaster={false}
                />

                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={() => setState(prev => ({ ...prev, viewMode: 'finalize', audioUrl: null, masterUrls: null }))}
                    disabled={state.text.length === 0}
                    className="w-full py-3.5 rounded-md font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-[var(--color-accent-on-accent)] shadow-md"
                  >
                    <span>Proceed to Produce</span> <ChevronRight className="w-4 h-4" />
                  </button>
                  {state.lastUsage > 0 && (
                    <div className="flex items-center justify-center gap-1.5 py-1">
                      <Coins className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                        Last Request: <span className="text-[var(--color-accent-primary)]">{state.lastUsage}</span> Tokens
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </aside>
           </>
        )}

        {/* VIEW 3: FINALIZE */}
        {state.viewMode === 'finalize' && (
           <>
            <section className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden p-6 bg-background">
               <div className="flex-1 flex flex-col rounded-xl border border-border transition-all overflow-hidden relative shadow-sm bg-card">
                   <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
                     <div className="flex items-center gap-3">
                         <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                             <CheckCircle className="w-4 h-4 text-[var(--color-accent-primary)]" /> Produce Audio
                         </h2>
                         <span className="text-xs text-muted-foreground hidden sm:inline-block">Review & Export</span>
                     </div>
                     <button onClick={() => setState(prev => ({ ...prev, viewMode: 'preview', audioUrl: null, masterUrls: null }))} className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Preview
                     </button>
                   </div>
                   
                   <div className="flex-1 flex flex-col min-h-0 relative bg-background">
                      <div className="absolute top-0 left-0 right-0 p-4 backdrop-blur z-10 border-b border-border flex items-center justify-between bg-background/80">
                         <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                           <Lock className="w-3 h-3" /> Locked Script
                         </div>
                      </div>
                      <div className="vs-script-locked flex-1 overflow-y-auto p-8 pt-16 whitespace-pre-wrap">
                         {renderHighlightedText(state.text)}
                      </div>
                   </div>
               </div>
            </section>

            <aside className="w-full lg:w-[380px] p-8 space-y-8 overflow-y-auto shrink-0 border-l border-border bg-muted/30">
               {/* Metadata Card */}
               <div className="p-5 border border-border rounded-xl space-y-5 bg-card">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Voice Talent</div>
                      <div className="text-[var(--color-accent-primary)] font-bold flex items-center gap-2 text-sm">
                        <Mic className="w-3.5 h-3.5" /> {state.voice}
                      </div>
                    </div>
                    
                    <div className="h-px w-full bg-border" />

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Persona</div>
                      <div className="font-bold capitalize text-sm text-foreground">{state.persona}</div>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="space-y-1">
                       <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Speed</div>
                       <div className="font-bold text-sm text-foreground">{speed}x</div>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="space-y-1">
                       <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Session Usage</div>
                       <div className="text-[var(--color-accent-primary)] font-bold text-sm flex items-center gap-2">
                         <Coins className="w-3.5 h-3.5" /> {state.sessionUsage.toLocaleString()} Tokens
                       </div>
                    </div>
               </div>

               {/* Action Card */}
               <div className="p-5 border border-border rounded-xl flex flex-col gap-4 bg-muted/30">
                    <div>
                       <h3 className="text-sm font-bold mb-1 text-foreground">Generate Master</h3>
                       <p className="text-[10px] leading-relaxed text-muted-foreground">
                         Generates a production-ready WAV file.
                       </p>
                       {!state.masterUrls && (
                         <p className="text-[10px] font-medium text-[var(--color-accent-primary)] mt-2 flex items-center gap-1.5">
                           <Activity className="w-3 h-3" />
                           Estimated Cost: ~{estimatedTokens} tokens
                         </p>
                       )}
                    </div>

                    {/* Show error if present in Action Card specifically for finalize view context if needed, though global error is at top */}
                    {state.error && state.error !== "QUOTA_EXHAUSTED" && state.viewMode === 'finalize' && (
                       <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-[10px] text-destructive font-bold" aria-live="polite">
                         {state.error}
                       </div>
                    )}
                    
                    {/* Render standard player button to trigger generation, OR show download links if ready */}
                    {!state.masterUrls ? (
                      <AudioPlayer 
                          audioUrl={null} 
                          isLoading={state.isLoading} 
                          onAction={() => handleGenerate(true)} 
                          actionLabel="Generate WAV"
                          hasText={true} 
                          speed={speed} 
                          disabled={false}
                          isMaster={true}
                      />
                    ) : (
                      <div className="space-y-3 animate-in fade-in zoom-in-95">
                          <div className="text-center text-[10px] font-bold uppercase tracking-widest py-2 border-b text-[var(--color-accent-primary)] border-[var(--color-accent-primary)]/20">
                             Ready for Download
                          </div>

                          <div className="flex flex-col gap-2">
                            <a 
                              href={state.masterUrls.wav}
                              download={`VoiceStudio_${state.voice}.wav`}
                              className="w-full py-3 rounded-md flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-border transition-all bg-card hover:bg-accent text-foreground"
                            >
                               <Music className="w-3.5 h-3.5" /> Download WAV
                            </a>
                          </div>

                          <div className="pt-2 border-t border-dashed border-border">
                             <AudioPlayer 
                                audioUrl={state.audioUrl} 
                                isLoading={false} 
                                onAction={() => {}} 
                                actionLabel="Playback"
                                hasText={true} 
                                speed={speed} 
                                disabled={false}
                                isMaster={false} 
                              />
                          </div>
                      </div>
                    )}
               </div>
            </aside>
           </>
        )}

      </main>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-labelledby="history-modal-title" className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h2 id="history-modal-title" className="font-bold text-foreground">Version History</h2>
                <p className="text-xs text-muted-foreground">Auto-saved snapshots of your project</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} aria-label="Close history modal" className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No history recorded yet. Start typing to auto-save.
                </div>
              ) : (
                history.map(snap => (
                  <button 
                    key={snap.id} 
                    className="w-full text-left p-4 border border-border rounded-lg hover:border-[var(--color-accent-primary)]/50 hover:bg-accent/50 cursor-pointer transition-all group"
                    onClick={() => handleRollback(snap)}
                    aria-label={`Restore version from ${new Date(snap.timestamp).toLocaleString()}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-bold text-[var(--color-accent-primary)]">
                        {new Date(snap.timestamp).toLocaleString()}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex gap-2">
                        <span>{snap.voice}</span>
                        <span>•</span>
                        <span>{snap.persona}</span>
                        <span>•</span>
                        <span>{snap.speed}x</span>
                      </div>
                    </div>
                    <div className="text-sm text-foreground line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      {renderHighlightedText(snap.text)}
                    </div>
                    <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Undo2 className="w-3 h-3" /> Click to Restore
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-labelledby="logout-modal-title" className="bg-card border border-border rounded-xl w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 p-6">
            <h2 id="logout-modal-title" className="font-bold text-lg text-foreground mb-2">Confirm Logout</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You have an active session. Logging out will discard your current work. Are you sure you want to continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-md font-medium text-sm transition-colors hover:bg-accent text-foreground border border-border"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-4 py-2 rounded-md font-medium text-sm transition-colors bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

const AuthConsumer: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent-primary)]" /></div>;
  
  if (user) {
    return <VoiceStudioApp />;
  }

  if (showLogin) {
    return <LoginScreen onBack={() => setShowLogin(false)} />;
  }

  return <LandingPage onNavigateToLogin={() => setShowLogin(true)} />;
}

export default App;
