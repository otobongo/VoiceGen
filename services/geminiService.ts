
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, PersonaType } from "../types";

const PERSONA_PROMPTS: Record<PersonaType, string> = {
  neutral: "",
  african: "Speak with a warm, rhythmic African accent: ",
  nigerian: "Speak with a vibrant, clear Nigerian accent, using authentic local inflections, rhythm, and tonal emphasis: ",
  british: "Speak with a clear, sophisticated British Received Pronunciation: ",
  american: "Speak with a standard, friendly General American accent: ",
  storyteller: "Speak in a captivating, expressive storytelling tone with dynamic range: ",
  corporate: "Speak in a professional, steady, and clear corporate presentation style: "
};

/**
 * Robust retry wrapper with exponential backoff for API errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  return fn(); // Final attempt
}

const preprocessText = (text: string, persona: PersonaType): string => {
  let processed = text.replace(/\r\n/g, '\n');
  const scopedTags = [
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

  scopedTags.forEach(({ tag, instruction }) => {
    const regex = new RegExp(`\\[${tag}\\](.*?)([.!?;]|$)`, 'gi');
    processed = processed.replace(regex, `(${instruction}) $1$2 (returning to normal voice) `);
  });
    
  processed = processed
    .replace(/\[pause\]/gi, '\n\n')
    .replace(/\[break\]/gi, '\n')
    .replace(/\[short\]/gi, '... ')
    .replace(/\.\.\.(?!\s)/g, '... ')
    .replace(/ +/g, ' ')
    .trim();

  return PERSONA_PROMPTS[persona] + processed;
};

export const analyzeScript = async (text: string, instructions?: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemPrompt = `
      You are an expert Voice Director and Script Editor.
      TASK: ${instructions ? `Modify the script based on: "${instructions}"` : 'Refine the script for professional TTS delivery.'}
      
      AVAILABLE TAGS:
      - [pause], [break], [short]
      - [whisper], [shout], [excited], [happy], [sad], [angry], [stutter], [relaxed], [formal], [muffled], [robotic], [breathy]
      - [slow], [fast], [high], [deep], [mysterious], [suspense], [announcer], [news], [confused], [energetic]
      
      STRICT RULES:
      1. SCOPE: Prosody tags MUST ONLY apply to the single sentence they start in.
      2. ENDING: Add [pause][pause] at the end of EVERY paragraph.
      3. FORMATTING: Separate paragraphs with exactly TWO newline characters.
      4. RETURN ONLY SCRIPT: No conversational filler.
      
      SCRIPT:
      ${text}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: systemPrompt }] }],
    });
    return response.text || text;
  });
};

export const generateSpeech = async (text: string, voice: VoiceName, persona: PersonaType, durationLimit: number = 0): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let finalRawText = text;
    if (durationLimit > 0) {
      const wordCount = Math.floor(durationLimit * 2.5);
      const words = text.split(/\s+/);
      if (words.length > wordCount) finalRawText = words.slice(0, wordCount).join(' ') + '...';
    }

    const optimizedText = preprocessText(finalRawText, persona);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: optimizedText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned.");
    return base64Audio;
  });
};
