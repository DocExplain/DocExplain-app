import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY not found in environment variables");
    throw new Error("Gemini API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const explainDocument = async (contextAndText: string, fileName: string): Promise<AnalysisResult> => {
  const ai = getAiClient();

  const prompt = `
    You are a legal expert AI named DocuMate. 
    Analyze the following legal document content and context.
    
    Take into account the "Jurisdiction" provided in the content if applicable, as laws vary by region.
    
    Return a JSON object with the following structure:
    - summary: A clear, plain English summary of what this document is about (2-3 sentences).
    - keyPoints: An array of strings, listing the most important 3-5 facts, obligations, or rights in plain English.
    - warning: A string containing any potential risks, deadlines, or "gotchas" found in the document. If none, return null or empty string.
    
    Content to Analyze:
    "${contextAndText.substring(0, 25000)}" 
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            warning: { type: Type.STRING },
          },
          required: ["summary", "keyPoints"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      warning: parsed.warning || undefined,
      fileName: fileName,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    // Fallback for demo purposes if API fails
    return {
      summary: "We couldn't process this document right now. It appears to be a legal agreement. Please try again.",
      keyPoints: ["Check document validity", "Ensure all signatures are present", "Review payment terms if applicable"],
      warning: "AI analysis failed. Please consult a professional.",
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
  const ai = getAiClient();

  const prompt = `
    Draft a response to a legal document.
    
    Original Document Context: "${context.substring(0, 5000)}"
    
    Goal/Template: ${template}
    Desired Tone: ${tone}
    
    Output ONLY the body of the message/email. Do not include subject lines unless necessary.
    Keep it concise and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate draft.";
  } catch (error) {
    console.error("Gemini Draft Error:", error);
    return "Dear recipient,\n\nI am writing regarding the document received. Please contact me to discuss further.\n\nSincerely,\n[Your Name]";
  }
};