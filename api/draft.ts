
// DocuMate API - Updated: 2026-02-18T14:10
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export const config = {
    runtime: "edge",
};

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, X-Model-Used",
    "Access-Control-Expose-Headers": "X-Model-Used",
};


export default async function handler(req: Request) {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS_HEADERS });
    }

    try {
        const { context, tone, template, lang = "English" } = await req.json();

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!openaiKey && !geminiKey) throw new Error("No API keys configured");

        let taskInstructions = "";
        if (template === 'Form Filling Data') {
            taskInstructions = `
- Conduct a FRESH AND DEEP ANALYTICAL REVIEW of the entire document context to identify all interactive, fillable, or required fields.
- Analyze each field WITHIN THE CONTEXT of the document's purpose (e.g., if it's a tax form, explain the financial implications).
- Act as a STEP-BY-STEP TUTORIAL (guide détaillé) guiding the user.
- For EVERY field identified, explain:
    1. WHAT exactly is required.
    2. WHY it is required (the legal or administrative context).
    3. WHERE to find the information if it's not already in the document.
- DO NOT impose rigid data extraction constraints; instead, provide a flexible, instructional narrative.
- Use a supportive and pedagogical tone.`;
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
3. If the task is "Form Filling Data", the "draft" should be a SINGLE STRING formatted as a list (use newlines), NOT a nested JSON object.

You must return a JSON object with:
1. "draft": The generated response/answer.
2. "explanation": A very simple explanation of what this says.
3. "disclaimer": A standard reminder that this is AI-generated.`;

        // Smart Logic: Gemini preferred for Forms (Deep Analysis) or Long Text
        const isForm = template === 'Form Filling Data';
        const isLong = context.length > 15000;

        // Gemini has 1M context, GPT-4o-mini has 128k but is cost-effective.
        // We prefer Gemini for "Form Filling" to ensure we don't truncate text if possible.
        const primaryModel = (isForm || isLong) ? "gemini" : "openai";
        const secondaryModel = primaryModel === "gemini" ? "openai" : "gemini";

        let result;
        let errors = [];

        // Helper for Gemini
        const callGemini = async (ctx: string) => {
            const ai = new GoogleGenAI({ apiKey: geminiKey! });
            // Gemini can handle huge context, let's cap at 100k safely
            const prompt = `Context: "${ctx.substring(0, 100000)}"\n\n${systemPrompt}`;
            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { responseMimeType: "application/json" }
            });
            return response.text;
        };

        // Helper for OpenAI
        const callOpenAI = async (ctx: string) => {
            const openai = new OpenAI({ apiKey: openaiKey! });
            // GPT-4o-mini context is 128k, but let's be safe with output tokens. Cap at 30k.
            const prompt = `Context: "${ctx.substring(0, 30000)}"`;
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            return completion.choices[0].message.content;
        };

        // Execution
        try {
            if (primaryModel === "gemini" && geminiKey) {
                result = await callGemini(context);
            } else if (openaiKey) {
                result = await callOpenAI(context);
            } else if (geminiKey) {
                result = await callGemini(context);
            }
        } catch (e: any) {
            console.error(`Primary draft model (${primaryModel}) failed:`, e);
            errors.push(e.message);
        }

        if (!result) {
            try {
                if (secondaryModel === "gemini" && geminiKey) {
                    result = await callGemini(context);
                } else if (openaiKey) {
                    result = await callOpenAI(context);
                }
            } catch (e: any) {
                console.error(`Secondary draft model (${secondaryModel}) failed:`, e);
                errors.push(e.message);
            }
        }

        if (!result) throw new Error(`Draft generation failed. Errors: ${errors.join(' | ')}`);

        return new Response(result, {
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json',
                'X-Model-Used': result ? (errors.length > 0 ? secondaryModel : primaryModel) : 'none'
            }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
