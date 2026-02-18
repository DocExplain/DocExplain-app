import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export const config = {
    runtime: "edge",
};

const JSON_PROMPT = `You are a legal expert AI named DocuMate. Analyze the provided document.
Output MUST be in the user's language unless specified otherwise.
Return a JSON object with:
- "summary": 2-3 sentences plain English summary
- "keyPoints": array of 5 key points
- "warning": potential risks or "null" if none
- "category": one of ["bill", "form", "scam", "legal", "other"]
- "suggestedActions": array of {type, label, description}
  - type: one of ["pay", "fill", "dispute", "ignore", "clarify"]
  - label: short action button text (3 words max)
  - description: why this action is recommended`;

async function analyzeWithGemini(contextAndText: string, fileName: string, imageBase64: string | undefined, geminiKey: string) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    let contents: any[] = [];

    if (imageBase64) {
        let mimeType = 'image/jpeg';
        if (imageBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
        else if (imageBase64.startsWith('iVBOR')) mimeType = 'image/png';
        else if (imageBase64.startsWith('JVBER')) mimeType = 'application/pdf';

        contents = [{
            role: 'user',
            parts: [
                { text: `${JSON_PROMPT}\n\nAdditional context: ${contextAndText || 'Analyze this document.'}` },
                { inlineData: { mimeType, data: imageBase64 } }
            ]
        }];
    } else {
        contents = [{
            role: 'user',
            parts: [{ text: `${JSON_PROMPT}\n\nContent: "${contextAndText.substring(0, 50000)}"` }]
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
                            }
                        }
                    },
                    required: ["summary", "keyPoints", "category", "suggestedActions"]
                }
            }
        });

        return JSON.parse(response.text || "");
    } catch (e: any) {
        console.error("Gemini Analysis Error:", e);
        throw e;
    }
}

async function analyzeWithOpenAI(contextAndText: string, fileName: string, imageBase64: string | undefined, openaiKey: string) {
    const openai = new OpenAI({ apiKey: openaiKey });

    const messages: any[] = [
        { role: "system", content: JSON_PROMPT }
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
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    try {
        const { contextAndText = "", fileName = "document", imageBase64 } = await req.json();

        if (!contextAndText && !imageBase64) {
            return new Response(JSON.stringify({ error: "No context or image provided" }), { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        console.log(`Keys available: OpenAI: ${!!openaiKey}, Gemini: ${!!geminiKey}`);

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

        let result;
        let errors = [];

        // Try Primary
        try {
            if (primaryModel === "gemini" && geminiKey) {
                result = await analyzeWithGemini(contextAndText, fileName, imageBase64, geminiKey);
            } else if (openaiKey) {
                result = await analyzeWithOpenAI(contextAndText, fileName, imageBase64, openaiKey);
            } else if (geminiKey) {
                // Fallback if primary key missing
                result = await analyzeWithGemini(contextAndText, fileName, imageBase64, geminiKey);
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
                    result = await analyzeWithGemini(contextAndText, fileName, imageBase64, geminiKey);
                } else if (openaiKey) {
                    result = await analyzeWithOpenAI(contextAndText, fileName, imageBase64, openaiKey);
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
            timestamp: new Date().toISOString()
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Model-Used': result ? (result.fallback ? secondaryModel : primaryModel) : 'none'
            }
        });

    } catch (err: any) {
        console.error("Handler Error:", err);
        return new Response(JSON.stringify({
            error: err.message || "Server Error",
            details: err.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

