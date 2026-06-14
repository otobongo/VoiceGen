// POST /api/generate-speech
// Server-side TTS proxy. The Gemini API key never leaves the server; the
// browser only ever talks to this endpoint.
//
// Long single-shot TTS generations are known to DRIFT and speed up after a
// minute or two. We mitigate that two ways (matching the approach proven on the
// other build): (1) prepend a steady-pace instruction to every request, and
// (2) split the script into sentence-aware chunks (~1000 chars).
//
// To support long (up to ~10 min) renders without hitting the 60s Vercel
// function ceiling, generation is CLIENT-ORCHESTRATED for full scope: each
// invocation synthesizes exactly ONE chunk (selected by `chunkIndex`) and
// reports `totalChunks`, so the browser can request the chunks (with progress
// + bounded concurrency) and concatenate them. No single invocation runs long
// enough to time out, and the splitting stays a single source of truth here on
// the server.
//
// Body: {
//   text: string, voice: VoiceName, persona: PersonaType,
//   scope?: 'preview' | 'full',
//   chunkIndex?: number   // full scope only; which chunk to synthesize (default 0)
// }
// Returns: {
//   audioChunks: string[] (base64 PCM), sampleRate, scope, totalTokens,
//   chunkIndex, totalChunks
// }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Modality } from '@google/genai';
import {
  MAX_TEXT_LENGTH,
  personaClause,
  processTags,
  isValidVoice,
  isValidPersona,
} from './_shared/voice.js';
import {
  classifyError,
  getClientIp,
  getGeminiClient,
  rateLimit,
  withRetry,
} from './_shared/http.js';
import { requireAuth } from './_shared/auth.js';

// Gemini 2.5 Flash TTS returns 24kHz mono 16-bit PCM.
const TTS_SAMPLE_RATE = 24000;
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// ~2.5 words/sec is a rough speaking rate; used to truncate preview requests.
const WORDS_PER_SECOND = 2.5;
const PREVIEW_SECONDS = 10;

// Rate limit: generation is the expensive path, but a single long render fans
// out into one request per chunk (~12 for a 10-min script at the size below).
// Budget enough for a long render plus headroom per IP.
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

// Span size balances TWO competing failures:
//  - too BIG: render time explodes past Vercel's 60s ceiling (measured: 400ch
//    ~13s, 600ch ~10-12s, 700ch ~23s, ~1000ch+ can blow past 180s and fail).
//  - too SMALL: every span is an INDEPENDENT model generation, so the model
//    re-rolls the accent AND voice at each boundary -> audible persona drift.
//    Fewer, larger spans = less drift.
// The client renders the LARGEST span that fits (default 900, ~30-40s healthy)
// and, if a span times out under a slow service, automatically retries the whole
// render at a smaller span (600, then 400) via the `maxSpanChars` body param.
// So healthy renders are drift-minimal and slow-service renders degrade
// gracefully instead of failing. The shared seed (derived from the FULL text, so
// it is stable even when the span size changes) + low temperature keep the voice
// consistent across whatever spans we end up with.
const DEFAULT_MAX_SPAN_CHARS = 900;
const MIN_SPAN_CHARS = 200;
const MAX_SPAN_CHARS = 1100; // hard ceiling; bigger risks the 60s wall

// Per-call budget below Vercel's 60s function cap. If the model hasn't returned
// by this, abort and report a clean TIMEOUT (so the client falls back) rather
// than letting Vercel kill the function with a plain-text 504.
const CALL_BUDGET_MS = 52_000;

// Build the prompt sent to the TTS model. Gemini TTS takes style direction as
// natural-language text, but a "vague" prompt occasionally makes it READ THE
// DIRECTION ALOUD (the "Critical Instructions" leak). Per Google's TTS guidance,
// we minimize that by using a clearly LABELLED preamble, an explicit content
// delimiter, and an instruction to speak only the transcript. Direction is still
// upheld (accent + steady pace); it just isn't voiced.
//   accentClause: short accent/style sentence (may be empty for neutral).
//   chunk:        the words to actually speak.
function buildDirectedPrompt(accentClause: string, chunk: string): string {
  const direction =
    (accentClause ? accentClause + ' ' : '') +
    'Maintain a steady, even, natural pace throughout, and do not rush.';
  return (
    `Voice direction: ${direction} Speak ONLY the transcript text below; ` +
    `do not read this direction aloud.\nTranscript:\n${chunk}`
  );
}

// Split a single block into sentence-aware pieces no longer than maxLen.
function splitSentences(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) ?? [text];
  const out: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    // A single sentence longer than maxLen: hard-split on whitespace as a last
    // resort so we never exceed the span (and so the call can't run too long).
    if (sentence.length > maxLen) {
      if (current.trim()) {
        out.push(current.trim());
        current = '';
      }
      let rest = sentence;
      while (rest.length > maxLen) {
        let cut = rest.lastIndexOf(' ', maxLen);
        if (cut <= 0) cut = maxLen;
        out.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut);
      }
      current = rest;
      continue;
    }
    if (current.length + sentence.length > maxLen && current.length > 0) {
      out.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim().length > 0) out.push(current.trim());
  return out;
}

