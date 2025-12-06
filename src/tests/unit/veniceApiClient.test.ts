 import VeniceAPIClient from '../../services/veniceApiClient';
import { VeniceApiMock, createMockVeniceApiResponse, createMockVeniceApiError } from '../mocks/veniceApiMock';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('VeniceAPIClient', () => {
  let client: VeniceAPIClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    VeniceApiMock.clearMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn()
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create client instance
    client = new VeniceAPIClient({
      apiKey: 'test-api-key',
      baseURL: 'https://api.venice.ai/api/v1',
      model: 'llama-3.2-3b',
      temperature: 0.7,
      topP: 0.9
    });
  });

  describe('Constructor', () => {
    it('should create client with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.venice.ai/api/v1',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });
    });

    it('should use default values for optional config', () => {
      const clientWithDefaults = new VeniceAPIClient({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model'
      });

      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateChatCompletion', () => {
    it('should generate chat completion successfully', async () => {
      const mockResponse = createMockVeniceApiResponse('Test response');
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const request = {
        model: 'llama-3.2-3b',
        messages: [
          { role: 'user' as const, content: 'Test prompt' }
        ]
      };

      const result = await client.generateChatCompletion(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        ...request,
        model: 'llama-3.2-3b',
        temperature: 0.7,
        top_p: 0.9
      });
      expect(result).toEqual(mockResponse);
    });

    it('should use request-specific temperature and top_p', async () => {
      const mockResponse = createMockVeniceApiResponse('Test response');
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const request = {
        model: 'llama-3.2-3b',
        messages: [{ role: 'user' as const, content: 'Test prompt' }],
        temperature: 0.5,
        top_p: 0.8
      };

      await client.generateChatCompletion(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        ...request,
        model: 'llama-3.2-3b',
        temperature: 0.5,
        top_p: 0.8
      });
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockAxiosInstance.post.mockRejectedValue(error);

      const request = {
        model: 'llama-3.2-3b',
        messages: [{ role: 'user' as const, content: 'Test prompt' }]
      };

      await expect(client.generateChatCompletion(request)).rejects.toThrow('API Error');
    });
  });

  describe('generateWithSchema', () => {
    it('should generate and validate structured response', async () => {
      const mockResponse = createMockVeniceApiResponse(JSON.stringify({
        name: 'Test Result',
        value: 42
      }));
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const schema = {
        parse: jest.fn().mockReturnValue({ name: 'Test Result', value: 42 })
      };

      const result = await client.generateWithSchema(
        'Test prompt',
        schema as any,
        'System prompt'
      );

      expect(result).toEqual({ name: 'Test Result', value: 42 });
      expect(schema.parse).toHaveBeenCalledWith({ name: 'Test Result', value: 42 });
    });

    it('should throw error when no content received', async () => {
      const mockResponse = {
        choices: [{ message: { content: null } }]
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      await expect(client.generateWithSchema('Test', {} as any))
        .rejects.toThrow('No content received from Venice API');
    });

    it('should throw error when JSON parsing fails', async () => {
      const mockResponse = createMockVeniceApiResponse('Invalid JSON');
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      await expect(client.generateWithSchema('Test', {} as any))
        .rejects.toThrow('Invalid structured response');
    });

    it('should throw error when schema validation fails', async () => {
      const mockResponse = createMockVeniceApiResponse(JSON.stringify({ invalid: 'data' }));
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const schema = {
        parse: jest.fn().mockImplementation(() => {
          throw new Error('Validation failed');
        })
      };

      await expect(client.generateWithSchema('Test', schema as any))
        .rejects.toThrow('Invalid structured response: Validation failed');
    });
  });

  describe('generateImage', () => {
    it('should generate image successfully', async () => {
      const mockResponse = {
        id: 'img-123',
        object: 'image',
        created: Date.now(),
        data: [{ url: 'https://example.com/image.png' }]
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const request = {
        model: 'venice-sd35',
        prompt: 'A beautiful landscape'
      };

      const result = await client.generateImage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/images/generations', {
        ...request,
        model: 'venice-sd35'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should use default model when not specified', async () => {
      const mockResponse = {
        id: 'img-123',
        object: 'image',
        created: Date.now(),
        data: [{ url: 'https://example.com/image.png' }]
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const request = {
        prompt: 'A beautiful landscape'
      };

      await client.generateImage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/images/generations', {
        ...request,
        model: 'venice-sd35'
      });
    });
  });

  describe('performWebSearch', () => {
    it('should perform web search successfully', async () => {
      const mockResponse = createMockVeniceApiResponse(JSON.stringify({
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            snippet: 'Test snippet'
          }
        ],
        totalResults: 1
      }));
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.performWebSearch('test query');

      expect(result).toEqual({
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            snippet: 'Test snippet'
          }
        ],
        totalResults: 1
      });
    });

    it('should handle web search errors', async () => {
      const error = new Error('Search failed');
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.performWebSearch('test query')).rejects.toThrow('Search failed');
    });
  });

  describe('listModels', () => {
    it('should list models successfully', async () => {
      const mockResponse = {
        data: [
          { id: 'llama-3.2-3b', object: 'model' },
          { id: 'venice-sd35', object: 'model' }
        ]
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await client.listModels();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/models');
      expect(result).toEqual(mockResponse);
    });

    it('should handle list models errors', async () => {
      const error = new Error('Failed to list models');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.listModels()).rejects.toThrow('Failed to list models');
    });
  });

  describe('retryRequest', () => {
    it('should retry on failure and succeed', async () => {
      let attemptCount = 0;
      mockAxiosInstance.post.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ data: createMockVeniceApiResponse('Success') });
      });

      const request = {
        model: 'llama-3.2-3b',
        messages: [{ role: 'user' as const, content: 'Test' }]
      };

      const result = await client.generateChatCompletion(request);

      expect(result).toEqual(createMockVeniceApiResponse('Success'));
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    it('should exhaust retries and throw error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Persistent failure'));

      const request = {
        model: 'llama-3.2-3b',
        messages: [{ role: 'user' as const, content: 'Test' }]
      };

      await expect(client.generateChatCompletion(request)).rejects.toThrow('Persistent failure');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should respect exponential backoff', async () => {
      const startTime = Date.now();
      let attemptCount = 0;
      
      mockAxiosInstance.post.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ data: createMockVeniceApiResponse('Success') });
      });

      const request = {
        model: 'llama-3.2-3b',
        messages: [{ role: 'user' as const, content: 'Test' }]
      };

      await client.generateChatCompletion(request);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThan(1000); // Should have waited for retry
    });
  });
}); 