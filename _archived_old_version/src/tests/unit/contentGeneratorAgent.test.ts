 import ContentGeneratorAgent from '../../agents/contentGeneratorAgent';
import VeniceAPIClient from '../../services/veniceApiClient';
import { VeniceApiMock, createMockVeniceApiResponse } from '../mocks/veniceApiMock';
import { createTestWorkflowRun } from '../utils/testUtils';

// Mock VeniceAPIClient
jest.mock('../../services/veniceApiClient');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('ContentGeneratorAgent', () => {
  let agent: ContentGeneratorAgent;
  let mockVeniceClient: jest.Mocked<VeniceAPIClient>;
  let mockWorkflowState: any;

  beforeEach(() => {
    jest.clearAllMocks();
    VeniceApiMock.clearMocks();

    // Create mock Venice client
    mockVeniceClient = new VeniceAPIClient({
      apiKey: 'test-key',
      baseURL: 'https://test.com',
      model: 'test-model'
    }) as jest.Mocked<VeniceAPIClient>;

    agent = new ContentGeneratorAgent(mockVeniceClient);

    mockWorkflowState = createTestWorkflowRun();
  });

  describe('execute', () => {
    it('should generate content successfully on first cycle', async () => {
      const mockStructuredResponse = {
        definition: 'Test definition about AI technology',
        linkedinPost: 'Test LinkedIn post about AI',
        imagePrompt: 'AI technology visualization',
        keyClaims: ['AI is transforming business', 'AI improves efficiency', 'AI requires careful implementation']
      };

      const mockImageResponse = {
        data: [{ url: 'https://example.com/image.png' }]
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockResolvedValue(mockImageResponse);

      const input = {
        topic: 'AI in business',
        cycleNumber: 1,
        maxCycles: 3
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result).toEqual({
        definition: mockStructuredResponse.definition,
        linkedinPost: mockStructuredResponse.linkedinPost,
        imagePrompt: mockStructuredResponse.imagePrompt,
        imageUrl: 'https://example.com/image.png',
        keyClaims: mockStructuredResponse.keyClaims,
        metadata: {
          cycleNumber: 1,
          generatedAt: expect.any(String),
          topic: 'AI in business'
        }
      });

      expect(mockVeniceClient.generateWithSchema).toHaveBeenCalledWith(
        expect.stringContaining('AI in business'),
        expect.any(Object),
        expect.stringContaining('professional content creator')
      );

      expect(mockVeniceClient.generateImage).toHaveBeenCalledWith({
        model: 'venice-sd35',
        prompt: mockStructuredResponse.imagePrompt,
        width: 512,
        height: 512,
        steps: 25
      });
    });

    it('should incorporate previous feedback in subsequent cycles', async () => {
      const mockStructuredResponse = {
        definition: 'Improved definition about AI technology',
        linkedinPost: 'Improved LinkedIn post about AI',
        imagePrompt: 'Improved AI technology visualization',
        keyClaims: ['AI transforms business operations', 'AI enhances productivity', 'AI needs strategic planning']
      };

      const mockImageResponse = {
        data: [{ url: 'https://example.com/improved-image.png' }]
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockResolvedValue(mockImageResponse);

      const input = {
        topic: 'AI in business',
        cycleNumber: 2,
        maxCycles: 3,
        previousFeedback: 'Add more specific examples and statistics',
        previousContent: {
          definition: 'Previous definition',
          linkedinPost: 'Previous post',
          imagePrompt: 'Previous prompt',
          keyClaims: ['Previous claim']
        }
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(mockVeniceClient.generateWithSchema).toHaveBeenCalledWith(
        expect.stringContaining('Previous feedback for improvement: Add more specific examples and statistics'),
        expect.any(Object),
        expect.any(String)
      );

      expect(result.metadata.cycleNumber).toBe(2);
    });

    it('should handle image generation failure gracefully', async () => {
      const mockStructuredResponse = {
        definition: 'Test definition',
        linkedinPost: 'Test LinkedIn post',
        imagePrompt: 'Test image prompt',
        keyClaims: ['Test claim']
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockRejectedValue(new Error('Image generation failed'));

      const input = {
        topic: 'Test topic',
        cycleNumber: 1,
        maxCycles: 3
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.imageUrl).toBe('https://via.placeholder.com/512x512/cccccc/666666?text=Image+Generation+Failed');
    });

    it('should handle API errors during content generation', async () => {
      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('API Error'));

      const input = {
        topic: 'Test topic',
        cycleNumber: 1,
        maxCycles: 3
      };

      await expect(agent.execute(input, mockWorkflowState)).rejects.toThrow('API Error');
    });

    it('should validate input structure', async () => {
      const input = {
        topic: '',
        cycleNumber: 1,
        maxCycles: 3
      };

      // Should still execute even with empty topic (validation is minimal)
      mockVeniceClient.generateWithSchema.mockResolvedValue({
        definition: 'Test',
        linkedinPost: 'Test',
        imagePrompt: 'Test',
        keyClaims: ['Test']
      });
      mockVeniceClient.generateImage.mockResolvedValue({ data: [{ url: 'test.png' }] });

      const result = await agent.execute(input, mockWorkflowState);
      expect(result).toBeDefined();
    });
  });

  describe('buildGenerationPrompt', () => {
    it('should build basic prompt for first cycle', async () => {
      const mockStructuredResponse = {
        definition: 'Test definition',
        linkedinPost: 'Test post',
        imagePrompt: 'Test prompt',
        keyClaims: ['Test claim']
      };
      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockResolvedValue({ data: [{ url: 'test.png' }] });

      const input = {
        topic: 'AI technology',
        cycleNumber: 1,
        maxCycles: 3
      };

      await agent.execute(input, mockWorkflowState);

      const promptCall = mockVeniceClient.generateWithSchema.mock.calls[0];
      const prompt = promptCall[0];

      expect(prompt).toContain('AI technology');
      expect(prompt).toContain('comprehensive definition');
      expect(prompt).toContain('LinkedIn post');
      expect(prompt).toContain('image prompt');
      expect(prompt).toContain('key claims');
    });

    it('should include previous feedback in prompt', async () => {
      const mockStructuredResponse = {
        definition: 'Test definition',
        linkedinPost: 'Test post',
        imagePrompt: 'Test prompt',
        keyClaims: ['Test claim']
      };
      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockResolvedValue({ data: [{ url: 'test.png' }] });

      const input = {
        topic: 'AI technology',
        cycleNumber: 2,
        maxCycles: 3,
        previousFeedback: 'Make it more engaging'
      };

      await agent.execute(input, mockWorkflowState);

      const promptCall = mockVeniceClient.generateWithSchema.mock.calls[0];
      const prompt = promptCall[0];

      expect(prompt).toContain('Previous feedback for improvement: Make it more engaging');
      expect(prompt).toContain('Please address this feedback');
    });

    it('should include previous content in prompt', async () => {
      const mockStructuredResponse = {
        definition: 'Test definition',
        linkedinPost: 'Test post',
        imagePrompt: 'Test prompt',
        keyClaims: ['Test claim']
      };
      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockResolvedValue({ data: [{ url: 'test.png' }] });

      const input = {
        topic: 'AI technology',
        cycleNumber: 2,
        maxCycles: 3,
        previousContent: {
          definition: 'Previous definition content',
          linkedinPost: 'Previous LinkedIn post content',
          imagePrompt: 'Previous image prompt',
          keyClaims: ['Previous claim']
        }
      };

      await agent.execute(input, mockWorkflowState);

      const promptCall = mockVeniceClient.generateWithSchema.mock.calls[0];
      const prompt = promptCall[0];

      expect(prompt).toContain('Previous content for reference:');
      expect(prompt).toContain('Previous definition content');
      expect(prompt).toContain('Previous LinkedIn post content');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include cycle information in system prompt', async () => {
      const mockStructuredResponse = {
        definition: 'Test definition',
        linkedinPost: 'Test post',
        imagePrompt: 'Test prompt',
        keyClaims: ['Test claim']
      };
      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockResolvedValue({ data: [{ url: 'test.png' }] });

      const input = {
        topic: 'Test topic',
        cycleNumber: 3,
        maxCycles: 3
      };

      await agent.execute(input, mockWorkflowState);

      const systemPromptCall = mockVeniceClient.generateWithSchema.mock.calls[0];
      const systemPrompt = systemPromptCall[2];

      expect(systemPrompt).toContain('Cycle 3 of 3');
      expect(systemPrompt).toContain('professional content creator');
      expect(systemPrompt).toContain('LinkedIn audience');
    });
  });

  describe('generateImage', () => {
    it('should call image generation with correct parameters', async () => {
      const mockStructuredResponse = {
        definition: 'Test definition',
        linkedinPost: 'Test post',
        imagePrompt: 'Modern AI technology visualization',
        keyClaims: ['Test claim']
      };
      const mockImageResponse = {
        data: [{ url: 'https://example.com/image.png' }]
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockResolvedValue(mockImageResponse);

      const input = {
        topic: 'Test topic',
        cycleNumber: 1,
        maxCycles: 3
      };

      await agent.execute(input, mockWorkflowState);

      expect(mockVeniceClient.generateImage).toHaveBeenCalledWith({
        model: 'venice-sd35',
        prompt: 'Modern AI technology visualization',
        width: 512,
        height: 512,
        steps: 25
      });
    });
  });

  describe('error handling', () => {
    it('should handle structured response parsing errors', async () => {
      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('Invalid response format'));

      const input = {
        topic: 'Test topic',
        cycleNumber: 1,
        maxCycles: 3
      };

      await expect(agent.execute(input, mockWorkflowState)).rejects.toThrow('Invalid response format');
    });

    it('should handle execution time measurement', async () => {
      const mockStructuredResponse = {
        definition: 'Test definition',
        linkedinPost: 'Test post',
        imagePrompt: 'Test prompt',
        keyClaims: ['Test claim']
      };
      const mockImageResponse = {
        data: [{ url: 'https://example.com/image.png' }]
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockStructuredResponse);
      mockVeniceClient.generateImage.mockResolvedValue(mockImageResponse);

      const input = {
        topic: 'Test topic',
        cycleNumber: 1,
        maxCycles: 3
      };

      const startTime = Date.now();
      await agent.execute(input, mockWorkflowState);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeGreaterThan(0);
    });
  });
}); 