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
      // Non-JSON error body. A 504 here is a Vercel function timeout
      // (plain-text "FUNCTION_INVOCATION_TIMEOUT"); surface it honestly rather
      // than as the generic "something went wrong".
      if (res.status === 504 || res.status === 408) code = 'TIMEOUT';
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
  chunkIndex: number;
  totalChunks: number;
}

/**
 * Single TTS request. For `scope: 'preview'` this returns the whole (short)
 * preview. For `scope: 'full'` it returns ONE chunk (`chunkIndex`) plus
 * `totalChunks`; the browser orchestrates the rest (see generateMasterAudio).
 */
export function generateSpeech(input: {
  text: string;
  voice: VoiceName;
  persona: PersonaType;
  scope: Scope;
  chunkIndex?: number;
}): Promise<SpeechResponse> {
  return postJson<SpeechResponse>('/api/generate-speech', input);
}

export interface MasterAudio {
  audioChunks: string[]; // ordered base64 PCM, ready to concatenate
  sampleRate: number;
  totalTokens: number | null;
}

/** How many chunk requests run at once. Balances speed vs. upstream throttling. */
const MASTER_CONCURRENCY = 3;

/**
 * Render a full master by orchestrating per-chunk requests from the browser, so
 * no single serverless call is long enough to time out (enables ~10 min audio).
 *
 * Flow: request chunk 0 -> learn totalChunks -> fan out the remaining chunks
 * with bounded concurrency -> assemble audio in order. `onProgress(done, total)`
 * fires as chunks complete so the UI can show progress.
 */
export async function generateMasterAudio(
  input: { text: string; voice: VoiceName; persona: PersonaType },
  onProgress?: (done: number, total: number) => void,
): Promise<MasterAudio> {
  const req = { ...input, scope: 'full' as Scope };

  // First chunk tells us how many there are.
  const first = await generateSpeech({ ...req, chunkIndex: 0 });
  const total = first.totalChunks;
  const ordered: string[] = new Array(total);
  ordered[0] = first.audioChunks[0];
  let tokens = first.totalTokens ?? 0;
  let done = 1;
  onProgress?.(done, total);

  // Remaining indices, processed by a small pool of workers.
  const queue: number[] = [];
  for (let i = 1; i < total; i++) queue.push(i);

  async function worker(): Promise<void> {
    for (;;) {
      const i = queue.shift();
      if (i === undefined) return;
      const res = await generateSpeech({ ...req, chunkIndex: i });
      ordered[i] = res.audioChunks[0];
      tokens += res.totalTokens ?? 0;
      done += 1;
      onProgress?.(done, total);
    }
  }

  const pool = Math.min(MASTER_CONCURRENCY, Math.max(1, queue.length));
  await Promise.all(Array.from({ length: pool }, () => worker()));

  return {
    audioChunks: ordered,
    sampleRate: first.sampleRate,
    totalTokens: tokens || null,
  };
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
