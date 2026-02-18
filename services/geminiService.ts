
import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult } from '../types';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const JSON_PROMPT = `You are a legal expert AI named DocuMate. Analyze the provided document.
Return a JSON object with:
- "summary": 2-3 sentences plain English summary
- "keyPoints": array of 5 key points
- "warning": potential risks or "null" if none`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    warning: { type: Type.STRING },
  },
  required: ["summary", "keyPoints"]
} as const;

export const explainDocument = async (
  contextAndText: string,
  fileName: string,
  imageBase64?: string
): Promise<AnalysisResult> => {
  if (!GEMINI_KEY) {
    return {
      summary: 'Analysis failed: Gemini API key is not configured.',
      keyPoints: ['Set VITE_GEMINI_API_KEY in your environment'],
      warning: 'Missing API key.',
      fileName,
      timestamp: new Date().toISOString()
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

    let response;

    if (imageBase64) {
      // --- Vision path: send image directly to Gemini ---
      let mimeType = 'image/jpeg';
      if (imageBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
      else if (imageBase64.startsWith('iVBOR')) mimeType = 'image/png';
      else if (imageBase64.startsWith('JVBER')) mimeType = 'application/pdf';

      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${JSON_PROMPT}\n\nAdditional context: ${contextAndText || 'Analyze this document.'}` },
              { inlineData: { mimeType, data: imageBase64 } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA
        }
      });
    } else {
      // --- Text-only path ---
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `${JSON_PROMPT}\n\nContent: "${contextAndText.substring(0, 25000)}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA
        }
      });
    }

    const jsonText = response.text;
    const parsed = JSON.parse(jsonText || "{}");

    return {
      summary: parsed.summary || 'No summary generated.',
      keyPoints: parsed.keyPoints || [],
      warning: parsed.warning,
      fileName,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const message = error.message || 'Unknown error occurred';
    return {
      summary: `Analysis failed: ${message}`,
      keyPoints: ["Check your internet connection", "Try a smaller file", "Retry the analysis"],
      warning: "The analysis could not be completed.",
      fileName,
      timestamp: new Date().toISOString()
    };
  }
};

export const generateDraft = async (
  context: string,
  tone: string,
  template: string
): Promise<string> => {
  if (!GEMINI_KEY) return "Could not generate draft: Gemini API key missing.";

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Draft a response to an administrative or legal document.
Context: "${context}"
Goal: ${template}
Tone: ${tone}
Output ONLY the body.`
    });

    return response.text || "Could not generate draft.";

  } catch (error) {
    console.error("Draft Generation Error:", error);
    return "Could not generate draft.";
  }
};