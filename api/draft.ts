
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
Act as a Legal Educator. Help the user fill out this specific form.

For EACH field that needs to be filled, use this 3-step Chain-of-Thought process:

1. **IDENTIFY** – What is the legal purpose of this field?
2. **EXPLAIN** – What exact information is required, in plain everyday language?
3. **EXAMPLE** – Provide a concrete example of how to fill it (e.g., for "Date de naissance" → "Entrez votre date de naissance au format JJ/MM/AAAA : ex. 15/04/1990").

FORMAT: Bullet points per field. Use "**Nom du champ**" as the field header.
TONE: Advisory, professional, and empathetic. Address the user directly ("you", "your").
CRITICAL: DO NOT prefill the form with mock data (like "Votre Nom"). EXPLAIN what is needed.
- If the info is already visible in the document context, mention it explicitly: "You can find this at the top of page 2: ref. 12345".
- For standard fields (name, surname, birthdate, gender), assume the user knows their info — focus your explanation on WHERE to find less obvious info.`;
        } else if (template === 'Ask for clarifications') {
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
            const userMessage = template.replace('Question:', '').trim();
            // Detect if the user wants to WRITE/ACT (mail, letter, response, request)
            const writingKeywords = /\b(mail|email|e-mail|lettre|letter|écrire|ecrire|rédiger|rediger|write|draft|brouillon|contester|contest|disputer|répondre|repondre|respond|reply|délai|delai|payer|demander|envoyer|send|extension|request|courrier)\b/i;
            const wantsToWrite = writingKeywords.test(userMessage);

            // REVISION MODE: if a draft already exists, modify it rather than regenerate
            if (currentDraft && currentDraft.length > 50) {
                taskInstructions = `
Act as a Precision Editor. The user wants to refine an existing draft.

PREVIOUS DRAFT:
"""
${currentDraft}
"""

USER INSTRUCTION: "${userMessage}"

REVISION RULES:
1. ANALYZE: Identify specifically what the user wants to change (tone, detail, length, argument).
2. UPDATE: Modify the existing draft while preserving correct administrative data (names, dates, amounts, references).
3. ROLE PERSISTENCE: The USER (app user) is the SENDER. The entity in the original document is the RECIPIENT. Never swap these.
4. NO CHAT: Provide the updated draft immediately in the "draft" field.
5. In "chatResponse", briefly confirm what you changed (1 sentence max).
6. DO NOT ask any questions. DO NOT say "Voulez-vous que je...". Just do it.`;
            } else if (wantsToWrite) {
                taskInstructions = `
The user wants to WRITE a response to the document: "${userMessage}"

CRITICAL ROLE RULE:
- The USER of this app is the SENDER of the draft. Write in first person ("I", "We", "Je").
- The entity/person who SENT the original document is the RECIPIENT of the draft.
- Example: if the document is a bill from "Régie Immobilière", write FROM the user TO the Régie.
- NEVER write a letter FROM the document's sender. The user is RESPONDING to the document.

EXECUTION RULES:
1. IMMEDIATELY generate a complete, ready-to-copy email/letter in the "draft" field.
2. Use document details (amounts, dates, sender name, reference numbers) from the context.
3. If the user expresses disagreement ("too expensive", "already paid", "scam", "délai"), use those arguments.
4. DO NOT ask "What do you want to say?" or "Could you provide more details?". Write NOW.
5. FORMAT: Professional formal email/letter with subject line, sender/recipient, salutation, body, closing.
6. In "chatResponse", confirm in 1 sentence: e.g. "Voici votre brouillon de demande de délai."
7. TONE: Firm but polite, ${lang} administrative style.`;
            } else {
                taskInstructions = `
The user has a follow-up question: "${userMessage}"

RULES:
- Answer clearly in "chatResponse". Return "" in "draft" (no draft needed for questions).
- Simplify complex terms. Explain jargon in parentheses.
- SELF-CHECK: If the user is actually asking to WRITE something (even indirectly), produce the draft immediately instead.
- DO NOT ask the user to clarify. If the intent is ambiguous, generate a draft anyway.`;
            }
        } else {
            taskInstructions = `- Generate a highly professional, formal response draft based on the document content and the task: ${template}.
- The document might be addressed TO the user. If you are drafting a response to the sender, WRITE AS THE USER addressing the sender (first person "I", "We"). DO NOT reply as if the user is replying to themselves.`;
        }

        const systemPrompt = `You are DocuMate, a proactive administrative writing assistant.
Tone: ${tone}
User Language: ${lang}

CRITICAL ROLE RULE (NEVER VIOLATE):
- The USER of this application is always the AUTHOR/SENDER of any draft you generate.
- The entity or person mentioned in the document context is the RECIPIENT.
- Write drafts in first person ("I", "We", "Je", "Nous") on behalf of the user.
- NEVER draft a message FROM the document's sender/entity.

BEHAVIOR RULES:
- NEVER ask permission ("Voulez-vous que je...", "Could you provide..."). Act immediately.
- NEVER add preambles. Generate the output directly.
- If the user requests an action (delay, dispute, response), produce the draft NOW.

${taskInstructions}

IMPORTANT:
1. ALL text MUST be in ${lang}.
2. Use NO legal jargon in explanations.
3. If task is "Form Filling Data", draft is a SINGLE STRING list.

Return a JSON object with:
1. "draft": The generated/updated draft document.
2. "explanation": Simple explanation of what the draft says (for new drafts only).
3. "chatResponse": Brief confirmation or answer (1-2 sentences max).
4. "disclaimer": Standard AI-generated reminder.`;

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

        let finalModel = "none";

        // Execution
        try {
            if (primaryModel === "gemini" && geminiKey) {
                result = await callGemini(context);
                finalModel = "gemini-2.0-flash";
            } else if (openaiKey) {
                result = await callOpenAI(context);
                finalModel = "gpt-4o-mini";
            } else if (geminiKey) {
                result = await callGemini(context);
                finalModel = "gemini-2.0-flash";
            }
        } catch (e: any) {
            console.error(`Primary draft model (${primaryModel}) failed:`, e);
            errors.push(e.message);
        }

        if (!result) {
            try {
                if (secondaryModel === "gemini" && geminiKey) {
                    result = await callGemini(context);
                    finalModel = "gemini-2.0-flash (fallback)";
                } else if (openaiKey) {
                    result = await callOpenAI(context);
                    finalModel = "gpt-4o-mini (fallback)";
                }
            } catch (e: any) {
                console.error(`Secondary draft model (${secondaryModel}) failed:`, e);
                errors.push(e.message);
            }
        }

        if (!result) throw new Error(`Draft generation failed. Errors: ${errors.join(' | ')}`);

        // Inject modelUsed into the result JSON
        const parsedResult = JSON.parse(result);
        parsedResult.modelUsed = finalModel;

        return new Response(JSON.stringify(parsedResult), {
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json',
                'X-Model-Used': finalModel
            }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
