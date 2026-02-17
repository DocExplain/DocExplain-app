
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export const config = {
    runtime: "edge",
};

export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    try {
        const { context, tone, template } = await req.json();

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (openaiKey) {
            const openai = new OpenAI({ apiKey: openaiKey });
            const prompt = `
            Draft a response to a legal document.
            Context: "${context.substring(0, 5000)}"
            Goal: ${template}
            Tone: ${tone}
            output ONLY the body.
        `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            });

            return new Response(JSON.stringify({ draft: completion.choices[0].message.content }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (geminiKey) {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const prompt = `
            Draft a response to a legal document.
            Context: "${context.substring(0, 5000)}"
            Goal: ${template}
            Tone: ${tone}
            Output ONLY the body.
        `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            return new Response(JSON.stringify({ draft: response.text }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        throw new Error("No API keys configured");

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
