// Shared voice + persona model and server-side text preprocessing.
// Used by the serverless functions (and mirrored on the client for UI labels).

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

export const VOICE_NAMES: VoiceName[] = [
  'Fenrir',
  'Charon',
  'Puck',
  'Orus',
  'Algenib',
  'Kore',
  'Zephyr',
  'Aoede',
  'Leda',
  'Sulafat',
];

export type PersonaType =
  | 'neutral'
  | 'nigerian'
  | 'african'
  | 'british'
  | 'american'
  | 'storyteller'
  | 'corporate';

export const PERSONA_PROMPTS: Record<PersonaType, string> = {
  neutral: '',
  nigerian:
    'Speak with a vibrant, clear Nigerian accent, using authentic local inflections, rhythm, and tonal emphasis: ',
  african: 'Speak with a warm, rhythmic African accent: ',
  british: 'Speak with a clear, sophisticated British Received Pronunciation: ',
  american: 'Speak with a standard, friendly General American accent: ',
  storyteller:
    'Speak in a captivating, expressive storytelling tone with dynamic range: ',
  corporate:
    'Speak in a professional, steady, and clear corporate presentation style: ',
};

// Maximum characters accepted in a single request. Guards against
// pathologically large (and expensive) generations.
export const MAX_TEXT_LENGTH = 5000;

// Prosody tags that wrap a single sentence with a delivery instruction.
const SCOPED_TAGS: { tag: string; instruction: string }[] = [
  { tag: 'whisper', instruction: 'whispering' },
  { tag: 'shout', instruction: 'shouting' },
  { tag: 'excited', instruction: 'excitedly' },
  { tag: 'sad', instruction: 'sadly' },
  { tag: 'happy', instruction: 'cheerfully' },
  { tag: 'angry', instruction: 'angrily' },
  { tag: 'stutter', instruction: 'stuttering slightly' },
  { tag: 'slow', instruction: 'speaking slowly' },
  { tag: 'fast', instruction: 'speaking quickly' },
  { tag: 'high', instruction: 'in a high-pitched voice' },
  { tag: 'deep', instruction: 'in a deep voice' },
  { tag: 'relaxed', instruction: 'in a relaxed, casual tone' },
  { tag: 'formal', instruction: 'in a very formal, precise tone' },
  { tag: 'muffled', instruction: 'as if speaking through a wall or muffled' },
  { tag: 'robotic', instruction: 'in a flat, mechanical robotic voice' },
  { tag: 'breathy', instruction: 'with a heavy, breathy vocal texture' },
  { tag: 'mysterious', instruction: 'in a mysterious, intriguing tone' },
  { tag: 'suspense', instruction: 'with a sense of building suspense and tension' },
  { tag: 'announcer', instruction: 'in a clear, upbeat radio announcer style' },
  { tag: 'news', instruction: 'in a professional, objective news reporting tone' },
  { tag: 'confused', instruction: 'sounding slightly confused and hesitant' },
  { tag: 'energetic', instruction: 'with high energy and enthusiasm' },
];

/**
 * Convert the bracket-tag markup the UI produces into natural-language
 * delivery instructions the TTS model understands, then prepend the persona.
 */
export function preprocessText(text: string, persona: PersonaType): string {
  let processed = text.replace(/\r\n/g, '\n');

  for (const { tag, instruction } of SCOPED_TAGS) {
    const regex = new RegExp(`\\[${tag}\\](.*?)([.!?;]|$)`, 'gi');
    processed = processed.replace(
      regex,
      `(${instruction}) $1$2 (returning to normal voice) `,
    );
  }

  processed = processed
    .replace(/\[pause\]/gi, '\n')
    .replace(/\[break\]/gi, '\n\n')
    .replace(/\[short\]/gi, '... ')
    .replace(/\.\.\.(?!\s)/g, '... ')
    .replace(/ +/g, ' ')
    .trim();

  const prefix = PERSONA_PROMPTS[persona] ?? '';
  return prefix + processed;
}

export function isValidVoice(v: unknown): v is VoiceName {
  return typeof v === 'string' && (VOICE_NAMES as string[]).includes(v);
}

export function isValidPersona(p: unknown): p is PersonaType {
  return (
    typeof p === 'string' &&
    Object.prototype.hasOwnProperty.call(PERSONA_PROMPTS, p)
  );
}
