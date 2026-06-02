// POST /api/generate-speech
// Server-side TTS proxy. The Gemini API key never leaves the server; the
// browser only ever talks to this endpoint.
//
// Long single-shot TTS generations are known to DRIFT and speed up after a
// minute or two. We mitigate that two ways (matching the approach proven on the
// other build): (1) prepend a steady-pace instruction to every request, and
// (2) split the script into sentence-aware chunks (~1000 chars) and synthesize
// each separately, returning the audio chunks for the client to concatenate.
// No single generation is long enough to accelerate.
//
// Body: { text: string, voice: VoiceName, persona: PersonaType, scope?: 'preview' | 'full' }
// Returns: { audioChunks: string[] (base64 PCM), sampleRate, scope, totalTokens }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Modality } from '@google/genai';
import {
  MAX_TEXT_LENGTH,
  preprocessText,
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

// Rate limit: generation is the expensive path, so keep it tight.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

// Keep each TTS request short so the model can't accelerate over a long run.
const MAX_CHUNK_CHARS = 1000;

// Prepended to every chunk to hold a consistent tempo.
const STEADY_PACE =
  'CRITICAL INSTRUCTION: Speak at a very steady, consistent, and moderate pace. ' +
  'Do NOT speed up or rush at any point. Maintain a natural, even rhythm throughout. ';

// Split text into sentence-aware chunks no longer than maxLen characters.
function chunkText(text: string, maxLen = MAX_CHUNK_CHARS): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current.length + sentence.length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  // Drop chunks with no speakable characters.
  return chunks.filter((c) => /[a-z0-9]/i.test(c));
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

  const optimizedText = preprocessText(rawText, persona);
  const chunks = chunkText(optimizedText);
  if (chunks.length === 0) {
    res.status(400).json({ error: 'EMPTY_TEXT' });
    return;
  }

  // ---- Synthesize each chunk (steady pace), collect audio + usage ----
  try {
    const ai = getGeminiClient();
    const audioChunks: string[] = [];
    let totalTokens = 0;

    for (const chunk of chunks) {
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TTS_MODEL,
          contents: [{ parts: [{ text: STEADY_PACE + chunk }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
          },
        }),
      );

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'NO_AUDIO' });
        return;
      }
      audioChunks.push(base64Audio);
      totalTokens += response.usageMetadata?.totalTokenCount ?? 0;
    }

    res.status(200).json({
      audioChunks,
      sampleRate: TTS_SAMPLE_RATE,
      scope,
      totalTokens: totalTokens || null,
    });
  } catch (error) {
    const { status, code } = classifyError(error);
    // Log server-side for diagnostics; never echo raw upstream errors out.
    console.error('[generate-speech]', code, error);
    res.status(status).json({ error: code });
  }
}
