import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

/**
 * Preprocesses text to optimize it for the TTS model.
 * Converts custom "friendly" tags into formats the model understands (newlines, spacing).
 */
const preprocessText = (text: string): string => {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    
    // Custom Tag: [pause] -> Double newline for a strong break
    .replace(/\[pause\]/gi, '\n\n')
    
    // Custom Tag: [break] -> Single newline for a medium break
    .replace(/\[break\]/gi, '\n')
    
    // Fix Ellipsis: Ensure '...' has space after it so it isn't merged with the next word.
    // This helps the model recognize it as a trailing thought.
    .replace(/\.\.\.(?!\s)/g, '... ')
    
    // Optimize standard punctuation spacing
    .replace(/([.!?])(?=[A-Za-z])/g, '$1 ')
    
    // Collapse multiple spaces into one to prevent awkward stutters
    .replace(/ +/g, ' ')
    .trim();
};

export const generateSpeech = async (text: string, voice: VoiceName): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Clean and format text before sending
  const optimizedText = preprocessText(text);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [
        {
          parts: [
            {
              text: optimizedText,
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from the model.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};