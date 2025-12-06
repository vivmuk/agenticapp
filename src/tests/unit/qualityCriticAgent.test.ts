 import { QualityCriticAgent } from '../../agents/qualityCriticAgent';
import VeniceAPIClient from '../../services/veniceApiClient';
import { VeniceApiMock, createMockVeniceApiResponse } from '../mocks/veniceApiMock';
import { createTestWorkflowRun, createTestContentVersion } from '../utils/testUtils';

// Mock VeniceAPIClient
jest.mock('../../services/veniceApiClient');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('QualityCriticAgent', () => {
  let agent: QualityCriticAgent;
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

    agent = new QualityCriticAgent(mockVeniceClient);

    mockWorkflowState = createTestWorkflowRun();
  });

  describe('execute', () => {
    it('should evaluate content quality successfully', async () => {
      const mockContent = createTestContentVersion({
        definition: 'AI is transforming business operations through automation and intelligent decision-making systems.',
        linkedinPost: '🚀 AI is revolutionizing how businesses operate! From automating repetitive tasks to providing data-driven insights, artificial intelligence is becoming a game-changer for companies of all sizes. #AI #BusinessTransformation #Innovation',
        imagePrompt: 'Modern AI technology transforming business operations with digital automation and data visualization',
        keyClaims: [
          'AI automates repetitive business tasks',
          'AI provides data-driven insights',
          'AI is accessible to companies of all sizes'
        ]
      });

      const mockAccuracyCritique = {
        accuracyScore: 85,
        verifiedClaims: [
          {
            statement: 'AI automates repetitive business tasks',
            isVerified: true,
            confidence: 0.9,
            sources: [{ url: 'https://example.com/ai-automation', title: 'AI Automation Study', snippet: 'Evidence' }]
          }
        ],
        disputedClaims: [
          {
            statement: 'AI is accessible to companies of all sizes',
            isVerified: false,
            confidence: 0.3,
            sources: []
          }
        ],
        sources: [],
        recommendations: ['Review accessibility claims'],
        confidenceScore: 0.9
      };

      const mockQualityEvaluation = {
        overallScore: 82,
        coherenceScore: 85,
        engagementScore: 78,
        accuracyScore: 85,
        improvements: [
          {
            type: 'linkedinPost',
            severity: 'medium',
            description: 'LinkedIn post could be more engaging',
            suggestion: 'Add more specific examples and a call-to-action'
          }
        ],
        finalRecommendation: 'improve',
        reasoning: 'Content is good but needs minor improvements for better engagement'
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockQualityEvaluation);

      const input = {
        content: mockContent,
        accuracyCritique: mockAccuracyCritique,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result).toEqual(mockQualityEvaluation);
      expect(mockVeniceClient.generateWithSchema).toHaveBeenCalledWith(
        expect.stringContaining('AI is transforming business operations'),
        expect.any(Object),
        expect.stringContaining('professional content quality evaluator')
      );
    });

    it('should handle evaluation without accuracy critique', async () => {
      const mockContent = createTestContentVersion({
        definition: 'Test definition',
        linkedinPost: 'Test LinkedIn post',
        imagePrompt: 'Test image prompt',
        keyClaims: ['Test claim']
      });

      const mockQualityEvaluation = {
        overallScore: 75,
        coherenceScore: 80,
        engagementScore: 70,
        accuracyScore: 75,
        improvements: [
          {
            type: 'general',
            severity: 'low',
            description: 'Minor improvements needed',
            suggestion: 'Enhance content clarity'
          }
        ],
        finalRecommendation: 'improve',
        reasoning: 'Good content with room for improvement'
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockQualityEvaluation);

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.overallScore).toBe(75);
      expect(result.finalRecommendation).toBe('improve');
    });

    it('should use fallback evaluation when AI evaluation fails', async () => {
      const mockContent = createTestContentVersion({
        definition: 'Test definition',
        linkedinPost: 'Test LinkedIn post',
        imagePrompt: 'Test image prompt',
        keyClaims: ['Test claim']
      });

      const mockAccuracyCritique = {
        accuracyScore: 70,
        verifiedClaims: [],
        disputedClaims: [],
        sources: [],
        recommendations: [],
        confidenceScore: 0.7
      };

      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('AI evaluation failed'));

      const input = {
        content: mockContent,
        accuracyCritique: mockAccuracyCritique,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.overallScore).toBeCloseTo(71.7, 1); // (70 + 70 + 75) / 3
      expect(result.finalRecommendation).toBe('improve');
      expect(result.improvements).toHaveLength(3); // coherence, engagement, accuracy improvements
    });
  });

  describe('buildEvaluationPrompt', () => {
    it('should build comprehensive evaluation prompt', async () => {
      const mockContent = createTestContentVersion({
        definition: 'Test definition content',
        linkedinPost: 'Test LinkedIn post content',
        imagePrompt: 'Test image prompt content',
        keyClaims: ['Claim 1', 'Claim 2', 'Claim 3']
      });

      const mockAccuracyCritique = {
        accuracyScore: 85,
        verifiedClaims: [{ statement: 'Verified claim', isVerified: true, confidence: 0.9, sources: [] }],
        disputedClaims: [{ statement: 'Disputed claim', isVerified: false, confidence: 0.3, sources: [] }],
        sources: [],
        recommendations: ['Review disputed claims'],
        confidenceScore: 0.8
      };

      const mockQualityEvaluation = {
        overallScore: 80,
        coherenceScore: 85,
        engagementScore: 75,
        accuracyScore: 85,
        improvements: [],
        finalRecommendation: 'improve',
        reasoning: 'Good quality content'
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockQualityEvaluation);

      const input = {
        content: mockContent,
        accuracyCritique: mockAccuracyCritique,
        cycleNumber: 2
      };

      await agent.execute(input, mockWorkflowState);

      const promptCall = mockVeniceClient.generateWithSchema.mock.calls[0];
      const prompt = promptCall[0];

      expect(prompt).toContain('Test definition content');
      expect(prompt).toContain('Test LinkedIn post content');
      expect(prompt).toContain('Test image prompt content');
      expect(prompt).toContain('Claim 1; Claim 2; Claim 3');
      expect(prompt).toContain('ACCURACY ANALYSIS:');
      expect(prompt).toContain('Accuracy Score: 85');
      expect(prompt).toContain('Verified Claims: 1');
      expect(prompt).toContain('Disputed Claims: 1');
      expect(prompt).toContain('Cycle 2');
    });

    it('should handle missing accuracy critique in prompt', async () => {
      const mockContent = createTestContentVersion({
        definition: 'Test definition',
        linkedinPost: 'Test post',
        imagePrompt: 'Test prompt',
        keyClaims: ['Test claim']
      });

      const mockQualityEvaluation = {
        overallScore: 75,
        coherenceScore: 80,
        engagementScore: 70,
        accuracyScore: 75,
        improvements: [],
        finalRecommendation: 'improve',
        reasoning: 'Test reasoning'
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockQualityEvaluation);

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      await agent.execute(input, mockWorkflowState);

      const promptCall = mockVeniceClient.generateWithSchema.mock.calls[0];
      const prompt = promptCall[0];

      expect(prompt).toContain('Test definition');
      expect(prompt).not.toContain('ACCURACY ANALYSIS:');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include professional evaluator context', async () => {
      const mockContent = createTestContentVersion();
      const mockQualityEvaluation = {
        overallScore: 80,
        coherenceScore: 85,
        engagementScore: 75,
        accuracyScore: 80,
        improvements: [],
        finalRecommendation: 'accept',
        reasoning: 'High quality content'
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockQualityEvaluation);

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      await agent.execute(input, mockWorkflowState);

      const systemPromptCall = mockVeniceClient.generateWithSchema.mock.calls[0];
      const systemPrompt = systemPromptCall[2];

      expect(systemPrompt).toContain('professional content quality evaluator');
      expect(systemPrompt).toContain('LinkedIn business content');
      expect(systemPrompt).toContain('constructive feedback');
    });
  });

  describe('getFallbackEvaluation', () => {
    it('should generate appropriate fallback evaluation', async () => {
      const mockContent = createTestContentVersion();
      const mockAccuracyCritique = {
        accuracyScore: 60,
        verifiedClaims: [],
        disputedClaims: [],
        sources: [],
        recommendations: [],
        confidenceScore: 0.6
      };

      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('AI failed'));

      const input = {
        content: mockContent,
        accuracyCritique: mockAccuracyCritique,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.overallScore).toBeCloseTo(68.3, 1); // (60 + 70 + 75) / 3
      expect(result.finalRecommendation).toBe('improve');
      expect(result.reasoning).toContain('Fallback evaluation');
      expect(result.improvements.length).toBeGreaterThan(0);
    });

    it('should handle high accuracy in fallback', async () => {
      const mockContent = createTestContentVersion();
      const mockAccuracyCritique = {
        accuracyScore: 90,
        verifiedClaims: [],
        disputedClaims: [],
        sources: [],
        recommendations: [],
        confidenceScore: 0.9
      };

      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('AI failed'));

      const input = {
        content: mockContent,
        accuracyCritique: mockAccuracyCritique,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.overallScore).toBeCloseTo(78.3, 1); // (90 + 70 + 75) / 3
      expect(result.finalRecommendation).toBe('improve'); // Still improve due to other factors
    });

    it('should handle missing accuracy critique in fallback', async () => {
      const mockContent = createTestContentVersion();

      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('AI failed'));

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.accuracyScore).toBe(75); // Default accuracy score
      expect(result.overallScore).toBeCloseTo(71.7, 1); // (75 + 70 + 75) / 3
    });
  });

  describe('final recommendation logic', () => {
    it('should recommend accept for high scores', async () => {
      const mockContent = createTestContentVersion();
      const mockQualityEvaluation = {
        overallScore: 85,
        coherenceScore: 90,
        engagementScore: 85,
        accuracyScore: 80,
        improvements: [],
        finalRecommendation: 'accept',
        reasoning: 'Excellent content'
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockQualityEvaluation);

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.finalRecommendation).toBe('accept');
    });

    it('should recommend improve for medium scores', async () => {
      const mockContent = createTestContentVersion();
      const mockQualityEvaluation = {
        overallScore: 70,
        coherenceScore: 75,
        engagementScore: 65,
        accuracyScore: 70,
        improvements: [
          {
            type: 'general',
            severity: 'medium',
            description: 'Needs improvement',
            suggestion: 'Enhance content'
          }
        ],
        finalRecommendation: 'improve',
        reasoning: 'Good but can be improved'
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockQualityEvaluation);

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.finalRecommendation).toBe('improve');
    });

    it('should recommend reject for low scores', async () => {
      const mockContent = createTestContentVersion();
      const mockQualityEvaluation = {
        overallScore: 50,
        coherenceScore: 55,
        engagementScore: 45,
        accuracyScore: 50,
        improvements: [
          {
            type: 'general',
            severity: 'high',
            description: 'Poor quality',
            suggestion: 'Complete rewrite needed'
          }
        ],
        finalRecommendation: 'reject',
        reasoning: 'Content needs significant improvement'
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockQualityEvaluation);

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.finalRecommendation).toBe('reject');
    });
  });

  describe('error handling', () => {
    it('should handle schema validation errors', async () => {
      const mockContent = createTestContentVersion();

      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('Schema validation failed'));

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('finalRecommendation');
      expect(result.reasoning).toContain('Fallback evaluation');
    });

    it('should handle network errors gracefully', async () => {
      const mockContent = createTestContentVersion();

      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('Network error'));

      const input = {
        content: mockContent,
        accuracyCritique: null,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result).toBeDefined();
      expect(result.finalRecommendation).toMatch(/accept|improve|reject/);
    });
  });
}); 