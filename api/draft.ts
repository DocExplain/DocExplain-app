
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
        const { context, tone, template, responseLanguage, appLanguage } = await req.json();

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        const systemPrompt = `You are DocuMate, a helpful legal assistant.
You will receive a document context and a task.
Task: ${template} (${tone} tone).

You must return a JSON object with:
1. "draft": A highly professional, formal response in ${responseLanguage || 'the original document language'}. This is what the user will send to the administration.
2. "explanation": A very simple, plain-language explanation in ${appLanguage || 'English'} of what this response says and why we are sending it. Use NO legal jargon here.
3. "disclaimer": A standard reminder that this is AI-generated.`;

        const userPrompt = `Context: "${context.substring(0, 5000)}"`;

        if (openaiKey) {
            const openai = new OpenAI({ apiKey: openaiKey });
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            });

            return new Response(completion.choices[0].message.content, {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (geminiKey) {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            return new Response(result.response.text(), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        throw new Error("No API keys configured");

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
