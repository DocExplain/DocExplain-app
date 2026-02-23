// DocuMate API - Updated: 2026-02-18T13:30
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export const config = {
    runtime: "edge",
};

const JSON_PROMPT = `Act as a Pedagogical Administrative Assistant named DocuMate. Your goal is to analyze a document and make it understandable for any layperson, regardless of their background.

Follow ISO 24495-1 Plain Language principles:
1. Help the user FIND what they need.
2. Help the user UNDERSTAND what they find.
3. Help the user USE the information to take action.

RULES:
- Write in active voice and use everyday language.
- Avoid legal jargon. If unavoidable, IMMEDIATELY explain it in parentheses.
- Never use double negatives.
- Be empathetic and pedagogical in tone.
- For bills: check for signs of scam before advising payment. Warn the user if suspicious.
- Use the user's country and region context (if provided) to give jurisdictionally accurate guidance.

Output MUST be in the user's language.

Return a JSON object with:
- "summary": 2-3 sentences, clear OVERALL summary (active voice, no jargon).
- "keyPoints": 5 key points minimum; more for longer documents (adapt to length).
- "keyDates": array of strings listing important deadlines or dates found in the document (e.g. "Pay before: March 31, 2025"). Empty array if none.
- "complexTerms": array of objects {term, explanation} for any jargon found. Use everyday language for explanations. Empty array if none.
- "regionalContext": 1-2 sentences on specific legal nuances for the user's country/region. "null" if no country provided.
- "warning": potential risks or "null" if none.
- "category": one of ["identity", "employment", "taxation", "health", "legal", "housing", "education", "social", "finance", "transport", "other"].
- "suggestedActions": array of {type, label, description}.
  - type: one of ["contact", "fill", "dispute", "ignore", "ask for clarifications"] if relevant.
  - label: short action button text (3 words max).
  - description: why this action is recommended, in plain language.
- "pages": array of objects, one per page. Each MUST contain:
  - "pageNumber": integer starting from 1.
  - "summary": brief summary of THIS page.
  - "extractedText": FULL, EXACT OCR text of THIS page (MANDATORY).
- "extractedText": FULL text of the ENTIRE document (fallback).
- "isLegible": boolean (true if readable).
- "illegibleReason": "null" if legible, otherwise a brief explanation in the user's language.`;

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, X-Model-Used",
    "Access-Control-Expose-Headers": "X-Model-Used",
};


async function analyzeWithGemini(contextAndText: string, fileName: string, imageBase64: string | undefined, lang: string, geminiKey: string, country?: string, region?: string) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const locationCtx = country ? `User Location: ${country}${region ? `, ${region}` : ''}. ` : '';
    const localizedPrompt = `${JSON_PROMPT}\n\nIMPORTANT: The user's language is ${lang}. ${locationCtx}ALL text values in the JSON output MUST be in ${lang}. regionalContext MUST reflect laws/rules specific to ${country || 'the user\'s country'}${region ? ` and ${region}` : ''}.`;

    let contents: any[] = [];

    if (imageBase64) {
        let mimeType = 'image/jpeg';
        if (imageBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
        else if (imageBase64.startsWith('iVBOR')) mimeType = 'image/png';
        else if (imageBase64.startsWith('JVBER')) mimeType = 'application/pdf';

        contents = [{
            role: 'user',
            parts: [
                { text: `${localizedPrompt}\n\nAdditional context: ${contextAndText || 'Analyze this document.'}` },
                { inlineData: { mimeType, data: imageBase64 } }
            ]
        }];
    } else {
        contents = [{
            role: 'user',
            parts: [{ text: `${localizedPrompt}\n\nContent: "${contextAndText.substring(0, 50000)}"` }]
        }];
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        summary: { type: "string" },
                        keyPoints: { type: "array", items: { type: "string" } },
                        warning: { type: "string" },
                        category: { type: "string" },
                        keyDates: { type: "array", items: { type: "string" } },
                        complexTerms: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    term: { type: "string" },
                                    explanation: { type: "string" }
                                },
                                required: ["term", "explanation"]
                            }
                        },
                        regionalContext: { type: "string" },
                        suggestedActions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: { type: "string" },
                                    label: { type: "string" },
                                    description: { type: "string" },
                                },
                                required: ["type", "label", "description"]
                            }
                        },
                        pages: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    pageNumber: { type: "integer" },
                                    summary: { type: "string" },
                                    extractedText: { type: "string" }
                                },
                                required: ["pageNumber", "summary", "extractedText"]
                            }
                        },
                        isLegible: { type: "boolean" },
                        illegibleReason: { type: "string" },
                        extractedText: { type: "string" }
                    },
                    required: ["summary", "keyPoints", "keyDates", "complexTerms", "category", "suggestedActions", "pages", "isLegible", "illegibleReason", "extractedText"]
                }
            }
        });

        return JSON.parse(response.text || "");
    } catch (e: any) {
        console.error("Gemini Analysis Error:", e);
        throw e;
    }
}

