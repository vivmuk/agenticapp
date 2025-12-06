 import WorkflowManager from '../../services/workflowManager';
import VeniceAPIClient from '../../services/veniceApiClient';
import { mockPrismaClient } from '../mocks/databaseMock';
import { createTestWorkflowRun, createTestContentVersion } from '../utils/testUtils';

// Mock dependencies
jest.mock('../../services/veniceApiClient');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-12345'
}));

describe('WorkflowManager', () => {
  let workflowManager: WorkflowManager;
  let mockVeniceClient: jest.Mocked<VeniceAPIClient>;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Venice client
    mockVeniceClient = new VeniceAPIClient({
      apiKey: 'test-key',
      baseURL: 'https://test.com',
      model: 'test-model'
    }) as jest.Mocked<VeniceAPIClient>;

    // Use mock Prisma client
    mockPrisma = mockPrismaClient;

    // Initialize database mock
    const { DatabaseMock } = require('../mocks/databaseMock');
    DatabaseMock.initialize();

    workflowManager = new WorkflowManager(mockVeniceClient, mockPrisma);
  });

  describe('startWorkflow', () => {
    it('should start a new workflow successfully', async () => {
      const mockContent = createTestContentVersion();
      const mockAccuracyCritique = { accuracyScore: 85, verifiedClaims: [], disputedClaims: [], sources: [], recommendations: [], confidenceScore: 0.85 };
      const mockQualityCritique = { overallScore: 90, coherenceScore: 85, engagementScore: 88, accuracyScore: 85, improvements: [], finalRecommendation: 'accept', reasoning: 'High quality content' };

      // Mock agent executions
      const mockContentGenerator = {
        execute: jest.fn().mockResolvedValue(mockContent)
      };
      const mockWebSearchCritic = {
        execute: jest.fn().mockResolvedValue(mockAccuracyCritique)
      };
      const mockQualityCritic = {
        execute: jest.fn().mockResolvedValue(mockQualityCritique)
      };

      // Replace agents with mocks
      (workflowManager as any).contentGenerator = mockContentGenerator;
      (workflowManager as any).webSearchCritic = mockWebSearchCritic;
      (workflowManager as any).qualityCritic = mockQualityCritic;

      const input = {
        topic: 'AI in business',
        maxCycles: 3,
        qualityThreshold: 7.0
      };

      const result = await workflowManager.startWorkflow(input);

      expect(result.id).toBe('test-uuid-12345');
      expect(result.topic).toBe('AI in business');
      expect(result.status).toBe('COMPLETED');
      expect(result.finalQualityScore).toBe(9.0); // 90/10
      expect(result.currentCycle).toBe(1);
      expect(mockContentGenerator.execute).toHaveBeenCalledTimes(1);
      expect(mockWebSearchCritic.execute).toHaveBeenCalledTimes(1);
      expect(mockQualityCritic.execute).toHaveBeenCalledTimes(1);
    });

    it('should trigger human review when quality threshold not met', async () => {
      const mockContent = createTestContentVersion();
      const mockAccuracyCritique = { accuracyScore: 60, verifiedClaims: [], disputedClaims: [], sources: [], recommendations: [], confidenceScore: 0.6 };
      const mockQualityCritique = { overallScore: 55, coherenceScore: 60, engagementScore: 50, accuracyScore: 55, improvements: [], finalRecommendation: 'improve', reasoning: 'Low quality content' };

      const mockContentGenerator = {
        execute: jest.fn().mockResolvedValue(mockContent)
      };
      const mockWebSearchCritic = {
        execute: jest.fn().mockResolvedValue(mockAccuracyCritique)
      };
      const mockQualityCritic = {
        execute: jest.fn().mockResolvedValue(mockQualityCritique)
      };

      (workflowManager as any).contentGenerator = mockContentGenerator;
      (workflowManager as any).webSearchCritic = mockWebSearchCritic;
      (workflowManager as any).qualityCritic = mockQualityCritic;

      const input = {
        topic: 'AI in business',
        maxCycles: 1, // Force human review after 1 cycle
        qualityThreshold: 8.0
      };

      const result = await workflowManager.startWorkflow(input);

      expect(result.status).toBe('HUMAN_REVIEW');
      expect(result.humanReviewRequired).toBe(true);
      expect(result.finalQualityScore).toBe(5.5); // 55/10
    });

    it('should handle workflow errors gracefully', async () => {
      const mockContentGenerator = {
        execute: jest.fn().mockRejectedValue(new Error('Content generation failed'))
      };

      (workflowManager as any).contentGenerator = mockContentGenerator;

      const input = {
        topic: 'AI in business',
        maxCycles: 3,
        qualityThreshold: 7.0
      };

      await expect(workflowManager.startWorkflow(input)).rejects.toThrow('Content generation failed');
    });
  });

  describe('executeWorkflowCycle', () => {
    it('should execute a complete workflow cycle', async () => {
      const mockContent = createTestContentVersion();
      const mockAccuracyCritique = { accuracyScore: 80, verifiedClaims: [], disputedClaims: [], sources: [], recommendations: [], confidenceScore: 0.8 };
      const mockQualityCritique = { overallScore: 85, coherenceScore: 80, engagementScore: 85, accuracyScore: 85, improvements: [], finalRecommendation: 'accept', reasoning: 'Good quality' };

      const mockContentGenerator = {
        execute: jest.fn().mockResolvedValue(mockContent)
      };
      const mockWebSearchCritic = {
        execute: jest.fn().mockResolvedValue(mockAccuracyCritique)
      };
      const mockQualityCritic = {
        execute: jest.fn().mockResolvedValue(mockQualityCritique)
      };

      (workflowManager as any).contentGenerator = mockContentGenerator;
      (workflowManager as any).webSearchCritic = mockWebSearchCritic;
      (workflowManager as any).qualityCritic = mockQualityCritic;

      const workflowState = createTestWorkflowRun({
        id: 'test-workflow-id',
        topic: 'AI in business',
        currentCycle: 1,
        maxCycles: 3,
        qualityThreshold: 7.0
      });

      const result = await workflowManager.executeWorkflowCycle(workflowState);

      expect(result.status).toBe('COMPLETED');
      expect(result.finalQualityScore).toBe(8.5); // 85/10
      expect(mockContentGenerator.execute).toHaveBeenCalledWith(
        { topic: 'AI in business', cycleNumber: 1, previousFeedback: undefined, previousContent: undefined },
        expect.any(Object)
      );
    });

    it('should continue to next cycle when quality not sufficient', async () => {
      const mockContent1 = createTestContentVersion({ definition: 'First version' });
      const mockContent2 = createTestContentVersion({ definition: 'Second version' });
      const mockAccuracyCritique = { accuracyScore: 70, verifiedClaims: [], disputedClaims: [], sources: [], recommendations: [], confidenceScore: 0.7 };
      const mockQualityCritique = { overallScore: 65, coherenceScore: 70, engagementScore: 60, accuracyScore: 65, improvements: [{ type: 'general', severity: 'medium', description: 'Needs improvement', suggestion: 'Enhance content' }], finalRecommendation: 'improve', reasoning: 'Needs improvement' };
      const mockQualityCritique2 = { overallScore: 85, coherenceScore: 85, engagementScore: 85, accuracyScore: 85, improvements: [], finalRecommendation: 'accept', reasoning: 'High quality' };

      const mockContentGenerator = {
        execute: jest.fn()
          .mockResolvedValueOnce(mockContent1)
          .mockResolvedValueOnce(mockContent2)
      };
      const mockWebSearchCritic = {
        execute: jest.fn().mockResolvedValue(mockAccuracyCritique)
      };
      const mockQualityCritic = {
        execute: jest.fn()
          .mockResolvedValueOnce(mockQualityCritique)
          .mockResolvedValueOnce(mockQualityCritique2)
      };

      (workflowManager as any).contentGenerator = mockContentGenerator;
      (workflowManager as any).webSearchCritic = mockWebSearchCritic;
      (workflowManager as any).qualityCritic = mockQualityCritic;

      const workflowState = createTestWorkflowRun({
        id: 'test-workflow-id',
        topic: 'AI in business',
        currentCycle: 1,
        maxCycles: 3,
        qualityThreshold: 8.0
      });

      const result = await workflowManager.executeWorkflowCycle(workflowState);

      expect(result.status).toBe('COMPLETED');
      expect(result.currentCycle).toBe(2);
      expect(result.finalQualityScore).toBe(8.5); // Second cycle meets threshold
      expect(mockContentGenerator.execute).toHaveBeenCalledTimes(2);
    });

    it('should trigger human review after max cycles', async () => {
      const mockContent = createTestContentVersion();
      const mockAccuracyCritique = { accuracyScore: 60, verifiedClaims: [], disputedClaims: [], sources: [], recommendations: [], confidenceScore: 0.6 };
      const mockQualityCritique = { overallScore: 55, coherenceScore: 60, engagementScore: 50, accuracyScore: 55, improvements: [], finalRecommendation: 'improve', reasoning: 'Low quality' };

      const mockContentGenerator = {
        execute: jest.fn().mockResolvedValue(mockContent)
      };
      const mockWebSearchCritic = {
        execute: jest.fn().mockResolvedValue(mockAccuracyCritique)
      };
      const mockQualityCritic = {
        execute: jest.fn().mockResolvedValue(mockQualityCritique)
      };

      (workflowManager as any).contentGenerator = mockContentGenerator;
      (workflowManager as any).webSearchCritic = mockWebSearchCritic;
      (workflowManager as any).qualityCritic = mockQualityCritic;

      const workflowState = createTestWorkflowRun({
        id: 'test-workflow-id',
        topic: 'AI in business',
        currentCycle: 3, // At max cycles
        maxCycles: 3,
        qualityThreshold: 8.0
      });

      const result = await workflowManager.executeWorkflowCycle(workflowState);

      expect(result.status).toBe('HUMAN_REVIEW');
      expect(result.humanReviewRequired).toBe(true);
      expect(result.finalQualityScore).toBe(5.5);
    });
  });

  describe('submitHumanReview', () => {
    it('should accept human review and complete workflow', async () => {
      const workflowState = createTestWorkflowRun({
        id: 'test-workflow-id',
        status: 'HUMAN_REVIEW',
        humanReviewRequired: true,
        humanReviewProvided: false
      });

      mockPrisma.workflowRun.findUnique.mockResolvedValue({
        id: 'test-workflow-id',
        status: 'HUMAN_REVIEW'
      });

      const review = {
        action: 'accept',
        feedback: 'Content looks good',
        reviewerName: 'Test Reviewer'
      };

      const result = await workflowManager.submitHumanReview('test-workflow-id', review);

      expect(result.status).toBe('COMPLETED');
      expect(result.humanReviewProvided).toBe(true);
      expect(result.humanReviewFeedback).toBe('Content looks good');
    });

    it('should improve content and continue workflow', async () => {
      const mockContent = createTestContentVersion();
      const mockAccuracyCritique = { accuracyScore: 80, verifiedClaims: [], disputedClaims: [], sources: [], recommendations: [], confidenceScore: 0.8 };
      const mockQualityCritique = { overallScore: 85, coherenceScore: 80, engagementScore: 85, accuracyScore: 85, improvements: [], finalRecommendation: 'accept', reasoning: 'High quality' };

      const mockContentGenerator = {
        execute: jest.fn().mockResolvedValue(mockContent)
      };
      const mockWebSearchCritic = {
        execute: jest.fn().mockResolvedValue(mockAccuracyCritique)
      };
      const mockQualityCritic = {
        execute: jest.fn().mockResolvedValue(mockQualityCritique)
      };

      (workflowManager as any).contentGenerator = mockContentGenerator;
      (workflowManager as any).webSearchCritic = mockWebSearchCritic;
      (workflowManager as any).qualityCritic = mockQualityCritic;

      const workflowState = createTestWorkflowRun({
        id: 'test-workflow-id',
        status: 'HUMAN_REVIEW',
        currentCycle: 2,
        maxCycles: 3,
        currentContent: createTestContentVersion()
      });

      mockPrisma.workflowRun.findUnique.mockResolvedValue({
        id: 'test-workflow-id',
        status: 'HUMAN_REVIEW',
        currentCycle: 2,
        maxCycles: 3
      });

      const review = {
        action: 'improve',
        feedback: 'Add more specific examples',
        customEdits: {
          definition: 'Improved definition with examples',
          linkedinPost: 'Improved LinkedIn post'
        },
        reviewerName: 'Test Reviewer'
      };

      const result = await workflowManager.submitHumanReview('test-workflow-id', review);

      expect(result.status).toBe('COMPLETED');
      expect(result.currentCycle).toBe(3);
      expect(result.humanReviewProvided).toBe(true);
      expect(mockContentGenerator.execute).toHaveBeenCalledTimes(1);
    });

    it('should reject and complete workflow', async () => {
      const workflowState = createTestWorkflowRun({
        id: 'test-workflow-id',
        status: 'HUMAN_REVIEW',
        humanReviewRequired: true
      });

      mockPrisma.workflowRun.findUnique.mockResolvedValue({
        id: 'test-workflow-id',
        status: 'HUMAN_REVIEW'
      });

      const review = {
        action: 'reject',
        feedback: 'Content not suitable',
        reviewerName: 'Test Reviewer'
      };

      const result = await workflowManager.submitHumanReview('test-workflow-id', review);

      expect(result.status).toBe('COMPLETED');
      expect(result.humanReviewProvided).toBe(true);
      expect(result.humanReviewFeedback).toBe('Content not suitable');
    });

    it('should handle workflow not found', async () => {
      mockPrisma.workflowRun.findUnique.mockResolvedValue(null);

      const review = {
        action: 'accept',
        feedback: 'Good content'
      };

      await expect(workflowManager.submitHumanReview('non-existent-id', review))
        .rejects.toThrow('Workflow non-existent-id not found');
    });

    it('should handle invalid workflow status', async () => {
      mockPrisma.workflowRun.findUnique.mockResolvedValue({
        id: 'test-workflow-id',
        status: 'RUNNING'
      });

      const review = {
        action: 'accept',
        feedback: 'Good content'
      };

      await expect(workflowManager.submitHumanReview('test-workflow-id', review))
        .rejects.toThrow('Workflow test-workflow-id is not in human review status');
    });
  });

  describe('getWorkflowState', () => {
    it('should retrieve workflow state successfully', async () => {
      const mockDbWorkflow = {
        id: 'test-workflow-id',
        topic: 'AI in business',
        status: 'COMPLETED',
        currentCycle: 2,
        maxCycles: 3,
        qualityThreshold: 7.0,
        finalQualityScore: 8.5,
        humanReviewRequired: false,
        humanReviewProvided: false,
        humanReviewFeedback: null,
        startedAt: new Date(),
        completedAt: new Date(),
        contentVersions: [
          {
            content: createTestContentVersion()
          }
        ],
        agentResponses: []
      };

      mockPrisma.workflowRun.findUnique.mockResolvedValue(mockDbWorkflow);

      const result = await workflowManager.getWorkflowState('test-workflow-id');

      expect(result).toEqual({
        id: 'test-workflow-id',
        topic: 'AI in business',
        status: 'COMPLETED',
        currentCycle: 2,
        maxCycles: 3,
        qualityThreshold: 7.0,
        finalQualityScore: 8.5,
        humanReviewRequired: false,
        humanReviewProvided: false,
        humanReviewFeedback: null,
        currentContent: expect.any(Object),
        agentStatus: {},
        startedAt: expect.any(Date),
        completedAt: expect.any(Date)
      });
    });

    it('should return null for non-existent workflow', async () => {
      mockPrisma.workflowRun.findUnique.mockResolvedValue(null);

      const result = await workflowManager.getWorkflowState('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('generateFeedbackForNextCycle', () => {
    it('should generate appropriate feedback for next cycle', async () => {
      const qualityCritique = {
        overallScore: 65,
        coherenceScore: 70,
        engagementScore: 60,
        accuracyScore: 65,
        improvements: [
          {
            type: 'general',
            severity: 'high',
            description: 'Content lacks clarity',
            suggestion: 'Improve sentence structure and flow'
          },
          {
            type: 'linkedinPost',
            severity: 'medium',
            description: 'Post not engaging enough',
            suggestion: 'Add hooks and questions'
          },
          {
            type: 'general',
            severity: 'low',
            description: 'Minor grammar issues',
            suggestion: 'Proofread carefully'
          }
        ],
        finalRecommendation: 'improve',
        reasoning: 'Content needs improvement'
      };

      const workflowManagerAny = workflowManager as any;
      const feedback = workflowManagerAny.generateFeedbackForNextCycle(qualityCritique);

      expect(feedback).toContain('Quality score: 65/100');
      expect(feedback).toContain('High priority issues: Content lacks clarity');
      expect(feedback).toContain('Medium priority issues: Post not engaging enough');
      expect(feedback).toContain('Focus on: Improve sentence structure and flow, Add hooks and questions, Proofread carefully');
    });

    it('should handle improvements with no high priority issues', async () => {
      const qualityCritique = {
        overallScore: 75,
        coherenceScore: 80,
        engagementScore: 70,
        accuracyScore: 75,
        improvements: [
          {
            type: 'linkedinPost',
            severity: 'medium',
            description: 'Post could be better',
            suggestion: 'Add more engagement'
          }
        ],
        finalRecommendation: 'improve',
        reasoning: 'Good but can improve'
      };

      const workflowManagerAny = workflowManager as any;
      const feedback = workflowManagerAny.generateFeedbackForNextCycle(qualityCritique);

      expect(feedback).toContain('Quality score: 75/100');
      expect(feedback).not.toContain('High priority issues:');
      expect(feedback).toContain('Medium priority issues: Post could be better');
    });
  });
}); 