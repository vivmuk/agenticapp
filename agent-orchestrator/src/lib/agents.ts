
import { veniceChatCompletion, veniceImageGenerate, VeniceChatRequest, VeniceMessage } from '@/lib/venice';

// --- Types ---

export type AgentRole = 'planner' | 'researcher' | 'writer' | 'critic' | 'finalizer' | 'visualizer';

export interface AgentStep {
    id: string;
    role: AgentRole;
    status: 'pending' | 'running' | 'completed' | 'failed';
    content: string;
    metadata?: any;
}

export interface StructuredResearch {
    facts: string[];
    stats: string[];
    insights: string[];
    sources: string[];
}

export interface CritiqueResult {
    scores: { hook: number; readability: number; viralPotential: number };
    critique: string;
    suggestions: string[];
    specialistFeedback: { hook: string; readability: string; viral: string };
}

export interface FactCheckResult {
    verified: boolean;
    issues: string[];
    corrections: string[];
    correctedPost: string;
}

// --- Private Helpers ---

async function getFullResponseText(response: Response): Promise<string> {
    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function parseJsonSafe<T>(text: string, fallback: T): T {
    try {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start !== -1 && end !== -1) return JSON.parse(clean.substring(start, end + 1));
        return JSON.parse(clean);
    } catch {
        return fallback;
    }
}

// --- Retry & Fallback Infrastructure ---

// Generic retry with exponential backoff
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 1000): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries - 1) {
                await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
            }
        }
    }
    throw lastError;
}

// Non-streaming call with fallback to qwen3-4b if primary model fails
async function chatWithFallback(request: VeniceChatRequest): Promise<Response> {
    try {
        return await withRetry(() => veniceChatCompletion(request), 2);
    } catch {
        console.warn(`Model ${request.model} failed; falling back to qwen3-4b`);
        return await withRetry(() => veniceChatCompletion({ ...request, model: 'qwen3-4b' }), 2);
    }
}

// Streaming call with fallback to qwen3-4b if primary model fails
export async function streamWithFallback(request: VeniceChatRequest): Promise<Response> {
    try {
        return await withRetry(() => veniceChatCompletion(request), 2);
    } catch {
        console.warn(`Streaming model ${request.model} failed; falling back to qwen3-4b`);
        return await withRetry(() => veniceChatCompletion({ ...request, model: 'qwen3-4b' }), 2);
    }
}

// --- Agents ---

// 1. Planner Agent
export async function planPost(topic: string): Promise<string[]> {
    const request: VeniceChatRequest = {
        model: 'qwen3-4b',
        messages: [
            { role: 'system', content: 'You are an expert Content Strategy Planner.' },
            {
                role: 'user',
                content: `Create a comprehensive step-by-step plan to write a high-viral potential LinkedIn post about: "${topic}".

Return ONLY a raw JSON object with a "plan" key containing a list of strings. Do not use markdown.
Example: { "plan": ["Hook: ...", "Body point 1: ..."] }`
            }
        ],
        stream: false,
        venice_parameters: { include_venice_system_prompt: false }
    };

    const response = await chatWithFallback(request);
    const text = await getFullResponseText(response);
    const parsed = parseJsonSafe<{ plan?: string[] }>(text, {});
    return parsed.plan ?? text.split('\n').filter(l => l.trim().length > 0);
}

// 2a. Researcher Agent (Grok) - streaming with web search
export async function researchTopicStream(topic: string, plan: string[]): Promise<Response> {
    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages: [
            { role: 'system', content: 'You are a Research Assistant. Always cite your sources.' },
            {
                role: 'user',
                content: `Topic: "${topic}"
Plan: ${plan.join('\n')}

Perform deep research. Provide key facts, statistics with specific numbers, and counter-intuitive insights. Include source URLs for every claim.`
            }
        ],
        stream: true,
        venice_parameters: {
            include_venice_system_prompt: true,
            enable_web_search: 'auto',
            include_search_results_in_stream: true,
            enable_web_citations: true
        }
    };
    return streamWithFallback(request);
}

