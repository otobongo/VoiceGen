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
 * preview. For `scope: 'full'` it returns ONE span (`chunkIndex`) plus
 * `totalChunks`; the browser orchestrates the rest (see generateMasterAudio).
 * `maxSpanChars` lets the orchestrator control span size (bigger = less drift,
 * smaller = safer under a slow service).
 */
export function generateSpeech(input: {
  text: string;
  voice: VoiceName;
  persona: PersonaType;
  scope: Scope;
  chunkIndex?: number;
  maxSpanChars?: number;
}): Promise<SpeechResponse> {
  return postJson<SpeechResponse>('/api/generate-speech', input);
}

export interface MasterAudio {
  audioChunks: string[]; // ordered base64 PCM, ready to concatenate
  sampleRate: number;
  totalTokens: number | null;
}

// Span-size ladder (chars). We render the LARGEST span first so the master has
// the fewest boundaries (= least persona drift). If the service is slow and a
// span times out, we step DOWN to a smaller, faster span and re-render the whole
// master. The matching concurrency drops the parallelism for big spans (a big
// span is already slow; firing several at once makes the model throttle, which
// is what CAUSES timeouts) and raises it for small spans.
const SPAN_LADDER: { maxSpanChars: number; concurrency: number }[] = [
  { maxSpanChars: 900, concurrency: 1 },
  { maxSpanChars: 600, concurrency: 2 },
  { maxSpanChars: 400, concurrency: 2 },
];

// Transient per-span failures retried IN PLACE (same span size, backoff).
// TIMEOUT is deliberately NOT here: a timeout means the span is too big for the
// service right now, so the LADDER handles it by re-rendering smaller instead.
const RETRYABLE_CODES = new Set([
  'RATE_LIMITED',
  'QUOTA_EXHAUSTED',
  'NO_AUDIO',
  'UPSTREAM_ERROR',
  'NETWORK',
  'UNKNOWN',
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch a single span, retrying transient failures with exponential backoff.
 * A TIMEOUT propagates immediately (no in-place retry) so the caller can fall
 * back to a smaller span size.
 */
async function fetchSpanWithRetry(
  req: { text: string; voice: VoiceName; persona: PersonaType; scope: Scope },
  chunkIndex: number,
  maxSpanChars: number,
  maxRetries = 4,
): Promise<SpeechResponse> {
  let delay = 1000;
  for (let attempt = 0; ; attempt++) {
    try {
      return await generateSpeech({ ...req, chunkIndex, maxSpanChars });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'UNKNOWN';
      if (code === 'TIMEOUT') throw err; // let the ladder step down
      if (attempt >= maxRetries || !RETRYABLE_CODES.has(code)) throw err;
      await sleep(delay + Math.random() * 400); // jitter avoids lockstep retries
      delay = Math.min(delay * 2, 8000);
    }
  }
}

/** Render the whole master at one fixed span size. Throws on TIMEOUT. */
async function renderAtSpan(
  req: { text: string; voice: VoiceName; persona: PersonaType; scope: Scope },
  maxSpanChars: number,
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<MasterAudio> {
  // First span tells us how many there are at this size.
  const first = await fetchSpanWithRetry(req, 0, maxSpanChars);
  const total = first.totalChunks;
  const ordered: string[] = new Array(total);
  ordered[0] = first.audioChunks[0];
  let tokens = first.totalTokens ?? 0;
  let done = 1;
  onProgress?.(done, total);

  const queue: number[] = [];
  for (let i = 1; i < total; i++) queue.push(i);

  async function worker(): Promise<void> {
    for (;;) {
      const i = queue.shift();
      if (i === undefined) return;
      const res = await fetchSpanWithRetry(req, i, maxSpanChars);
      ordered[i] = res.audioChunks[0];
      tokens += res.totalTokens ?? 0;
      done += 1;
      onProgress?.(done, total);
    }
  }

  const pool = Math.min(concurrency, Math.max(1, queue.length));
  await Promise.all(Array.from({ length: pool }, () => worker()));

  return { audioChunks: ordered, sampleRate: first.sampleRate, totalTokens: tokens || null };
}

/**
 * Render a full master by orchestrating per-span requests from the browser.
 *
 * Renders the LARGEST span size that the service can handle, for the fewest
 * boundaries and the least persona drift. If a span times out (slow service),
 * automatically re-renders the whole master at the next-smaller span size, so a
 * healthy service yields drift-minimal audio and a slow one degrades gracefully
 * instead of failing. `onProgress(done, total)` fires as spans complete (total
 * may change when the span size steps down).
 */
export async function generateMasterAudio(
  input: { text: string; voice: VoiceName; persona: PersonaType },
  onProgress?: (done: number, total: number) => void,
): Promise<MasterAudio> {
  const req = { ...input, scope: 'full' as Scope };

  let lastErr: unknown;
  for (let tier = 0; tier < SPAN_LADDER.length; tier++) {
    const { maxSpanChars, concurrency } = SPAN_LADDER[tier];
    try {
      return await renderAtSpan(req, maxSpanChars, concurrency, onProgress);
    } catch (err) {
      lastErr = err;
      const code = err instanceof ApiError ? err.code : 'UNKNOWN';
      // Only a TIMEOUT is worth retrying at a smaller span; anything else
      // (quota, bad input, etc.) won't be fixed by smaller spans -> surface it.
      if (code !== 'TIMEOUT' || tier === SPAN_LADDER.length - 1) throw err;
      // else: loop to the next (smaller) span tier and re-render.
    }
  }
  throw lastErr;
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
