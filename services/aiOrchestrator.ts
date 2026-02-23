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

const API_URL = import.meta.env.VITE_API_URL || 'https://doc-explain-app.vercel.app';

export const explainDocument = async (contextAndText: string, fileName: string, lang: string, imageBase64?: string, country?: string, region?: string): Promise<AnalysisResult> => {
    console.log(`[Orchestrator] Starting analysis. Context len: ${contextAndText.length}, Image present: ${!!imageBase64}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        console.log(`[Orchestrator] Fetching ${API_URL}/api/analyze...`);
        const response = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contextAndText, fileName, imageBase64, lang, country, region }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const modelUsed = response.headers.get('X-Model-Used');
        if (modelUsed) {
            console.log(`[Orchestrator] Model used for analysis: ${modelUsed}`);
        }

        console.log(`[Orchestrator] Response status: ${response.status}`);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errText.substring(0, 100)}`);
        }

        const data = await response.json();
        console.log(`[Orchestrator] Success. Summary len: ${data.summary?.length}`);
        return data;
    } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("[Orchestrator] Analysis failed:", err);
        throw err;
    }
};

export const generateDraft = async (summary: string, tone: string, template: string, lang: string, currentDraft?: string, country?: string, region?: string): Promise<{ draft: string, explanation?: string, chatResponse?: string }> => {
    console.log(`[Orchestrator] Generating draft. Template: ${template}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch(`${API_URL}/api/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: summary, tone, template, lang, currentDraft, country, region }),
            signal: controller.signal
        });

        const modelUsed = response.headers.get('X-Model-Used');
        if (modelUsed) {
            console.log(`[Orchestrator] Model used for draft: ${modelUsed}`);
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        let parsedDraft = data.draft;
        if (typeof parsedDraft === 'object' && parsedDraft !== null) {
            parsedDraft = Object.entries(parsedDraft)
                .map(([k, v]) => {
                    const val = typeof v === 'object' ? JSON.stringify(v, null, 2) : v;
                    return `${k}: ${val}`;
                })
                .join('\n');
        } else if (typeof parsedDraft !== 'string') {
            parsedDraft = "Could not generate draft.";
        }

        return {
            draft: parsedDraft,
            explanation: data.explanation,
            chatResponse: data.chatResponse
        };
    } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("[Orchestrator] Draft failed:", err);
        return { draft: "Error generating response." };
    }
};
