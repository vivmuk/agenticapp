import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { z } from 'zod';
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
  response_format?: { type: 'json_object' };
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
  model: string;
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
}

export interface VeniceImageResponse {
  id: string;
  object: string;
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
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
      timeout: 60000,
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

    const request: VeniceChatRequest = {
      model: this.config.model,
      messages,
      response_format: { type: 'json_object' },
      tools,
    };

    const response = await this.generateChatCompletion(request);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from Venice API');
    }

    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      logger.error('Failed to parse or validate structured response', {
        content,
        error: (error as Error).message,
      });
      throw new Error(`Invalid structured response: ${(error as Error).message}`);
    }
  }

  async generateImage(request: VeniceImageRequest): Promise<VeniceImageResponse> {
    logger.info('Generating image', { model: request.model, prompt: request.prompt.substring(0, 100) });
    try {
      const response = await this.retryRequest<VeniceImageResponse>(() =>
        this.client.post('/images/generations', {
          ...request,
          model: request.model || 'venice-sd35',
        })
      );
      logger.info('Image generated successfully', { id: response.id, imageCount: response.data.length });
      return response;
    } catch (error) {
      logger.error('Failed to generate image', { error: (error as Error).message });
      throw error;
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

      const parsed = JSON.parse(content);
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
}

export default VeniceAPIClient;