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
- "suggestedActions": array of {type, label, description, format, severity}.
  - type: one of ["contact", "fill", "dispute", "ignore", "ask for clarifications", "verify", "archive"] if relevant.
  - label: short action button text (3 words max).
  - description: why this action is recommended, in plain language.
  - format: one of ["letter", "checklist", "security_alert", "step_by_step", "archive_nudge"].
    - Use "checklist" for invoices/bills (verification points).
    - Use "security_alert" for scams/suspicious documents.
    - Use "step_by_step" for forms or administrative procedures.
    - Use "letter" ONLY if a formal dispute or contestation is explicitly relevant.
    - Use "archive_nudge" if no action is required (informational document).
  - severity: one of ["low", "medium", "high"].
    - "high" for scams, urgent deadlines, or warnings.
    - "medium" for actions like filling a form or contacting an entity.
    - "low" for informational items (archive, understand).
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
    "Access-Control-Allow-Headers": "Content-Type, X-Model-Id",
    "Access-Control-Expose-Headers": "X-Model-Id",
};

const O_A_I = ["open", "ai"].join("");
const G_P_T_MODEL = ["gpt", "4o", "mini"].join("-");
const ID_O_M = "o-m";
const ID_G_F = "g-f";
const ID_DS_C = "ds-c";


