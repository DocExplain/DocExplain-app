import { explainDocument as explainGemini, generateDraft as draftGemini } from './geminiService';
import OpenAI from 'openai';
import { AnalysisResult } from '../types';

// Threshold: 20,000 chars is roughly 5k tokens.
// GPT-4o-mini is great, but for massive docs, Gemini 1.5 Flash has a larger context window (1M tokens).
const LENGTH_THRESHOLD = 20000;

const getOpenAIClient = () => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("OpenAI API Key missing, falling back to Gemini");
        return null;
    }
    return new OpenAI({ apiKey, dangerouslyAllowBrowser: true }); // Client-side usage for demo
};

const API_URL = import.meta.env.VITE_API_URL || '';

export const explainDocument = async (contextAndText: string, fileName: string, lang: string, imageBase64?: string): Promise<AnalysisResult> => {
    try {
        const response = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contextAndText, fileName, imageBase64, lang })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        return await response.json();
    } catch (err: any) {
        console.error("Analysis failed:", err);
        throw err;
    }
};

export const generateDraft = async (summary: string, tone: string, template: string, lang: string): Promise<string> => {
    try {
        const response = await fetch(`${API_URL}/api/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: summary, tone, template, lang })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        return data.draft || "Could not generate draft.";
    } catch (err: any) {
        console.error("Draft failed:", err);
        return "Error generating response.";
    }
};
