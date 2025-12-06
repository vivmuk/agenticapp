import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import logger from '../utils/logger';

export interface VeniceAPIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  temperature?: number;
  topP?: number;
}

export interface VeniceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface VeniceFunctionCall {
  name: string;
  arguments: string;
}

export interface VeniceTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface VeniceChatRequest {
  model: string;
  messages: VeniceMessage[];
  temperature?: number;
  top_p?: number;
  tools?: VeniceTool[];
  tool_choice?: 'auto' | 'required';
  response_format?: {
    type: 'json_object';
  } | {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, any>;
    };
  };
  // Venice-specific web search parameters
  venice_parameters?: {
    enable_web_search?: 'on' | 'off' | 'auto';
    enable_web_citations?: boolean;
    include_venice_system_prompt?: boolean;
  };
}

export interface VeniceChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: VeniceFunctionCall;
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface VeniceImageRequest {
  model?: string;
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  negative_prompt?: string;
  style_preset?: string;
  safe_mode?: boolean;
  hide_watermark?: boolean;
}

export interface VeniceImageResponse {
  images: Array<{
    b64_json?: string;
    url?: string;
  }>;
  id?: string;
  request_id?: string;
}

export class VeniceAPIClient {
  private client: AxiosInstance;
  private config: VeniceAPIConfig;

  constructor(config: VeniceAPIConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes for longer operations
    });
  }

  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await requestFn();
        return response.data;
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) {
          throw lastError;
        }
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        logger.warn(`Venice API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`, {
          error: lastError.message,
          attempt: attempt + 1,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError!;
  }

  async generateChatCompletion(request: VeniceChatRequest): Promise<VeniceChatResponse> {
    logger.info('Generating chat completion', { model: request.model, messageCount: request.messages.length });
    try {
      const response = await this.retryRequest<VeniceChatResponse>(() =>
        this.client.post('/chat/completions', {
          ...request,
          model: request.model || this.config.model,
          temperature: request.temperature ?? this.config.temperature,
          top_p: request.top_p ?? this.config.topP,
        })
      );
      logger.info('Chat completion generated successfully', {
        id: response.id,
        tokensUsed: response.usage.total_tokens,
        finishReason: response.choices[0]?.finish_reason,
      });
      return response;
    } catch (error) {
      logger.error('Failed to generate chat completion', { error: (error as Error).message });
      throw error;
    }
  }

  async generateWithSchema<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt?: string,
    tools?: VeniceTool[]
  ): Promise<T> {
    const messages: VeniceMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // Convert Zod schema to JSON Schema format for Venice API
    // Extract to variable to help TypeScript with type inference
    const schemaForConversion: z.ZodTypeAny = schema;
    const toJsonSchema = zodToJsonSchema as unknown as (schema: z.ZodTypeAny, options?: any) => Record<string, any>;
    const jsonSchema = toJsonSchema(schemaForConversion, {
      $refStrategy: 'none',
      target: 'openApi3'
    });

    // Ensure additionalProperties is false at all levels (Venice requirement)
    const veniceSchema = this.ensureAdditionalPropertiesFalse(jsonSchema);

    const request: VeniceChatRequest = {
      model: this.config.model,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'structured_response',
          strict: true,
          schema: veniceSchema as Record<string, any>,
        },
      },
      tools,
    };

    logger.debug('Sending structured request', {
      model: this.config.model,
      schemaProperties: Object.keys((veniceSchema as any).properties || {})
    });

    const response = await this.generateChatCompletion(request);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from Venice API');
    }

    try {
      const parsed = this.parseJsonContent(content);
      return schema.parse(parsed);
    } catch (error) {
      logger.error('Failed to parse or validate structured response', {
        content: content.substring(0, 500),
        error: (error as Error).message,
      });
      throw new Error(`Invalid structured response: ${(error as Error).message}`);
    }
  }

  private ensureAdditionalPropertiesFalse(schema: any): any {
    if (typeof schema !== 'object' || schema === null) {
      return schema;
    }

    const result = { ...schema };

    // Remove $schema as Venice doesn't need it
    delete result.$schema;

    if (result.type === 'object') {
      result.additionalProperties = false;
    }

    if (result.properties) {
      result.properties = Object.fromEntries(
        Object.entries(result.properties).map(([key, value]) => [
          key,
          this.ensureAdditionalPropertiesFalse(value),
        ])
      );
    }

    if (result.items) {
      result.items = this.ensureAdditionalPropertiesFalse(result.items);
    }

    return result;
  }

  async generateImage(request: VeniceImageRequest): Promise<VeniceImageResponse> {
    logger.info('Generating image', { model: request.model, prompt: request.prompt.substring(0, 100) });
    try {
      // Use Venice's /image/generate endpoint with correct format
      const imageModel = request.model || 'z-image-turbo';
      const response = await this.retryRequest<VeniceImageResponse>(
        () => this.client.post('/image/generate', {
          model: imageModel,
          prompt: request.prompt,
          width: request.width || 1024,
          height: request.height || 1024,
          steps: request.steps || 20,
          cfg_scale: request.cfg_scale || 7.5,
          safe_mode: request.safe_mode ?? true,
          hide_watermark: request.hide_watermark ?? false,
        }),
        2, // Fewer retries for image generation
        3000 // Longer base delay
      );
      logger.info('Image generated successfully', {
        id: response.id || response.request_id,
        imageCount: response.images?.length || 0,
      });
      return response;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || 'Unknown error';
      const statusCode = error?.response?.status;
      logger.error('Failed to generate image', {
        error: errorMessage,
        statusCode,
        model: request.model,
        responseData: error?.response?.data,
      });
      throw new Error(`Image generation failed: ${errorMessage}`);
    }
  }

  async performWebSearch(query: string): Promise<any> {
    logger.info('Performing web search', { query: query.substring(0, 100) });

    const searchSchema = z.object({
      results: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      })),
      totalResults: z.number(),
    });

    const systemPrompt = `You are a web search assistant. Search for information related to the user's query using web search.
Analyze the search results and provide a structured JSON response with the following format:
{
  "results": [
    {"title": "...", "url": "...", "snippet": "..."},
    ...
  ],
  "totalResults": <number>
}
Include the most relevant search results with accurate titles, URLs, and snippets.`;

    try {
      const messages: VeniceMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Search the web for: ${query}` },
      ];

      // Use Venice's native web search capability
      const request: VeniceChatRequest = {
        model: this.config.model,
        messages,
        response_format: { type: 'json_object' },
        venice_parameters: {
          enable_web_search: 'on',
          enable_web_citations: true,
        },
      };

      const response = await this.generateChatCompletion(request);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from web search');
      }

      const parsed = this.parseJsonContent(content);
      const validated = searchSchema.parse(parsed);

      logger.info('Web search completed successfully', { resultCount: validated.results.length });
      return validated;
    } catch (error) {
      logger.error('Failed to perform web search', { error: (error as Error).message });
      throw error;
    }
  }

  async listModels(): Promise<any> {
    try {
      const response = await this.retryRequest<any>(() => this.client.get('/models'));
      return response;
    } catch (error) {
      logger.error('Failed to list models', { error: (error as Error).message });
      throw error;
    }
  }

  private parseJsonContent(content: string): unknown {
    const trimmed = content.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

    try {
      return JSON.parse(candidate);
    } catch (primaryError) {
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const slice = candidate.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(slice);
        } catch {
          // fall through to throw below
        }
      }

      throw primaryError;
    }
  }
}

export default VeniceAPIClient;