// 2b. Researcher Agent (Qwen) - streaming with web search
export async function researchTopicStreamQwen(topic: string, plan: string[]): Promise<Response> {
    const request: VeniceChatRequest = {
        model: 'qwen3-4b',
        messages: [
            { role: 'system', content: 'You are a Research Assistant. Always cite your sources.' },
            {
                role: 'user',
                content: `Topic: "${topic}"
Plan: ${plan.join('\n')}

Perform deep research via web search. Focus on unique data points, diverse perspectives, and alternative sources. Cite all sources.`
            }
        ],
        stream: true,
        venice_parameters: {
            include_venice_system_prompt: true,
            enable_web_search: 'auto',
            include_search_results_in_stream: true,
            enable_web_citations: true
        }
    };
    return streamWithFallback(request);
}

// 2c. Research Structurer - extracts structured facts/stats/insights/sources from raw research
export async function structureResearch(rawResearch: string, topic: string): Promise<StructuredResearch> {
    const request: VeniceChatRequest = {
        model: 'qwen3-4b',
        messages: [
            { role: 'system', content: 'You are a research analyst. Extract only claims explicitly supported by the research text.' },
            {
                role: 'user',
                content: `Extract structured information from this research about "${topic}".

Research:
${rawResearch.substring(0, 3500)}

Return ONLY valid JSON (no markdown):
{
  "facts": ["verified fact 1", "verified fact 2", "..."],
  "stats": ["specific statistic with number and source 1", "statistic 2", "..."],
  "insights": ["counter-intuitive insight 1", "unique angle 2", "..."],
  "sources": ["full URL or citation 1", "URL or citation 2", "..."]
}

Include up to 6 items per category. Only include claims directly supported by the research above.`
            }
        ],
        stream: false,
        venice_parameters: { include_venice_system_prompt: false, strip_thinking_response: true }
    };

    const response = await chatWithFallback(request);
    const text = await getFullResponseText(response);
    return parseJsonSafe<StructuredResearch>(text, { facts: [], stats: [], insights: [], sources: [] });
}

// 3. Writer Agent - uses structured research for grounded, accurate claims
export async function writeDraftStream(
    topic: string,
    plan: string[],
    researchData: string,
    previousContext?: string,
    tone?: string,
    structuredResearch?: StructuredResearch,
    humanFeedback?: string
): Promise<Response> {
    const toneInstruction = tone ? `\nTone: Write in a ${tone} voice.` : '';
    const feedbackInstruction = humanFeedback
        ? `\nDIRECTION FROM EDITOR (apply this):\n${humanFeedback}`
        : '';

    let researchSection: string;
    if (structuredResearch && structuredResearch.facts.length > 0) {
        researchSection = `KEY FACTS (cite these for accuracy):
${structuredResearch.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

STATISTICS (use specific numbers):
${structuredResearch.stats.map((s, i) => `${i + 1}. ${s}`).join('\n')}

UNIQUE INSIGHTS (differentiate your post with these):
${structuredResearch.insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}

SOURCES TO CITE:
${structuredResearch.sources.join('\n')}`;
    } else {
        researchSection = `Research:\n${researchData.substring(0, 2000)}`;
    }

    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages: [
            {
                role: 'system',
                content: 'You are a Viral LinkedIn Ghostwriter and Savvy Journalist. Ground every claim in the provided research data.'
            },
            {
                role: 'user',
                content: `Topic: "${topic}"

${researchSection}
${previousContext ? `\nPREVIOUS DRAFTS & CRITIQUES (improve on these):\n${previousContext}` : ''}${toneInstruction}${feedbackInstruction}

Write a draft. High impact. Short sentences. One big idea.
Quality: Savvy journalist / Best social media writer.
Constraints:
1. Do NOT use em-dashes (—). Use hyphens or commas instead.
2. Every statistic must come from the research data above.
3. Include at least one specific number or data point.`
            }
        ],
        stream: true,
        venice_parameters: { include_venice_system_prompt: true }
    };

    return streamWithFallback(request);
}

