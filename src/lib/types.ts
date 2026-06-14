// Client-side domain types and the catalog of voices, personas, and expression
// tags. The voice/persona unions mirror api/_shared/voice.ts (kept in sync by
// hand — small and stable).

export type VoiceName =
  | 'Fenrir'
  | 'Charon'
  | 'Puck'
  | 'Orus'
  | 'Algenib'
  | 'Kore'
  | 'Zephyr'
  | 'Aoede'
  | 'Leda'
  | 'Sulafat';

export type PersonaType =
  | 'neutral'
  | 'nigerian'
  | 'african'
  | 'british'
  | 'american'
  | 'storyteller'
  | 'corporate';

export type Scope = 'preview' | 'full';

export type ThemeMode = 'light' | 'dark';

// Signed-in user (from Firebase Auth).
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export type WizardStep = 'prepare' | 'preview' | 'finalize';

export const WIZARD_STEPS: WizardStep[] = ['prepare', 'preview', 'finalize'];

// Summary of the last AI "Prepare Copy" pass, shown in the result panel.
export interface AIImprovement {
  reviewedCopy: boolean;
  changedWording: boolean;
  contextCount: number;
}

// A detected "context": a coherent block of related lines, kept continuous
// (not paragraph-split) with [pause]/[break] cues for rhythm.
export interface ScriptContext {
  title: string;
  body: string;
}

// A spelling / non-English issue from the audit endpoint.
export interface AuditIssue {
  original: string;
  type: 'spelling' | 'non-english';
  suggestion: string;
}

// A word/phrasing edit the AI made during Prepare Copy (the "changes log").
export interface ScriptChange {
  original: string;
  replacement: string;
  reason: string;
}

// Joining cue placed between contexts so the spoken master has an audible
// boundary between one context and the next, without the long, cut-off silence
// of a [break]. A single [pause] reads as a natural beat; the AI reserves
// [break] for the rare dramatic boundary inside a body.
export const CONTEXT_SEPARATOR = '\n[pause]\n';

/** Compose detected contexts back into one script with breaks between them. */
export function composeContexts(contexts: ScriptContext[]): string {
  return contexts.map((c) => c.body.trim()).join(CONTEXT_SEPARATOR);
}

export type VoiceGender = 'Male' | 'Female';

export interface VoiceOption {
  id: VoiceName;
  name: string;
  // Tone descriptor shown in the list (Google publishes tone, not gender).
  tone: string;
  // Used only to drive the All / Male / Female tabs — never shown as a row label.
  gender: VoiceGender;
}

// Curated top 10 (Google's 8 flagship voices + 2 reviewer favorites),
// balanced 5 male / 5 female.
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Fenrir', name: 'Fenrir', tone: 'Excitable & strong', gender: 'Male' },
  { id: 'Charon', name: 'Charon', tone: 'Deep & informative', gender: 'Male' },
  { id: 'Puck', name: 'Puck', tone: 'Upbeat & friendly', gender: 'Male' },
  { id: 'Orus', name: 'Orus', tone: 'Firm & decisive', gender: 'Male' },
  { id: 'Algenib', name: 'Algenib', tone: 'Gravelly & textured', gender: 'Male' },
  { id: 'Kore', name: 'Kore', tone: 'Firm & professional', gender: 'Female' },
  { id: 'Zephyr', name: 'Zephyr', tone: 'Bright & clear', gender: 'Female' },
  { id: 'Aoede', name: 'Aoede', tone: 'Breezy & warm', gender: 'Female' },
  { id: 'Leda', name: 'Leda', tone: 'Youthful & light', gender: 'Female' },
  { id: 'Sulafat', name: 'Sulafat', tone: 'Warm & rich', gender: 'Female' },
];

export interface PersonaOption {
  id: PersonaType;
  label: string;
}

export const PERSONA_OPTIONS: PersonaOption[] = [
  { id: 'nigerian', label: 'Nigerian' },
  { id: 'african', label: 'African' },
  { id: 'british', label: 'British' },
  { id: 'american', label: 'American' },
  { id: 'storyteller', label: 'Storyteller' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'neutral', label: 'Neutral' },
];

// Expression tags grouped so the palette reads as a small set of intents
// rather than a wall of 18 buttons.
export interface ExpressionTag {
  id: string;
  tag: string;
  label: string;
  hint: string;
}

export interface ExpressionGroup {
  id: string;
  label: string;
  tags: ExpressionTag[];
}

