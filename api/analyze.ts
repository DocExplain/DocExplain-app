
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

export const config = {
    runtime: "edge",
};

export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    try {
        const { contextAndText, fileName, imageBase64 } = await req.json();

        if (!contextAndText && !imageBase64) {
            return new Response(JSON.stringify({ error: "No context or image provided" }), { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        const jsonPrompt = `You are a legal expert AI named DocuMate. Analyze the provided document.
Return a JSON object with:
- "summary": 2-3 sentences plain English summary
- "keyPoints": array of 5 key points
- "warning": potential risks or "null" if none`;

        // --- Image path: Gemini Vision (multimodal) ---
        if (imageBase64 && geminiKey) {
            const ai = new GoogleGenAI({ apiKey: geminiKey });

            // Detect mime type from base64 header or default to jpeg
            let mimeType = 'image/jpeg';
            if (imageBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
            else if (imageBase64.startsWith('iVBOR')) mimeType = 'image/png';
            else if (imageBase64.startsWith('JVBER')) mimeType = 'application/pdf';

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `${jsonPrompt}\n\nAdditional context: ${contextAndText || 'Analyze this document.'}` },
                            { inlineData: { mimeType, data: imageBase64 } }
                        ]
                    }
                ],
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
            return new Response(JSON.stringify({
                ...JSON.parse(jsonText || "{}"),
                fileName,
                timestamp: new Date().toISOString()
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        // --- Text path: OpenAI first, then Gemini fallback ---
        if (openaiKey) {
            const openai = new OpenAI({ apiKey: openaiKey });

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: jsonPrompt },
                    { role: "user", content: `Document Content:\n${contextAndText.substring(0, 15000)}` }
                ],
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No content from OpenAI");
            const parsed = JSON.parse(content);

            return new Response(JSON.stringify({
                ...parsed,
                fileName,
                timestamp: new Date().toISOString()
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (geminiKey) {
            const ai = new GoogleGenAI({ apiKey: geminiKey });

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `${jsonPrompt}\n\nContent: "${contextAndText.substring(0, 25000)}"`,
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
            return new Response(JSON.stringify({
                ...JSON.parse(jsonText || "{}"),
                fileName,
                timestamp: new Date().toISOString()
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        throw new Error("No API keys configured on server.");

    } catch (err: any) {
        console.error("Analysis Error:", err);
        return new Response(JSON.stringify({ error: err.message || "Server Error" }), { status: 500 });
    }
}
