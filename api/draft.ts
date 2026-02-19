
// DocuMate API - Updated: 2026-02-18T14:10
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

        let taskInstructions = "";
        if (template === 'Form Filling Data') {
            taskInstructions = `
- Extract EVERY specific field/piece of information required by the form from the document (names, dates, amounts, etc.).
- Format as a structured list "Field Name: Value". 
- If a value is missing or not in the text, write "[N/A]". 
- DO NOT invent or assume any information. Be extremely literal.`;
        } else if (template === 'Clarify') {
            taskInstructions = `
- Identify complex, vague, or ambiguous points in the document.
- Draft a formal message to the sender/administration asking for specific clarifications on those points.`;
        } else if (template === 'Dispute') {
            taskInstructions = `
- Identify fees, claims, or clauses that seem unfair, incorrect, or contestable.
- Draft a formal contestation citing those specific parts and explaining why they are disputed.`;
        } else if (template === 'Extension') {
            taskInstructions = `
- Draft a formal request for a deadline extension (14-30 days).
- Cite the complexity of the document and the need for more time to prepare a complete response.`;
        } else if (template.startsWith('Question:')) {
            taskInstructions = `
- Answer the following user question based ONLY on the provided document: ${template.replace('Question:', '')}
- Provide a clear, direct answer. If the answer is not in the document, say you don't know based on the provided text.`;
        } else {
            taskInstructions = `- Generate a highly professional, formal response draft based on the document content and the task: ${template}.`;
        }

        const systemPrompt = `You are DocuMate, a helpful legal assistant.
You will receive a document context and a task.
Tone: ${tone}
User Language: ${lang}

SPECIFIC TASK INSTRUCTIONS:
${taskInstructions}

IMPORTANT: 
1. ALL text values in the JSON output (draft, explanation) MUST be in ${lang}.
2. Use NO legal jargon in the "explanation".
3. If the task is "Form Filling Data", the "draft" should be a structured list, not a letter.

You must return a JSON object with:
1. "draft": The generated response/answer.
2. "explanation": A very simple explanation of what this says.
3. "disclaimer": A standard reminder that this is AI-generated.`;

        const userPrompt = `Context: "${context.substring(0, 7000)}"`;

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