export const EXPRESSION_GROUPS: ExpressionGroup[] = [
  {
    id: 'timing',
    label: 'Timing',
    tags: [
      { id: 'pause', tag: '[pause]', label: 'Pause', hint: 'A short, natural break.' },
      { id: 'break', tag: '[break]', label: 'Break', hint: 'A longer silence for emphasis.' },
      { id: 'short', tag: '[short]', label: 'Beat', hint: 'A brief trailing beat (…).' },
    ],
  },
  {
    id: 'emotion',
    label: 'Emotion',
    tags: [
      { id: 'happy', tag: '[happy]', label: 'Happy', hint: 'Cheerful, bright, upbeat.' },
      { id: 'sad', tag: '[sad]', label: 'Sad', hint: 'Somber and mournful.' },
      { id: 'angry', tag: '[angry]', label: 'Angry', hint: 'Stern and forceful.' },
      { id: 'excited', tag: '[excited]', label: 'Excited', hint: 'High, eager energy.' },
      { id: 'confused', tag: '[confused]', label: 'Confused', hint: 'Hesitant and uncertain.' },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    tags: [
      { id: 'whisper', tag: '[whisper]', label: 'Whisper', hint: 'Breathy, intimate, quiet.' },
      { id: 'shout', tag: '[shout]', label: 'Shout', hint: 'Projected with power.' },
      { id: 'slow', tag: '[slow]', label: 'Slow', hint: 'Deliberate, measured pace.' },
      { id: 'fast', tag: '[fast]', label: 'Fast', hint: 'Quick, brisk pace.' },
      { id: 'breathy', tag: '[breathy]', label: 'Breathy', hint: 'Audible breath texture.' },
      { id: 'stutter', tag: '[stutter]', label: 'Stutter', hint: 'Slight rhythmic repetition.' },
    ],
  },
  {
    id: 'style',
    label: 'Style',
    tags: [
      { id: 'mysterious', tag: '[mysterious]', label: 'Mystic', hint: 'Intriguing, cinematic.' },
      { id: 'suspense', tag: '[suspense]', label: 'Suspense', hint: 'Building tension.' },
      { id: 'announcer', tag: '[announcer]', label: 'Announcer', hint: 'Upbeat broadcast presence.' },
      { id: 'news', tag: '[news]', label: 'News', hint: 'Neutral, objective reporting.' },
      { id: 'robotic', tag: '[robotic]', label: 'Robotic', hint: 'Flat, mechanical monotone.' },
      { id: 'formal', tag: '[formal]', label: 'Formal', hint: 'Precise, professional.' },
      { id: 'relaxed', tag: '[relaxed]', label: 'Relaxed', hint: 'Casual, conversational.' },
      { id: 'energetic', tag: '[energetic]', label: 'Energetic', hint: 'Spirited and driven.' },
    ],
  },
];

export interface Take {
  id: string;
  audioUrl: string;
  voice: VoiceName;
  persona: PersonaType;
  scope: Scope;
  speed: number;
  createdAt: number;
  label: string;
}

// Keep in sync with api/_shared/voice.ts. ~10000 chars covers a ~10-12 min
// master render (rendered one chunk per request, so it never times out).
export const MAX_TEXT_LENGTH = 10000;

// Human-readable copy for each server error code.
export const ERROR_MESSAGES: Record<string, string> = {
  QUOTA_EXHAUSTED:
    'The daily quota for this key is used up. Try again later or use a key with higher limits.',
  RATE_LIMITED: 'Too many requests in a short window. Give it a moment, then retry.',
  SERVER_MISCONFIGURED:
    'The server is missing its API key. Set GEMINI_API_KEY and redeploy.',
  UNAUTHENTICATED: 'Your session expired. Please sign in again.',
  UPSTREAM_AUTH: 'The voice service rejected the request. Check the API key configuration.',
  UPSTREAM_ERROR: 'The voice service had a problem. Please try again.',
  NO_AUDIO: 'No audio came back from the voice service. Try rephrasing or regenerating.',
  NO_AUDIO_TO_EXPORT:
    'There’s no rendered audio to download yet. Generate a take first, then export.',
  EXPORT_FAILED:
    'Couldn’t build the .WAV file from this take. Try regenerating the audio, then download again.',
  DOWNLOAD_FAILED:
    'The file was built but the browser blocked the download. Check your browser’s download permissions and try again.',
  EMPTY_TEXT: 'Write something first.',
  TEXT_TOO_LONG: `Your script is over the ${MAX_TEXT_LENGTH.toLocaleString()} character limit.`,
  INVALID_VOICE: 'That voice is not available. Pick another.',
  INVALID_PERSONA: 'That accent is not available. Pick another.',
  BAD_CHUNK: 'A part of the render was out of range. Please regenerate.',
  TIMEOUT:
    'That part took too long and timed out. Try again, or shorten the script slightly.',
  NETWORK: 'Could not reach the server. Check your connection and try again.',
  UNKNOWN: 'Something went wrong. Please try again.',
};
