// Client-side orchestrator for backend AI services.
import { AnalysisResult } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://doc-explain-app.vercel.app';

export const explainDocument = async (contextAndText: string, fileName: string, lang: string, imagesBase64?: string[], country?: string, region?: string): Promise<AnalysisResult> => {
    console.log(`[Orchestrator] Starting analysis. Context len: ${contextAndText.length}, Images count: ${imagesBase64?.length}, Country: ${country || 'N/A'}, Region: ${region || 'N/A'}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    try {
        console.log(`[Orchestrator] Fetching ${API_URL}/api/analyze...`);
        const response = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contextAndText, fileName, imagesBase64, lang, country, region }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const modelId = response.headers.get('X-Model-Id');
        if (modelId) {
            console.log(`[Orchestrator] Model ID: ${modelId}`);
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
    console.log(`[Orchestrator] Generating draft. Template: ${template}, Country: ${country || 'N/A'}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch(`${API_URL}/api/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: summary, tone, template, lang, currentDraft, country, region }),
            signal: controller.signal
        });

        const modelId = response.headers.get('X-Model-Id');
        if (modelId) {
            console.log(`[Orchestrator] Model ID: ${modelId}`);
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
