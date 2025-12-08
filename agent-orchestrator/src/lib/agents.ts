
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

// --- Helper to extract text from response and strip <think> tags ---
async function getFullResponseText(response: Response): Promise<string> {
    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    // Robustly remove thinking traces
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// --- Agents ---

// 1. Planner Agent
export async function planPost(topic: string) {
    const messages: VeniceMessage[] = [
        { role: 'system', content: 'You are an expert Content Strategy Planner.' },
        {
            role: 'user',
            content: `Create a comprehensive step-by-step plan to write a high-viral potential LinkedIn post about: "${topic}".
      
      Return ONLY a raw JSON object with a "plan" key containing a list of strings. Do not use markdown.
      Example: { "plan": ["Hook: ...", "Body point 1: ..."] }`
        }
    ];

    const request: VeniceChatRequest = {
        model: 'qwen3-4b',
        messages,
        stream: false,
        venice_parameters: { include_venice_system_prompt: false }
    };

    const response = await veniceChatCompletion(request);
    const text = await getFullResponseText(response);

    try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText).plan;
    } catch (e) {
        console.error("Failed to parse plan JSON:", text);
        return text.split('\n').filter(l => l.trim().length > 0);
    }
}

// 2a. Researcher Agent (Grok)
export async function researchTopicStream(topic: string, plan: string[]) {
    const messages: VeniceMessage[] = [
        { role: 'system', content: 'You are a Research Assistant.' },
        {
            role: 'user',
            content: `Topic: "${topic}"
      Plan: ${plan.join('\n')}
      
      Perform deep research. Provide key facts, stats, and counter-intuitive insights.`
        }
    ];

    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages,
        stream: true,
        venice_parameters: {
            include_venice_system_prompt: true,
            enable_web_search: 'auto',
            include_search_results_in_stream: true,
            enable_web_citations: true
        }
    };

    return veniceChatCompletion(request);
}

// 2b. Researcher Agent (Qwen)
export async function researchTopicStreamQwen(topic: string, plan: string[]) {
    const messages: VeniceMessage[] = [
        { role: 'system', content: 'You are a Research Assistant.' },
        {
            role: 'user',
            content: `Topic: "${topic}"
      Plan: ${plan.join('\n')}
      
      Perform deep research via web search. Focus on finding unique data points and diverse perspectives.`
        }
    ];

    const request: VeniceChatRequest = {
        model: 'qwen3-4b',
        messages,
        stream: true,
        venice_parameters: {
            include_venice_system_prompt: true,
            enable_web_search: 'auto',
            include_search_results_in_stream: true,
            enable_web_citations: true
        }
    };

    return veniceChatCompletion(request);
}

// 3. Writer Agent
export async function writeDraftStream(topic: string, plan: string[], researchData: string, previousContext?: string) {
    const messages: VeniceMessage[] = [
        { role: 'system', content: 'You are a Viral LinkedIn Ghostwriter and Savvy Journalist.' },
        {
            role: 'user',
            content: `Topic: "${topic}"
      Research: ${researchData}
      ${previousContext ? `\nPREVIOUS ITERATIONS & CRITIQUES (Learn from these):\n${previousContext}` : ''}
      
      Write a draft. High impact. Short sentences. One big idea. 
      Quality: Savvy journalist / Best social media writer.
      Constraint: Do NOT use em-dashes (—). Use hyphens or commas instead.`
        }
    ];

    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages,
        stream: true,
        venice_parameters: { include_venice_system_prompt: true }
    };

    return veniceChatCompletion(request);
}

