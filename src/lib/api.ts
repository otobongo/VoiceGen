// The browser's only contact with the backend. No Gemini SDK, no API key here:
// everything goes through our own /api routes, which hold the key server-side.

import type {
  AuditIssue,
  PersonaType,
  Scope,
  ScriptChange,
  ScriptContext,
  VoiceName,
} from './types';

/** Error carrying a stable server error code (see ERROR_MESSAGES). */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// Auth registers a token provider so requests carry the Firebase ID token.
// When server-verification is active, the API checks it; otherwise it's ignored.
let authTokenProvider: (() => Promise<string | null>) | null = null;
export function setAuthTokenProvider(fn: () => Promise<string | null>): void {
  authTokenProvider = fn;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authTokenProvider) {
    try {
      const token = await authTokenProvider();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      /* no token available; proceed unauthenticated */
    }
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    // Network / DNS / offline.
    throw new ApiError('NETWORK', 0);
  }

  if (!res.ok) {
    let code = 'UNKNOWN';
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) code = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(code, res.status);
  }

  return (await res.json()) as T;
}

export interface SpeechResponse {
  audioChunks: string[]; // base64 PCM chunks, concatenated client-side
  sampleRate: number;
  scope: Scope;
  totalTokens: number | null;
}

export function generateSpeech(input: {
  text: string;
  voice: VoiceName;
  persona: PersonaType;
  scope: Scope;
}): Promise<SpeechResponse> {
  return postJson<SpeechResponse>('/api/generate-speech', input);
}

export interface PrepareResponse {
  contexts: ScriptContext[];
  changedWording: boolean;
  changes: ScriptChange[];
}

/**
 * One pass: structures the script into contexts and prepares each (prosody
 * tags, optional grammar/flow review, optional instruction). Also returns the
 * specific word/phrasing edits it made (the changes log).
 */
export function prepareCopy(input: {
  text: string;
  reviewCopy?: boolean;
  instruction?: string;
}): Promise<PrepareResponse> {
  return postJson<PrepareResponse>('/api/prepare-copy', input);
}

export interface AuditResponse {
  isValid: boolean;
  issues: AuditIssue[];
  totalTokens: number | null;
}

/** Proofread the script for spelling / non-English issues before generating. */
export function auditScript(input: { text: string }): Promise<AuditResponse> {
  return postJson<AuditResponse>('/api/audit', input);
}