async function analyzeWithOpenAI(contextAndText: string, fileName: string, imageBase64: string | undefined, lang: string, openaiKey: string, country?: string, region?: string) {
    const openai = new OpenAI({ apiKey: openaiKey });

    const locationCtx = country ? `User Location: ${country}${region ? `, ${region}` : ''}. ` : '';
    const localizedPrompt = `${JSON_PROMPT}\n\nIMPORTANT: The user's language is ${lang}. ${locationCtx}ALL text values in the JSON output MUST be in ${lang}. regionalContext MUST reflect laws/rules specific to ${country || 'the user\'s country'}${region ? ` and ${region}` : ''}.`;

    const messages: any[] = [
        { role: "system", content: localizedPrompt }
    ];

    if (imageBase64) {
        let mimeType = 'image/jpeg';
        if (imageBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
        else if (imageBase64.startsWith('iVBOR')) mimeType = 'image/png';

        messages.push({
            role: "user",
            content: [
                { type: "text", text: `Additional context: ${contextAndText || 'Analyze this document.'}` },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:${mimeType};base64,${imageBase64}`
                    }
                }
            ]
        });
    } else {
        messages.push({
            role: "user",
            content: `Document Content:\n${contextAndText.substring(0, 15000)}`
        });
    }

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content from OpenAI");
    return JSON.parse(content);
}

export default async function handler(req: Request) {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS_HEADERS });
    }

    try {
        const { contextAndText = "", fileName = "document", imageBase64, lang = "English", country, region } = await req.json();

        if (!contextAndText && !imageBase64) {
            return new Response(JSON.stringify({ error: "No context or image provided" }), { status: 400, headers: CORS_HEADERS });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        console.log(`Keys available: OpenAI: ${!!openaiKey}, Gemini: ${!!geminiKey}, Lang: ${lang}`);

        if (!openaiKey && !geminiKey) {
            throw new Error("No API keys configured on server.");
        }

        // --- Smart Selection Logic ---
        // Gemini is preferred for images (vision quality) and long texts (context window)
        // OpenAI is preferred for shorter, quick text analysis
        const isLongText = contextAndText.length > 15000;
        const isImage = !!imageBase64;

        const primaryModel = (isImage || isLongText) ? "gemini" : "openai";
        const secondaryModel = primaryModel === "gemini" ? "openai" : "gemini";

        console.log(`Primary selection: ${primaryModel} (isImage: ${isImage}, length: ${contextAndText.length})`);

        let finalModel = "none";
        let result: any;
        let errors: string[] = [];

        // Try Primary
        try {
            if (primaryModel === "gemini" && geminiKey) {
                result = await analyzeWithGemini(contextAndText, fileName, imageBase64, lang, geminiKey, country, region);
                finalModel = "gemini-2.0-flash";
            } else if (openaiKey) {
                result = await analyzeWithOpenAI(contextAndText, fileName, imageBase64, lang, openaiKey, country, region);
                finalModel = "gpt-4o-mini";
            } else if (geminiKey) {
                result = await analyzeWithGemini(contextAndText, fileName, imageBase64, lang, geminiKey, country, region);
                finalModel = "gemini-2.0-flash";
            }
        } catch (e: any) {
            console.error(`Primary model (${primaryModel}) failed:`, e.message);
            errors.push(e.message);
        }

        // Try Secondary if Primary failed
        if (!result) {
            console.log(`Attempting fallback to secondary model: ${secondaryModel}`);
            try {
                if (secondaryModel === "gemini" && geminiKey) {
                    result = await analyzeWithGemini(contextAndText, fileName, imageBase64, lang, geminiKey, country, region);
                    finalModel = "gemini-2.0-flash (fallback)";
                } else if (openaiKey) {
                    result = await analyzeWithOpenAI(contextAndText, fileName, imageBase64, lang, openaiKey, country, region);
                    finalModel = "gpt-4o-mini (fallback)";
                }
            } catch (e: any) {
                console.error(`Secondary model (${secondaryModel}) failed:`, e.message);
                errors.push(e.message);
            }
        }

        if (!result) {
            throw new Error(`Both models failed. Errors: ${errors.join(" | ")}`);
        }

        return new Response(JSON.stringify({
            ...result,
            fileName,
            fullText: result.extractedText || contextAndText,
            timestamp: new Date().toISOString(),
            modelUsed: finalModel
        }), {
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json',
                'X-Model-Used': finalModel
            }
        });

    } catch (err: any) {
        console.error("Handler Error:", err);
        return new Response(JSON.stringify({
            error: err.message || "Server Error",
            details: err.stack
        }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}