// 4. Critic Agent (Tougher, strict JSON)
export async function critiqueDraft(draft: string) {
    const messages: VeniceMessage[] = [
        { role: 'system', content: 'You are a Brutal Senior Editor. You hate mediocrity. You demand viral excellence.' },
        {
            role: 'user',
            content: `Critique this draft. Be harsh.
      
      Draft:
      ${draft}
      
      Rate on 1-10 scale. 
      Return ONLY valid JSON (no markdown):
      {
        "scores": { "hook": number, "readability": number, "viralPotential": number },
        "critique": "short summary",
        "suggestions": ["specific fix 1", "specific fix 2"]
      }`
        }
    ];

    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages,
        stream: false,
        venice_parameters: { include_venice_system_prompt: false }
    };

    const response = await veniceChatCompletion(request);
    const text = await getFullResponseText(response);

    try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // Helper to find the first curly brace to start parsing
        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = cleanText.substring(jsonStart, jsonEnd + 1);
            return JSON.parse(jsonStr);
        }
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Critic JSON Parse Error:", text);
        return {
            scores: { hook: 0, readability: 0, viralPotential: 0 },
            critique: "Failed to parse critique.",
            suggestions: []
        };
    }
}

// 5. Finalizer Agent
export async function finalizePostStream(draft: string, suggestions: string[]) {
    const messages: VeniceMessage[] = [
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
      5. Ensure all links are formatted as clickable Markdown links [text](url).`
        }
    ];

    const request: VeniceChatRequest = {
        model: 'grok-41-fast',
        messages,
        stream: true,
        venice_parameters: { include_venice_system_prompt: true }
    };

    return veniceChatCompletion(request);
}

// 6. Visualizer Agent (Generates Image)

// Helper to generate the prompt first
async function generateImagePrompt(postContent: string) {
    const promptParams: VeniceChatRequest = {
        model: 'grok-41-fast', // Intelligent model for prompt engineering
        messages: [
            { role: 'system', content: 'You are an Expert Art Director specializing in Retro Futurism.' },
            {
                role: 'user', content: `Base on the following post content:
            "${postContent.substring(0, 1000)}..."
            
            Create a "Retro Futurism 1950s style" image prompt using this EXACT structure:
            
            **WORK SURFACE:** A retro-futuristic scene in 1950s style.
            **LAYOUT:** Optimistic, clean composition. Futuristic elements with 1950s design aesthetic.
            **COMPONENTS:** [Extract 3-4 key visual elements from the post and style them as retro-futuristic tech/scenery]
            **STYLE:** 1950s retro-futurism aesthetic. Atomic age optimism. Pastel colors (mint green, pink, sky blue).
            
            Constraint: Return ONLY the prompt text. Max 1500 characters.` }
        ],
        stream: false
    };

    const promptRes = await veniceChatCompletion(promptParams);
    return await getFullResponseText(promptRes);
}

export async function generateImage(postContent: string) {
    // Step 1: Generate specialized retro prompt
    let imagePrompt = await generateImagePrompt(postContent);

    // Enforce strict limit for Venice API
    if (imagePrompt.length > 1500) {
        imagePrompt = imagePrompt.substring(0, 1500);
    }

    // Remove markdown bolding if present to clean up prompt
    imagePrompt = imagePrompt.replace(/\*\*/g, '');

    // Step 2: Generate Image with Qwen
    const imageRequest = {
        model: 'qwen-image',
        prompt: imagePrompt,
        negative_prompt: "dark, gritty, dystopian, text, words, letters, signature, watermark, logo, caption, writing, typography, speech bubble, label, title, messy, cluttered, decay",
        width: 1024,
        height: 1024,
        hide_watermark: true,
        steps: 8,
        cfg_scale: 7
    };

    try {
        const result = await veniceImageGenerate(imageRequest, 45000);

        if (result.images && Array.isArray(result.images)) {
            return `data:image/png;base64,${result.images[0]}`;
        }
        if (result.data && Array.isArray(result.data) && result.data[0].url) {
            return result.data[0].url;
        }
        if (result.data && Array.isArray(result.data) && result.data[0].b64_json) {
            return `data:image/png;base64,${result.data[0].b64_json}`;
        }

        return null;
    } catch (e) {
        console.error("Image Gen Error:", e);
        return null;
    }
}
