
import { AnalysisResult } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://doc-explain-app.vercel.app';

export const explainDocument = async (contextAndText: string, fileName: string, imageBase64?: string): Promise<AnalysisResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const fullUrl = `${API_URL}/api/analyze`;
    console.log(`[DEBUG] Calling API: ${fullUrl}`);
    console.log(`[DEBUG] Context length: ${contextAndText?.length || 0}`);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contextAndText,
        fileName,
        ...(imageBase64 && { imageBase64 })
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Server error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    clearTimeout(timeout);
    const message = error.name === 'AbortError'
      ? 'Analysis timed out after 60 seconds. Please try with a smaller document.'
      : error.message || 'Unknown error occurred';
    console.error("API Explanation Error:", message);
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
  try {
    const response = await fetch(`${API_URL}/api/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context,
        tone,
        template
      })
    });

    if (!response.ok) {
      return "Could not generate draft (Server Error).";
    }

    const data = await response.json();
    return data.draft || "Could not generate draft.";

  } catch (error) {
    console.error("Draft Generation Error:", error);
    return "Could not reach server for draft generation.";
  }
};