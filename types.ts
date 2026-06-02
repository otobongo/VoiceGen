
export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export type PersonaType = 'neutral' | 'african' | 'nigerian' | 'british' | 'american' | 'storyteller' | 'corporate';

export type ModeType = 'light' | 'dark';
export type ViewMode = 'prepare' | 'preview' | 'finalize';

export interface VoiceOption {
  id: VoiceName;
  name: string;
  description: string;
  gender: 'Male' | 'Female';
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: VoiceName.Kore, name: 'Kore', description: 'Calm & soothing', gender: 'Female' },
  { id: VoiceName.Zephyr, name: 'Zephyr', description: 'Soft & gentle', gender: 'Female' },
  { id: VoiceName.Puck, name: 'Puck', description: 'Energetic & clear', gender: 'Male' },
  { id: VoiceName.Charon, name: 'Charon', description: 'Deep & authoritative', gender: 'Male' },
  { id: VoiceName.Fenrir, name: 'Fenrir', description: 'Strong & dynamic', gender: 'Male' },
];

export interface ScriptIssue {
  original: string;
  type: 'spelling' | 'non-english';
  suggestion: string;
}

export interface AnalysisChange {
  description: string;
  originalSnippet: string;
  newSnippet: string;
}

export interface MasterAudioUrls {
  wav: string;
}

export interface TTSState {
  text: string;
  previousText: string | null;
  voice: VoiceName;
  persona: PersonaType;
  isLoading: boolean;
  isAnalyzing: boolean;
  
  // Audio State
  audioUrl: string | null; // For previewing (WAV)
  masterUrls: MasterAudioUrls | null; // For finalizing
  
  error: string | null;
  previewDuration: number;
  mode: ModeType;
  viewMode: ViewMode;
  sessionUsage: number;
  lastUsage: number;
  
  // Audit State
  isAuditing: boolean;
  scriptIssues: ScriptIssue[];
  lastAuditedText: string | null;
  
  // Analysis Summary
  analysisChanges: AnalysisChange[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface GenerationResult {
  audioData: ArrayBuffer;
  usage: {
    totalTokens: number;
    promptTokens: number;
    candidatesTokens: number;
  }
}

export interface AuditResult {
  isValid: boolean;
  issues: ScriptIssue[];
  usage: {
    totalTokens: number;
  }
}
