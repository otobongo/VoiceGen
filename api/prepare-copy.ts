// POST /api/prepare-copy
// One AI pass that prepares a script for TTS: it splits the text into distinct
// "contexts" (coherent blocks) AND, within each context, applies prosody tags,
// optionally corrects grammar/flow, and optionally follows a freeform
// instruction. Each context body is CONTINUOUS (never paragraph-split); the UI
// composes them with a clear [break] between contexts.
//
// This replaces the previous separate enhance-script + detect-contexts calls.
//
// Body: { text: string, reviewCopy?: boolean, instruction?: string }
//   reviewCopy=true  -> also fix grammar, spelling, flow.
//   reviewCopy=false -> preserve wording exactly; only insert tags.
// Returns: { contexts: {title,body}[], changedWording, changes: {original,replacement,reason}[] }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from '@google/genai';
import { MAX_TEXT_LENGTH } from './_shared/voice.js';
import {
  classifyError,
  getClientIp,
  getGeminiClient,
  rateLimit,
  withRetry,
} from './_shared/http.js';
import { requireAuth } from './_shared/auth.js';

const MODEL = 'gemini-2.5-flash';
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_CONTEXTS = 20;
const MAX_INSTRUCTION_LENGTH = 500;

function buildPrompt(
  text: string,
  reviewCopy: boolean,
  instruction?: string,
): string {
  const wordingRule = reviewCopy
    ? 'COPY: Fix grammar, spelling, punctuation, and awkward flow inside each context. Keep the original meaning and voice.'
    : 'COPY: Do NOT change, add, or remove any words. Only insert prosody tags around the existing text.';

  const instructionRule = instruction
    ? `\nDIRECTION: Additionally apply this instruction to the delivery: "${instruction}"`
    : '';

  return `You are a Voice Director who structures and directs scripts for text-to-speech.

TASK: Split the script into distinct "contexts", then prepare each one for delivery. A context is a self-contained block of related content (one topic, message, or announcement). Adjacent sentences about the same thing belong to the SAME context; a clear change of topic starts a NEW context.

AVAILABLE TAGS (use only these):
- Timing: [pause], [break], [short]
- Emotion: [whisper], [shout], [excited], [happy], [sad], [angry], [stutter], [relaxed], [formal], [muffled], [robotic], [breathy]
- Style: [slow], [fast], [high], [deep], [mysterious], [suspense], [announcer], [news], [confused], [energetic]

RULES FOR EACH CONTEXT BODY:
1. CONTINUOUS, NOT PARAGRAPHED: Write the body as one continuous passage. No blank lines or paragraph breaks inside a context.
2. PACING: Use [pause] for short natural breaks and [break] for a longer beat between sentences. Do not end a body with a trailing break.
3. ${wordingRule}${instructionRule}
4. TITLE: Give each context a short 2-4 word title.

CHANGES LIST:
- Report only changes where actual WORDS were rephrased, simplified, added, or removed for clarity or grammar.
- Do NOT list changes that are purely inserting prosody tags like [pause] or [happy].
- If you preserved the wording (no word changes), return an empty changes array.

Return between 1 and ${MAX_CONTEXTS} contexts.

SCRIPT:
${text}`;
}

// Compare two scripts ignoring tags/whitespace to tell whether the words
// themselves changed (used to label the result).
function wordingChanged(before: string, after: string): boolean {
  const strip = (s: string) =>
    s
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  return strip(before) !== strip(after);
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
  const limit = rateLimit(`prepare:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  res.setHeader('X-RateLimit-Limit', String(limit.limit));
  res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((limit.resetAt - Date.now()) / 1000)));
    res.status(429).json({ error: 'RATE_LIMITED' });
    return;
  }

  if (!(await requireAuth(req, res))) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const text = typeof body.text === 'string' ? body.text : '';
  const reviewCopy = body.reviewCopy === true;
  const instructionRaw =
    typeof body.instruction === 'string' ? body.instruction.trim() : '';
  const instruction = instructionRaw.slice(0, MAX_INSTRUCTION_LENGTH) || undefined;

  if (!text.trim()) {
    res.status(400).json({ error: 'EMPTY_TEXT' });
    return;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    res.status(413).json({ error: 'TEXT_TOO_LONG', max: MAX_TEXT_LENGTH });
    return;
  }

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL,
        contents: [{ parts: [{ text: buildPrompt(text, reviewCopy, instruction) }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              contexts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    body: { type: Type.STRING },
                  },
                  required: ['title', 'body'],
                },
              },
              changes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    replacement: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['original', 'replacement', 'reason'],
                },
              },
            },
            required: ['contexts'],
          },
        },
      }),
    );

    const raw = (response.text ?? '').trim();
    let parsed: {
      contexts?: { title?: string; body?: string }[];
      changes?: { original?: string; replacement?: string; reason?: string }[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(502).json({ error: 'UPSTREAM_ERROR' });
      return;
    }

    const contexts = (parsed.contexts ?? [])
      .map((c) => ({
        title: (c.title ?? '').trim() || 'Context',
        body: (c.body ?? '').trim(),
      }))
      .filter((c) => c.body.length > 0)
      .slice(0, MAX_CONTEXTS);

    if (contexts.length === 0) {
      contexts.push({ title: 'Context', body: text.trim() });
    }

    // Only meaningful when grammar/flow review was on; ignore otherwise.
    const changes = reviewCopy
      ? (parsed.changes ?? [])
          .map((c) => ({
            original: (c.original ?? '').trim(),
            replacement: (c.replacement ?? '').trim(),
            reason: (c.reason ?? '').trim(),
          }))
          .filter((c) => c.original && c.replacement)
      : [];

    const composed = contexts.map((c) => c.body).join(' ');
    res.status(200).json({
      contexts,
      changedWording: wordingChanged(text, composed),
      changes,
    });
  } catch (error) {
    const { status, code } = classifyError(error);
    console.error('[prepare-copy]', code, error);
    res.status(status).json({ error: code });
  }
}
