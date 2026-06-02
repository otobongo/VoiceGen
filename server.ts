import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, Type } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const getApiKey = () => process.env.GEMINI_API_KEY;

// -- Health Endpoint --
app.get('/api/health', (req, res) => {
  const apiKey = getApiKey();
  res.json({ status: 'ok', hasKey: !!apiKey });
});

// Keep models matching config
const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is missing.');
  return new GoogleGenAI({ apiKey });
};

// -- Audit Endpoint --
app.post('/api/audit', async (req, res) => {
  try {
    const { text } = req.body;
    const ai = getAiClient();
    const cleanText = text.replace(/\[.*?\]/g, ' ');

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash", // updated to 3.1 or keep as is? Let's keep what they had: gemini-3-flash-preview / gemini-2.5-flash
      contents: [{
        parts: [{ 
          text: `You are a strict script proofer for an English Text-to-Speech system.
          Analyze the text for:
          1. Spelling errors (ignore valid proper nouns).
          2. Non-English words (words that are clearly foreign and not common English loanwords).
          
          Text to analyze:
          "${cleanText}"`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN, description: "True if no issues found." },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING, description: "The word causing the issue." },
                  type: { type: Type.STRING, enum: ["spelling", "non-english"], description: "Type of issue." },
                  suggestion: { type: Type.STRING, description: "Corrected English word." }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{"isValid": true, "issues": []}');
    res.json({
      isValid: result.isValid,
      issues: result.issues || [],
      usage: { totalTokens: response.usageMetadata?.totalTokenCount || 0 }
    });
  } catch (error: any) {
    console.error("Audit API Error:", error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// -- Analyze Endpoint --
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, preserveText, instructionsString } = req.body;
    const ai = getAiClient();
    
    let promptObjective = preserveText 
      ? "Analyze the script to find the best places for prosody actions (tags). DO NOT change the original words, grammar, or sentence structure. Only INSERT tags."
      : "Make the script enjoyable, clear, and easily understandable for listeners. Fix grammar, improve flow, and add prosody tags (actions) to enhance delivery.";
      
    let promptRules = preserveText
      ? `1. FORMATTING: Separate paragraphs with DOUBLE newline characters (\\n\\n) for better readability.
      2. PRESERVE TEXT: Do not rewrite sentences. Do not correct grammar. Do not simplify. ONLY insert tags.
      3. CHANGES LIST: Return an empty array for 'changes' because you are not changing the text content.`
      : `1. FORMATTING: Separate paragraphs with DOUBLE newline characters (\\n\\n) for better readability.
      2. SCOPE: Prosody tags MUST ONLY apply to the single sentence they start in.
      3. CLARITY: Simplify overly complex sentences.
      4. CHANGES LIST: 
         - IGNORE changes that are purely adding prosody tags (like [pause], [happy]).
         - ONLY report changes where textual words were rephrased, simplified, removed, or added for clarity/flow.`;

    const instructionsText = instructionsString ? `\n\nUSER INSTRUCTIONS to follow:\n${instructionsString}` : "";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash",
      contents: [{
        parts: [{ 
          text: `You are an expert script editor and prosody director.
          
          OBJECTIVE:
          ${promptObjective}
          
          RULES:
          ${promptRules}
          
          AVAILABLE PROSODY TAGS:
          [pause], [break], [short], [whisper], [shout], [excited], [sad], [happy], [angry], [stutter], [slow], [fast], [high], [deep], [relaxed], [formal], [muffled], [robotic], [breathy], [mysterious], [suspense], [announcer], [news], [confused], [energetic]
          
          ${instructionsText}
          
          ORIGINAL SCRIPT:
          "${text}"`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The newly formatted script with tags." },
            changes: {
              type: Type.ARRAY,
              description: "List of word/phrasing alterations made.",
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  replacement: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{"text": "", "changes": []}');
    res.json(result);
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// -- Generate Endpoint --
const PERSONA_PROMPTS: Record<string, string> = {
  neutral: "",
  african: "Speak with a warm, rhythmic African accent: ",
  nigerian: "Speak with a vibrant, clear Nigerian accent, using authentic local inflections, rhythm, and tonal emphasis: ",
  british: "Speak with a clear, sophisticated British Received Pronunciation: ",
  american: "Speak with a standard, friendly General American accent: ",
  storyteller: "Speak in a captivating, expressive storytelling tone with dynamic range: ",
  corporate: "Speak in a professional, steady, and clear corporate presentation style: "
};

app.post('/api/generate', async (req, res) => {
  try {
    const { finalRawText, voice, persona, chunks } = req.body;
    const ai = getAiClient();
    
    const audioChunks: string[] = [];
    let totalTokens = 0;
    let promptTokens = 0;
    let candidatesTokens = 0;

    const speedInstruction = "CRITICAL INSTRUCTION: Speak at a very steady, consistent, and moderate pace. Do NOT speed up or rush at any point. Maintain a natural, even rhythm throughout the entire reading. ";
    const instructionPrefix = speedInstruction + (PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.neutral);

    for (const chunk of chunks) {
      const chunkWithInstructions = instructionPrefix + chunk;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: chunkWithInstructions }] }],
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
      if (!base64Audio) throw new Error("No audio data returned for a chunk.");
      
      audioChunks.push(base64Audio);
      if (response.usageMetadata) {
        promptTokens += response.usageMetadata.promptTokenCount || 0;
        candidatesTokens += response.usageMetadata.candidatesTokenCount || 0;
        totalTokens += response.usageMetadata.totalTokenCount || 0;
      }
    }

    res.json({
      audioChunks,
      usage: { totalTokens, promptTokens, candidatesTokens }
    });
  } catch (error: any) {
    console.error("Generate API Error:", error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
