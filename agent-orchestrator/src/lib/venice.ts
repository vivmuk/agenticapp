
// Custom Venice API Client based on Swagger spec (20251206.111732)
// Base URL: https://api.venice.ai/api/v1

const VENICE_API_KEY = process.env.VENICE_API_KEY;
const BASE_URL = 'https://api.venice.ai/api/v1';

export type VeniceRole = 'system' | 'user' | 'assistant' | 'tool';

export interface VeniceMessage {
    role: VeniceRole;
    content: string;
}

export interface VeniceParameters {
    include_venice_system_prompt?: boolean;
    enable_web_search?: 'auto' | 'off' | 'on';
    enable_web_citations?: boolean;
    include_search_results_in_stream?: boolean;
    strip_thinking_response?: boolean;
}

export interface VeniceChatRequest {
    model: string;
    messages: VeniceMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    venice_parameters?: VeniceParameters;
    response_format?: { type: 'json_object' | 'text' };
}

export interface VeniceImageRequest {
    model: string;
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    style_preset?: string;
    hide_watermark?: boolean;
    return_binary?: boolean;
}

export async function veniceChatCompletion(request: VeniceChatRequest) {
    if (!VENICE_API_KEY) {
        throw new Error('VENICE_API_KEY is not set');
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${VENICE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Venice API Error (Chat): ${response.status} - ${errorBody}`);
        throw new Error(`Venice API Error: ${response.status} ${response.statusText}`);
    }

    return response;
}

export async function veniceImageGenerate(request: VeniceImageRequest, timeoutMs: number = 60000) {
    if (!VENICE_API_KEY) {
        throw new Error('VENICE_API_KEY is not set');
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${BASE_URL}/image/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VENICE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
            signal: controller.signal
        });

        clearTimeout(id);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Venice API Error (Image): ${response.status} - ${errorBody}`);
            throw new Error(`Venice API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        clearTimeout(id);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Image Generation timed out after ${timeoutMs}ms`);
        }
        throw error;
    }
}
