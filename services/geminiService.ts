import { VoiceName, PersonaType, GenerationResult, AuditResult, AnalysisChange } from "../types";

/**
 * Robust retry wrapper with exponential backoff for API errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      let errorMessage = "";
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = "Unknown error";
        }
      }

      const isQuotaExhausted = errorMessage.includes('exceeded your current quota') || errorMessage.includes('billing details');
      const isRetryable = !isQuotaExhausted && (
                          errorMessage.includes('429') || 
                          errorMessage.includes('RESOURCE_EXHAUSTED') || 
                          errorMessage.includes('500') || 
                          errorMessage.includes('INTERNAL') || 
                          errorMessage.includes('503')
      );
                          
      if (isRetryable && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  return fn(); // Final attempt
}

// Function to smoothly combine audio chunks into a single ArrayBuffer (kept client-side for playback handling)
export const combineAudioChunks = (base64Chunks: string[]): ArrayBuffer => {
  // Convert all base64 chunks to Uint8Arrays
  const byteArrays = base64Chunks.map(base64 => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  });

  // Calculate total length
  const totalLength = byteArrays.reduce((acc, curr) => acc + curr.length, 0);

  // Combine into a single Uint8Array
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of byteArrays) {
    combined.set(array, offset);
    offset += array.length;
  }

  return combined.buffer;
};

// Helper to chunk text
const chunkText = (text: string, maxChunkLength: number = 1000): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk.length + sentence.length) > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += sentence + ' ';
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
};

// Replace text tags logic (already moved to server, but kept locally here in case we need it)
const preprocessText = (text: string, persona: PersonaType): string => {
  let processed = text.replace(/\r\n/g, '\n');
  const resetCue = persona !== 'neutral' ? `(resume ${persona} persona)` : '(resume normal tone)';

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
    const regex = new RegExp(`\\[${tag}\\](.*?)(?=[.!?\\n]|\\[|$)`, 'gi');
    processed = processed.replace(regex, `(${instruction}) $1 ${resetCue}`);
  });
    
  processed = processed
    .replace(/\[pause\]/gi, '(pause)\n')
    .replace(/\[break\]/gi, '(long pause)\n\n')
    .replace(/\[short\]/gi, ', ')
    .replace(/\.\.\.(?!\s)/g, '... ')
    .replace(/ +/g, ' ')
    .trim();

  return processed;
};


export const auditScript = async (text: string): Promise<AuditResult> => {
  return withRetry(async () => {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  });
};

export const analyzeScript = async (text: string, instructions?: string, preserveText: boolean = true): Promise<{ text: string, changes: AnalysisChange[] }> => {
  return withRetry(async () => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, preserveText, instructionsString: instructions })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  });
};

export const generateSpeech = async (text: string, voice: VoiceName, persona: PersonaType, durationLimit: number = 0): Promise<GenerationResult> => {
  return withRetry(async () => {
    let finalRawText = text;
    if (durationLimit > 0) {
      const wordCount = Math.floor(durationLimit * 2.5);
      const words = text.split(/\\s+/);
      if (words.length > wordCount) finalRawText = words.slice(0, wordCount).join(' ') + '...';
    }

    const optimizedText = preprocessText(finalRawText, persona);
    const chunks = chunkText(optimizedText, 1000).filter(c => /[a-zA-Z0-9]/.test(c));

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalRawText, voice, persona, chunks })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    const arrayBuffer = combineAudioChunks(result.audioChunks);
    
    return {
      audioData: arrayBuffer,
      usage: result.usage
    };
  });
};