// Split processed text into spans no longer than maxLen, preferring NATURAL
// boundaries so any voice shift between spans lands on a pause the listener
// already expects. processTags has turned [break] -> "\n\n" and [pause] -> "\n",
// so we pack whole blocks (split on blank lines, then single newlines) up to the
// span size, and only fall back to sentence/word splitting inside an oversize
// block. Fewer, boundary-aligned spans = far less perceptible persona drift.
function chunkText(text: string, maxLen = DEFAULT_MAX_SPAN_CHARS): string[] {
  // Natural blocks: paragraphs ([break]) first, then lines ([pause]).
  const blocks: string[] = [];
  for (const para of text.split(/\n{2,}/)) {
    for (const line of para.split(/\n/)) {
      if (line.trim()) blocks.push(line.trim());
    }
  }
  if (blocks.length === 0) blocks.push(text);

  const spans: string[] = [];
  let current = '';
  for (const block of blocks) {
    // Oversize block: flush, then sentence-split it into its own spans.
    if (block.length > maxLen) {
      if (current.trim()) {
        spans.push(current.trim());
        current = '';
      }
      for (const piece of splitSentences(block, maxLen)) spans.push(piece);
      continue;
    }
    // Would overflow the current span: start a new one at this natural boundary.
    if (current.length + block.length + 1 > maxLen && current.length > 0) {
      spans.push(current.trim());
      current = '';
    }
    current += (current ? ' ' : '') + block;
  }
  if (current.trim().length > 0) spans.push(current.trim());

  // Drop spans with no speakable characters.
  return spans.filter((c) => /[a-z0-9]/i.test(c));
}

// Low temperature makes the voice render more deterministic, so independent
// chunk calls produce a more consistent voice/accent (less drift). A fixed seed
// shared across all chunks of one render anchors them to the same realization.
const TTS_TEMPERATURE = 0.55;