async function analyzeWithGemini(contextAndText: string, fileName: string, images: string[], lang: string, geminiKey: string, country?: string, region?: string) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const locationCtx = country ? `User Location: ${country}${region ? `, ${region}` : ''}. ` : '';
    const localizedPrompt = `${JSON_PROMPT}\n\nIMPORTANT: The user's language is ${lang}. ${locationCtx}ALL text values in the JSON output MUST be in ${lang}. regionalContext MUST reflect laws/rules specific to ${country || 'the user\'s country'}${region ? ` and ${region}` : ''}.`;

    let contents: any[] = [];

    if (images.length > 0) {
        let parts: any[] = [{ text: `${localizedPrompt}\n\nAdditional context: ${contextAndText || 'Analyze this document.'}` }];

        for (const imgBase64 of images) {
            let mimeType = 'image/jpeg';
            if (imgBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
            else if (imgBase64.startsWith('iVBOR')) mimeType = 'image/png';
            else if (imgBase64.startsWith('JVBER')) mimeType = 'application/pdf';

            parts.push({ inlineData: { mimeType, data: imgBase64 } });
        }

        contents = [{
            role: 'user',
            parts
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
                                    format: { type: "string" },
                                    severity: { type: "string" },
                                },
                                required: ["type", "label", "description", "format", "severity"]
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

async function analyzeWithOAI(contextAndText: string, fileName: string, images: string[], lang: string, openaiKey: string, country?: string, region?: string) {
    const openai = new OpenAI({ apiKey: openaiKey });

    const locationCtx = country ? `User Location: ${country}${region ? `, ${region}` : ''}. ` : '';
    const localizedPrompt = `${JSON_PROMPT}\n\nIMPORTANT: The user's language is ${lang}. ${locationCtx}ALL text values in the JSON output MUST be in ${lang}. regionalContext MUST reflect laws/rules specific to ${country || 'the user\'s country'}${region ? ` and ${region}` : ''}.`;

    const messages: any[] = [
        { role: "system", content: localizedPrompt }
    ];

    if (images.length > 0) {
        let content: any[] = [{ type: "text", text: `Additional context: ${contextAndText || 'Analyze this document.'}` }];

        for (const imgBase64 of images) {
            let mimeType = 'image/jpeg';
            if (imgBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
            else if (imgBase64.startsWith('iVBOR')) mimeType = 'image/png';

            content.push({
                type: "image_url",
                image_url: {
                    url: `data:${mimeType};base64,${imgBase64}`
                }
            });
        }

        messages.push({
            role: "user",
            content
        });
    } else {
        messages.push({
            role: "user",
            content: `Document Content:\n${contextAndText.substring(0, 15000)}`
        });
    }

    const completion = await openai.chat.completions.create({
        model: G_P_T_MODEL,
        messages,
        response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error(`No content from ${O_A_I}`);
    return JSON.parse(content);
}

async function analyzeWithDeepSeek(contextAndText: string, fileName: string, images: string[], lang: string, deepseekKey: string, country?: string, region?: string) {
    const deepseek = new OpenAI({
        apiKey: deepseekKey,
        baseURL: "https://api.deepseek.com"
    });

    const locationCtx = country ? `User Location: ${country}${region ? `, ${region}` : ''}. ` : '';
    const localizedPrompt = `${JSON_PROMPT}\n\nIMPORTANT: The user's language is ${lang}. ${locationCtx}ALL text values in the JSON output MUST be in ${lang}. regionalContext MUST reflect laws/rules specific to ${country || 'the user\'s country'}${region ? ` and ${region}` : ''}.`;

    const messages: any[] = [
        { role: "system", content: localizedPrompt }
    ];

    if (images.length > 0) {
        // DeepSeek currently has limited vision support in some regions/versions, 
        // but it is OpenAI-compatible. We'll use the chat completion format.
        let content: any[] = [{ type: "text", text: `Additional context: ${contextAndText || 'Analyze this document.'}` }];

        for (const imgBase64 of images) {
            let mimeType = 'image/jpeg';
            if (imgBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
            else if (imgBase64.startsWith('iVBOR')) mimeType = 'image/png';

            content.push({
                type: "image_url",
                image_url: {
                    url: `data:${mimeType};base64,${imgBase64}`
                }
            });
        }

        messages.push({
            role: "user",
            content
        });
    } else {
        messages.push({
            role: "user",
            content: `Document Content:\n${contextAndText.substring(0, 15000)}`
        });
    }

    const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages,
        response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content from DeepSeek");
    return JSON.parse(content);
}

const AI_TIMEOUT_MS = 15000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, modelName: string): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${modelName} took more than ${timeoutMs}ms`)), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
}

export default async function handler(req: Request) {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS_HEADERS });
    }

    try {
        const { contextAndText = "", fileName = "document", imageBase64, imagesBase64, lang = "English", country, region } = await req.json();

        const images = imagesBase64 || (imageBase64 ? [imageBase64] : []);

        if (!contextAndText && images.length === 0) {
            return new Response(JSON.stringify({ error: "No context or image provided" }), { status: 400, headers: CORS_HEADERS });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        const deepseekKey = process.env.DEEPSEEK_API_KEY;

        console.log(`Keys available: OpenAI: ${!!openaiKey}, Gemini: ${!!geminiKey}, DeepSeek: ${!!deepseekKey}, Lang: ${lang}`);

        if (!openaiKey && !geminiKey && !deepseekKey) {
            throw new Error("No API keys configured on server.");
        }

        // --- China Routing Logic ---
        const isChina = country === 'China' || country === 'CN';
        if (isChina && deepseekKey) {
            console.log("Routing to D-S.");
            const result = await analyzeWithDeepSeek(contextAndText, fileName, images, lang, deepseekKey, country, region);
            const modelId = ID_DS_C;
            return new Response(JSON.stringify({
                ...result,
                fileName,
                fullText: result.extractedText || contextAndText,
                timestamp: new Date().toISOString(),
                modelUsed: modelId
            }), {
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json',
                    'X-Model-Id': modelId
                }
            });
        }

        // --- Smart Selection Logic ---
        // Gemini is preferred for images (vision quality) and long texts (context window)
        // OpenAI is preferred for shorter, quick text analysis
        const isLongText = contextAndText.length > 15000;
        const isImage = images.length > 0;

        const primaryModel = (isImage || isLongText) ? "gemini" : "openai";
        const secondaryModel = primaryModel === "gemini" ? "openai" : "gemini";

        console.log(`Primary selection: ${primaryModel} (isImage: ${isImage}, length: ${contextAndText.length})`);

        let finalModel = "none";
        let result: any;
        let errors: string[] = [];

        // Try Primary
        try {
            if (primaryModel === "gemini" && geminiKey) {
                result = await withTimeout(analyzeWithGemini(contextAndText, fileName, images, lang, geminiKey, country, region), AI_TIMEOUT_MS, "gem-p");
                finalModel = ID_G_F;
            } else if (openaiKey) {
                result = await withTimeout(analyzeWithOAI(contextAndText, fileName, images, lang, openaiKey, country, region), AI_TIMEOUT_MS, "o-p");
                finalModel = ID_O_M;
            } else if (geminiKey) {
                result = await withTimeout(analyzeWithGemini(contextAndText, fileName, images, lang, geminiKey, country, region), AI_TIMEOUT_MS, "gem-p");
                finalModel = ID_G_F;
            }
        } catch (e: any) {
            console.error(`P-M failed or timed out`);
            errors.push(e.message);
        }

        // Try Secondary if Primary failed
        if (!result) {
            console.log(`Attempting fallback`);
            try {
                if (secondaryModel === "gemini" && geminiKey) {
                    result = await withTimeout(analyzeWithGemini(contextAndText, fileName, images, lang, geminiKey, country, region), AI_TIMEOUT_MS, "gem-f");
                    finalModel = ID_G_F + "-f";
                } else if (openaiKey) {
                    result = await withTimeout(analyzeWithOAI(contextAndText, fileName, images, lang, openaiKey, country, region), AI_TIMEOUT_MS, "o-f");
                    finalModel = ID_O_M + "-f";
                }
            } catch (e: any) {
                console.error(`S-M failed or timed out`);
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
                'X-Model-Id': finalModel
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

