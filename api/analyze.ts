// DocuMate API - Updated: 2026-02-18T13:30
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export const config = {
    runtime: "edge",
};

const JSON_PROMPT = `You are a pedagogical and administrative assistant AI named DocuMate. Analyze the provided document.
Output MUST be in the user's language unless specified otherwise.
CRITICAL: You are an assistant helping users understand their documents. Do not give direct medical or legal advice (like "take this pill" or "sue this person"), but DO explain and simplify complex administrative, medical, or legal terms found in the document.
Be careful for bills, user has to make sure it's a legitimate bill before you advise to pay the bill on time or not (check for scam or legitimacy).
Return a JSON object with:
- "summary": 2-3 sentences plain English OVERALL summary. If there are jargon terms, explain them in parentheses.
- "keyPoints": array of 5 key points, more if the document is long (more than 2 pages, adapt)
- "warning": potential risks or "null" if none
- "category": one of ["bill", "form", "scam", "legal", "other"]
- "suggestedActions": array of {type, label, description}
  - type: one of ["contact", "fill", "dispute", "ignore", "ask for clarifications"] if relevant
  - label: short action button text (3 words max) e.g., "Contest", "Ask for delay", "Provide details".
  - description: why this action is recommended.
- "pages": An array of objects, one for each page in the document. Each object MUST contain:
  - "pageNumber": integer starting from 1
  - "summary": a brief summary of THIS SPECIFIC PAGE
  - "extractedText": THE FULL, EXACT TEXT CONTENT (OCR) of THIS SPECIFIC PAGE. This is MANDATORY.
- "extractedText": THE FULL, EXACT TEXT CONTENT of the ENTIRE document (as a fallback).
- "isLegible": boolean (true if document content is readable, false if too blurry/dark/cutoff)
- "illegibleReason": string ("null" if legible, otherwise short explanation in user's language e.g. "Image too blurry")`;

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, X-Model-Used",
    "Access-Control-Expose-Headers": "X-Model-Used",
};


async function analyzeWithGemini(contextAndText: string, fileName: string, imageBase64: string | undefined, lang: string, geminiKey: string) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const localizedPrompt = `${JSON_PROMPT}\n\nIMPORTANT: The user's language is ${lang}. ALL text values in the JSON output (summary, keyPoints, warning, label, description, illegibleReason) MUST be translated to ${lang}.`;

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
                    required: ["summary", "keyPoints", "category", "suggestedActions", "pages", "isLegible", "illegibleReason", "extractedText"]
                }
            }
        });

        return JSON.parse(response.text || "");
    } catch (e: any) {
        console.error("Gemini Analysis Error:", e);
        throw e;
    }
}

async function analyzeWithOpenAI(contextAndText: string, fileName: string, imageBase64: string | undefined, lang: string, openaiKey: string) {
    const openai = new OpenAI({ apiKey: openaiKey });

    const localizedPrompt = `${JSON_PROMPT}\n\nIMPORTANT: The user's language is ${lang}. ALL text values in the JSON output (summary, keyPoints, warning, label, description, illegibleReason) MUST be translated to ${lang}.`;

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
        const { contextAndText = "", fileName = "document", imageBase64, lang = "English" } = await req.json();

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
                result = await analyzeWithGemini(contextAndText, fileName, imageBase64, lang, geminiKey);
                finalModel = "gemini-2.0-flash";
            } else if (openaiKey) {
                result = await analyzeWithOpenAI(contextAndText, fileName, imageBase64, lang, openaiKey);
                finalModel = "gpt-4o-mini";
            } else if (geminiKey) {
                // Fallback if primary key missing but gemini available
                result = await analyzeWithGemini(contextAndText, fileName, imageBase64, lang, geminiKey);
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
                    result = await analyzeWithGemini(contextAndText, fileName, imageBase64, lang, geminiKey);
                    finalModel = "gemini-2.0-flash (fallback)";
                } else if (openaiKey) {
                    result = await analyzeWithOpenAI(contextAndText, fileName, imageBase64, lang, openaiKey);
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

