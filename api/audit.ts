// POST /api/audit
// Proofreads a script for spelling mistakes and non-English words before the
// user generates audio. Tags are stripped before analysis so cues like
// [whisper] aren't flagged. Returns structured issues with suggestions.
//
// Body: { text: string }
// Returns: { isValid: boolean, issues: {original,type,suggestion}[], totalTokens }

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
  const limit = rateLimit(`audit:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
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
  if (!text.trim()) {
    res.status(400).json({ error: 'EMPTY_TEXT' });
    return;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    res.status(413).json({ error: 'TEXT_TOO_LONG', max: MAX_TEXT_LENGTH });
    return;
  }

  // Strip prosody tags so cue words aren't flagged as misspellings.
  const cleanText = text.replace(/\[[^\]]*\]/g, ' ');

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            parts: [
              {
                text: `You are a strict proofreader for an English text-to-speech system.
Analyze the text for:
1. Spelling errors (ignore valid proper nouns and common names).
2. Non-English words (clearly foreign words that are not common English loanwords).

Return isValid=true with an empty issues array if there are no problems.

Text to analyze:
"${cleanText}"`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              issues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['spelling', 'non-english'] },
                    suggestion: { type: Type.STRING },
                  },
                  required: ['original', 'type', 'suggestion'],
                },
              },
            },
            required: ['isValid', 'issues'],
          },
        },
      }),
    );

    const raw = (response.text ?? '').trim();
    let parsed: { isValid?: boolean; issues?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(502).json({ error: 'UPSTREAM_ERROR' });
      return;
    }

    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    res.status(200).json({
      isValid: parsed.isValid !== false && issues.length === 0,
      issues,
      totalTokens: response.usageMetadata?.totalTokenCount ?? null,
    });
  } catch (error) {
    const { status, code } = classifyError(error);
    console.error('[audit]', code, error);
    res.status(status).json({ error: code });
  }
}