// 4. Critic - Three specialist agents running in parallel for thorough evaluation
export async function critiqueWithSpecialists(draft: string): Promise<CritiqueResult> {
    const makeReq = (system: string, user: string): VeniceChatRequest => ({
        model: 'grok-41-fast',
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ] as VeniceMessage[],
        stream: false,
        venice_parameters: { include_venice_system_prompt: false }
    });

    // Run all 3 specialists in parallel
    const [hookRes, readRes, viralRes] = await Promise.all([
        chatWithFallback(makeReq(
            'You are a Hook Expert. You specialize in LinkedIn opening lines that stop the scroll. Be specific and tough.',
            `Evaluate ONLY the hook (first 1-3 lines) of this post.

Draft:
${draft.substring(0, 600)}

Return ONLY valid JSON: {"score": <1-10>, "feedback": "<specific hook critique>", "suggestion": "<rewritten hook scoring 9+"}`
        )),
        chatWithFallback(makeReq(
            'You are a Readability Editor for busy executives. You value scannable, punchy, clear writing.',
            `Evaluate ONLY the readability of this post (sentence length, paragraph breaks, word choice, flow).

Draft:
${draft}

Return ONLY valid JSON: {"score": <1-10>, "feedback": "<specific readability issues>", "suggestion": "<key structural fix>"}`
        )),
        chatWithFallback(makeReq(
            'You are a Viral Content Strategist. You know exactly what drives LinkedIn posts to 1000+ reactions.',
            `Evaluate ONLY the viral potential (shareability, emotional resonance, novelty, comment-worthiness).

Draft:
${draft}

Return ONLY valid JSON: {"score": <1-10>, "feedback": "<why it will or won't go viral>", "suggestion": "<single biggest change to maximize virality>"}`
        ))
    ]);

    const parseSpec = async (res: Response) => {
        const text = await getFullResponseText(res);
        return parseJsonSafe<{ score: number; feedback: string; suggestion: string }>(
            text, { score: 5, feedback: 'Parse error', suggestion: '' }
        );
    };

    const [hookData, readData, viralData] = await Promise.all([
        parseSpec(hookRes),
        parseSpec(readRes),
        parseSpec(viralRes)
    ]);

    return {
        scores: {
            hook: hookData.score ?? 5,
            readability: readData.score ?? 5,
            viralPotential: viralData.score ?? 5
        },
        critique: `Hook: ${hookData.feedback} | Readability: ${readData.feedback} | Viral: ${viralData.feedback}`,
        suggestions: [hookData.suggestion, readData.suggestion, viralData.suggestion].filter(Boolean),
        specialistFeedback: {
            hook: hookData.feedback || '',
            readability: readData.feedback || '',
            viral: viralData.feedback || ''
        }
    };
}

// 5. Finalizer Agent
export async function finalizePostStream(draft: string, suggestions: string[]): Promise<Response> {
    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages: [
            { role: 'system', content: 'You are the Lead Writer. Polish this to perfection.' },
            {
                role: 'user',
                content: `Draft: ${draft}

Fixes needed:
${suggestions.join('\n')}

Output the final version.
Constraints:
1. Ensure no <think> tags are in the output.
2. Do NOT use em-dashes (—).
3. Maintain the voice of a savvy journalist.
4. Capture a nuanced "Type 2 thinking" line towards the end.
5. Format all links as clickable Markdown: [text](url).`
            }
        ],
        stream: true,
        venice_parameters: { include_venice_system_prompt: true }
    };
    return streamWithFallback(request);
}