// Stable seed derived from the render's identity (text+voice+persona) so every
// chunk of the SAME script uses the same seed -> mutually consistent voice.
function renderSeed(text: string, voice: string, persona: string): number {
  let h = 2166136261;
  const s = `${voice}|${persona}|${text}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 2147483647;
}

// Reject with a TIMEOUT-classified error if `promise` hasn't settled by the
// deadline, so we surface a clean 504 the client can fall back on instead of
// letting Vercel kill the function with an unparseable plain-text 504.
function withDeadline<T>(promise: Promise<T>, msLeft: number): Promise<T> {
  if (msLeft <= 0) return Promise.reject(new Error('TIMEOUT'));
  // If `promise` settles AFTER the timeout wins the race, swallow its result so
  // a late rejection doesn't surface as an unhandled promise rejection.
  promise.catch(() => {});
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('TIMEOUT')), msLeft);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

// Synthesize a single span. The accent direction MUST lead every span (not just
// the first) or the accent is lost partway through a multi-span render;
// buildDirectedPrompt wraps it in the leak-resistant labelled format. A shared
// seed + low temperature keep the voice consistent across spans.
// withRetry handles thrown 429s; the TTS model also intermittently returns a 200
// with NO audio (especially under throttling), so we additionally retry an empty
// result a few times with backoff. The whole call is bounded by `deadline` (an
// epoch ms) so it cannot overrun Vercel's function ceiling. Returns the base64
// PCM (or undefined if it never produced audio) + tokens; throws Error('TIMEOUT')
// if the deadline passes.
async function synthesizeChunk(
  ai: ReturnType<typeof getGeminiClient>,
  chunk: string,
  voice: string,
  accentClause: string,
  seed: number,
  deadline: number,
): Promise<{ audio: string | undefined; tokens: number }> {
  const prompt = buildDirectedPrompt(accentClause, chunk);
  const maxEmptyRetries = 3;
  for (let attempt = 0; attempt <= maxEmptyRetries; attempt++) {
    const response = await withDeadline(
      withRetry(() =>
        ai.models.generateContent({
          model: TTS_MODEL,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            temperature: TTS_TEMPERATURE,
            seed,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
          },
        }),
      ),
      deadline - Date.now(),
    );
    const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const tokens = response.usageMetadata?.totalTokenCount ?? 0;
    if (audio) return { audio, tokens };
    if (attempt < maxEmptyRetries) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  return { audio: undefined, tokens: 0 };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`speech:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  res.setHeader('X-RateLimit-Limit', String(limit.limit));
  res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((limit.resetAt - Date.now()) / 1000)));
    res.status(429).json({ error: 'RATE_LIMITED' });
    return;
  }

  // Auth check (inactive until FIREBASE_SERVICE_ACCOUNT is configured).
  if (!(await requireAuth(req, res))) return;

  // ---- Validate input ----
  const body = (req.body ?? {}) as Record<string, unknown>;
  const text = typeof body.text === 'string' ? body.text : '';
  const { voice, persona } = body;
  const scope = body.scope === 'full' ? 'full' : 'preview';
  // For full scope, the client requests one span at a time. Default to 0 so a
  // caller that omits it still gets the first span (and learns totalChunks).
  const requestedChunk =
    typeof body.chunkIndex === 'number' && Number.isInteger(body.chunkIndex)
      ? body.chunkIndex
      : 0;
  // Span size is client-controlled so it can retry the whole render at a smaller
  // size if a big span times out. Clamp to a safe range.
  const maxSpanChars =
    typeof body.maxSpanChars === 'number' && Number.isFinite(body.maxSpanChars)
      ? Math.min(MAX_SPAN_CHARS, Math.max(MIN_SPAN_CHARS, Math.floor(body.maxSpanChars)))
      : DEFAULT_MAX_SPAN_CHARS;

  if (!text.trim()) {
    res.status(400).json({ error: 'EMPTY_TEXT' });
    return;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    res.status(413).json({ error: 'TEXT_TOO_LONG', max: MAX_TEXT_LENGTH });
    return;
  }
  if (!isValidVoice(voice)) {
    res.status(400).json({ error: 'INVALID_VOICE' });
    return;
  }
  if (!isValidPersona(persona)) {
    res.status(400).json({ error: 'INVALID_PERSONA' });
    return;
  }

  // ---- Truncate for preview scope ----
  let rawText = text;
  if (scope === 'preview') {
    const wordCap = Math.floor(PREVIEW_SECONDS * WORDS_PER_SECOND);
    const words = text.split(/\s+/);
    if (words.length > wordCap) {
      rawText = words.slice(0, wordCap).join(' ') + '...';
    }
  }

  // Process tags ONCE on the whole script (persona-free), then split into spans
  // at natural boundaries (up to maxSpanChars). The persona/accent prefix is
  // applied per span at synthesis time so the accent persists across every span.
  const optimizedText = processTags(rawText);
  const chunks = chunkText(optimizedText, maxSpanChars);
  if (chunks.length === 0) {
    res.status(400).json({ error: 'EMPTY_TEXT' });
    return;
  }

  // Full scope: synthesize ONLY the requested chunk so no invocation runs long.
  // (Preview scope is already short, so it does its 1-2 chunks in one call.)
  if (scope === 'full') {
    if (requestedChunk < 0 || requestedChunk >= chunks.length) {
      res.status(400).json({ error: 'BAD_CHUNK', totalChunks: chunks.length });
      return;
    }
  }
  const targetChunks = scope === 'full' ? [chunks[requestedChunk]] : chunks;

  // ---- Synthesize the target chunk(s) (accent + steady pace), collect audio --
  // The accent clause leads every chunk so the persona never resets mid-render,
  // wrapped in the leak-resistant labelled prompt so it isn't read aloud. The
  // seed is derived from the WHOLE script (not the chunk) so every chunk of one
  // render shares it -> consistent voice across the whole master.
  const accentClause = personaClause(persona);
  const seed = renderSeed(text, voice as string, persona as string);
  // Bound the whole request below Vercel's 60s cap so a slow span returns a
  // clean TIMEOUT (triggering the client's smaller-span fallback) instead of an
  // unparseable plain-text 504.
  const deadline = Date.now() + CALL_BUDGET_MS;
  try {
    const ai = getGeminiClient();
    const audioChunks: string[] = [];
    let totalTokens = 0;

    for (const chunk of targetChunks) {
      const { audio, tokens } = await synthesizeChunk(
        ai,
        chunk,
        voice,
        accentClause,
        seed,
        deadline,
      );
      if (!audio) {
        res.status(502).json({ error: 'NO_AUDIO' });
        return;
      }
      audioChunks.push(audio);
      totalTokens += tokens;
    }

    res.status(200).json({
      audioChunks,
      sampleRate: TTS_SAMPLE_RATE,
      scope,
      totalTokens: totalTokens || null,
      chunkIndex: scope === 'full' ? requestedChunk : 0,
      totalChunks: chunks.length,
    });
  } catch (error) {
    // Our own deadline guard -> clean TIMEOUT (504) the client falls back on.
    if (error instanceof Error && error.message === 'TIMEOUT') {
      console.error('[generate-speech] TIMEOUT (span too slow)');
      res.status(504).json({ error: 'TIMEOUT' });
      return;
    }
    const { status, code } = classifyError(error);
    // Log server-side for diagnostics; never echo raw upstream errors out.
    console.error('[generate-speech]', code, error);
    res.status(status).json({ error: code });
  }
}
