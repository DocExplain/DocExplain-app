
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
        const { context, tone, template, lang = "English", currentDraft = "" } = await req.json();

        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!openaiKey && !geminiKey) throw new Error("No API keys configured");

        let taskInstructions = "";
        if (template === 'Form Filling Data') {
            taskInstructions = `
- Conduct a FRESH AND DEEP ANALYTICAL REVIEW of the Document Context.
- The user wants to fill out this form but needs help understanding what to put in each field.
- IDENTIFY every single field that needs to be filled.
- OUTPUT FORMAT: Provide a list where each item represents a field.
- Format each item EXACTLY as: "Field Name: <Explanation of what to write> (Context: <Any relevant info found in the doc>)"
- If the document contains the info (e.g. it's a pre-filled form or personal data is known from context), mention it.
- If it's a blank field, explain clearly what information is expected.
- Use a "Guide / Tutorial" style. addressing the user directly (e.g. "Here, put your name...").
- Do not output generic "Fill this form" text. Be specific to the fields found.
- Tone: Pedagogical, clear, helpful.`;
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
- The user has a follow-up request: "${template.replace('Question:', '')}"
- Here is the CURRENT DRAFT document they are editing:
"""
${currentDraft || "No draft exists yet"}
"""
- Analyze the user's request. If they are asking a question about the document or the topic, answer it clearly in the "chatResponse" field and return the CURRENT DRAFT exactly as it is in the "draft" field.
- If they are asking you to modify the draft (e.g. "make it shorter", "add my address"), rewrite the draft accordingly and return it in the "draft" field. In the "chatResponse" field, briefly confirm what you changed.
- If you use complex administrative, medical, or legal terms in "chatResponse", EXPLAIN THEM IMMEDIATELY IN PARENTHESES.`;
        } else {
            taskInstructions = `- Generate a highly professional, formal response draft based on the document content and the task: ${template}.
- The document might be addressed TO the user. If you are drafting a response to the sender, WRITE AS THE USER addressing the sender (first person "I", "We"). DO NOT reply as if the user is replying to themselves.`;
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
1. "draft": The generated or updated response/draft document.
2. "explanation": A very simple explanation of what the draft says (only required when generating a new draft).
3. "chatResponse": A conversational reply to the user (only required if answering a "Question" task, like "I added your address" or answering their question).
4. "disclaimer": A standard reminder that this is AI-generated.`;

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
