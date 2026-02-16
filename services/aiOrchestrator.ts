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

export const explainDocument = async (contextAndText: string, fileName: string): Promise<AnalysisResult> => {
    // 1. Check Length & Key Availability
    if (contextAndText.length > LENGTH_THRESHOLD) {
        console.log(`Document length (${contextAndText.length}) exceeds threshold. Using Gemini.`);
        return explainGemini(contextAndText, fileName);
    }

    const openai = getOpenAIClient();
    if (!openai) {
        return explainGemini(contextAndText, fileName);
    }

    console.log(`Document length (${contextAndText.length}) is short. Using OpenAI.`);

    // 2. OpenAI Implementation
    try {
        const prompt = `
      You are DocuMate, a helpful legal assistant.
      Analyze the provided administrative or legal document.
      
      Return JSON:
      {
        "summary": "2-3 sentences plain English summary",
        "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
        "warning": "Potential risks or 'null' if none"
      }
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: `Document Content:\n${contextAndText.substring(0, 15000)}` } // OpenAI limit safety
            ],
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("No content from OpenAI");

        const parsed = JSON.parse(content);
        return {
            summary: parsed.summary,
            keyPoints: parsed.keyPoints || [],
            warning: parsed.warning,
            fileName,
            timestamp: new Date().toISOString()
        };

    } catch (err) {
        console.error("OpenAI failed, falling back to Gemini", err);
        return explainGemini(contextAndText, fileName);
    }
};

export const generateDraft = async (summary: string, tone: string, template: string): Promise<string> => {
    // Drafts are usually based on summary/short context, so OpenAI is preferred for better writing style.
    const openai = getOpenAIClient();
    if (!openai) {
        return draftGemini(summary, tone, template);
    }

    try {
        const prompt = `
            Draft a response to an administrative or legal document.
            Context: "${summary}"
            Goal: ${template}
            Tone: ${tone}
            output ONLY the body.
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
        });

        return completion.choices[0].message.content || "Could not generate draft.";

    } catch (err) {
        console.error("OpenAI Draft failed", err);
        return draftGemini(summary, tone, template);
    }
};