// 6. Fact Checker - cross-references final post against research ground truth
export async function factCheckPost(finalPost: string, researchData: string): Promise<FactCheckResult> {
    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages: [
            {
                role: 'system',
                content: 'You are a rigorous fact-checker. Cross-reference every specific claim, number, and statistic against the provided research. Flag anything unsupported.'
            },
            {
                role: 'user',
                content: `Cross-check the following post against the research data.

RESEARCH DATA (ground truth):
${researchData.substring(0, 3000)}

POST TO VERIFY:
${finalPost}

Return ONLY valid JSON:
{
  "verified": <true if no issues found>,
  "issues": ["specific unsupported or inaccurate claim 1", "..."],
  "corrections": ["correction for issue 1", "..."],
  "correctedPost": "<the full post with corrections applied, or the original if verified>"
}`
            }
        ],
        stream: false,
        venice_parameters: { include_venice_system_prompt: false }
    };

    const response = await chatWithFallback(request);
    const text = await getFullResponseText(response);
    return parseJsonSafe<FactCheckResult>(text, {
        verified: true,
        issues: [],
        corrections: [],
        correctedPost: finalPost
    });
}

// 7a. Post Summarizer (for image context)
export async function summarizePost(postContent: string): Promise<string> {
    const request: VeniceChatRequest = {
        model: 'qwen3-4b',
        messages: [
            { role: 'system', content: 'You are a concise content summarizer.' },
            {
                role: 'user',
                content: `Summarize the following LinkedIn post in 2-3 sentences, capturing the core theme, main insight, and key visual concepts that could be depicted in an illustration.

Post:
${postContent.substring(0, 2000)}

Return ONLY the summary text, no labels or preamble.`
            }
        ],
        stream: false,
        venice_parameters: { include_venice_system_prompt: false, strip_thinking_response: true }
    };

    const response = await chatWithFallback(request);
    return await getFullResponseText(response);
}

// 7b. Image Prompt Generator
async function generateImagePrompt(postContent: string, summary: string): Promise<string> {
    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages: [
            { role: 'system', content: 'You are an Expert Art Director specializing in Whimsical Watercolor Art.' },
            {
                role: 'user',
                content: `Create an illustration prompt for a LinkedIn post. Use the summary and post content below.

SUMMARY:
${summary}

POST CONTENT (additional context):
"${postContent.substring(0, 800)}..."

Create a "Whimsical Watercolor style" image prompt using this EXACT structure:

WORK SURFACE: A soft, textured watercolor paper background.
LAYOUT: Flowing, organic composition. Dreamy and whimsical atmosphere.
SUBJECT: [Derive the central subject directly from the SUMMARY - specific and thematically relevant]
COMPONENTS: [Extract 3-4 key visual elements from the summary, in soft hand-painted watercolor style]
STYLE: Whimsical watercolor, soft pastels, bleeding edges, gentle strokes, artistic, dreamy.
CONSTRAINTS: NO TEXT, NO WRITING, NO LETTERS, NO SIGNATURES on the image.

Return ONLY the prompt text. Max 1500 characters.`
            }
        ],
        stream: false
    };

    const res = await chatWithFallback(request);
    return await getFullResponseText(res);
}

// 7c. Image Generator (seedream-v4)
export async function generateImage(postContent: string, summary: string): Promise<string | null> {
    let imagePrompt = await generateImagePrompt(postContent, summary);
    if (imagePrompt.length > 1500) imagePrompt = imagePrompt.substring(0, 1500);
    imagePrompt = imagePrompt.replace(/\*\*/g, '');

    try {
        const result = await veniceImageGenerate({
            model: 'seedream-v4',
            prompt: imagePrompt,
            negative_prompt: "dark, gritty, dystopian, text, words, letters, signature, watermark, logo, caption, writing, typography, speech bubble, label, title, messy, cluttered, decay",
            width: 1024,
            height: 1024,
            hide_watermark: true,
            steps: 20,
            cfg_scale: 7
        }, 60000);

        if (result.images && Array.isArray(result.images)) return `data:image/png;base64,${result.images[0]}`;
        if (result.data?.[0]?.url) return result.data[0].url;
        if (result.data?.[0]?.b64_json) return `data:image/png;base64,${result.data[0].b64_json}`;
        return null;
    } catch (e) {
        console.error('Image Gen Error:', e);
        return null;
    }
}
