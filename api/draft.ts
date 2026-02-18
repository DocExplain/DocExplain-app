
// DocuMate API - Updated: 2026-02-18T13:30
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
        const { context, tone, template, lang = "English" } = await req.json();

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        const systemPrompt = `You are DocuMate, a helpful legal assistant.
You will receive a document context and a task.
Task: ${template} (${tone} tone).

${template === 'Form Filling Data' ?
                'The user needs to fill a form. Instead of a letter, provide a structured list of the data/fields requested by the form and the corresponding values found in the document. Group related fields together.' :
                'Generate a highly professional, formal response draft.'}

IMPORTANT: The user's language is ${lang}. ALL text values in the JSON output (draft, explanation) MUST be in ${lang}.

You must return a JSON object with:
1. "draft": ${template === 'Form Filling Data' ? 'A structured list of fields and values to fill in the form' : 'A highly professional, formal response'} in ${lang}.
2. "explanation": A very simple, plain-language explanation of what this response says and why we are providing it.
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
            try {
                const ai = new GoogleGenAI({ apiKey: geminiKey });
                const response = await ai.models.generateContent({
                    model: "gemini-2.0-flash",
                    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                    config: { responseMimeType: "application/json" }
                });

                return new Response(response.text || "", {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e: any) {
                console.error("Gemini Draft Error:", e);
                throw e;
            }
        }

        throw new Error("No API keys configured");

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
