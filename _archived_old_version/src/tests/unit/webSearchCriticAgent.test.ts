 import { WebSearchCriticAgent } from '../../agents/webSearchCriticAgent';
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

describe('WebSearchCriticAgent', () => {
  let agent: WebSearchCriticAgent;
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

    agent = new WebSearchCriticAgent(mockVeniceClient);

    mockWorkflowState = createTestWorkflowRun();
  });

  describe('execute', () => {
    it('should perform fact-checking successfully', async () => {
      const mockContent = createTestContentVersion({
        definition: 'Test definition',
        linkedinPost: 'Test LinkedIn post',
        imagePrompt: 'Test image prompt',
        keyClaims: [
          'AI transforms business operations',
          'Machine learning improves efficiency',
          'Automation reduces costs'
        ]
      });

      const mockSearchResults = {
        results: [
          {
            title: 'AI Business Transformation Study',
            url: 'https://example.com/ai-study',
            snippet: 'Research shows AI significantly transforms business operations'
          },
          {
            title: 'Machine Learning Efficiency Report',
            url: 'https://example.com/ml-report',
            snippet: 'Machine learning implementations improve operational efficiency by 40%'
          }
        ],
        totalResults: 2
      };

      const mockClaimAnalysis = {
        isVerified: true,
        confidence: 0.9,
        evidence: 'Multiple sources confirm this claim',
        sources: [
          {
            url: 'https://example.com/source1',
            title: 'Supporting source',
            snippet: 'Evidence supporting the claim'
          }
        ]
      };

      mockVeniceClient.performWebSearch.mockResolvedValue(mockSearchResults);
      mockVeniceClient.generateWithSchema.mockResolvedValue(mockClaimAnalysis);

      const input = {
        content: mockContent,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result).toHaveProperty('accuracyScore');
      expect(result).toHaveProperty('verifiedClaims');
      expect(result).toHaveProperty('disputedClaims');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('confidenceScore');

      expect(mockVeniceClient.performWebSearch).toHaveBeenCalledTimes(3); // One for each claim
      expect(mockVeniceClient.generateWithSchema).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed verification results', async () => {
      const mockContent = createTestContentVersion({
        keyClaims: [
          'Verified claim',
          'Disputed claim',
          'Another verified claim'
        ]
      });

      const mockSearchResults = { results: [], totalResults: 0 };

      mockVeniceClient.performWebSearch.mockResolvedValue(mockSearchResults);

      // Mock different analysis results for each claim
      mockVeniceClient.generateWithSchema
        .mockResolvedValueOnce({
          isVerified: true,
          confidence: 0.8,
          evidence: 'Verified evidence',
          sources: [{ url: 'https://example.com/verified', title: 'Verified', snippet: 'Evidence' }]
        })
        .mockResolvedValueOnce({
          isVerified: false,
          confidence: 0.3,
          evidence: 'Disputed evidence',
          sources: [{ url: 'https://example.com/disputed', title: 'Disputed', snippet: 'Counter evidence' }]
        })
        .mockResolvedValueOnce({
          isVerified: true,
          confidence: 0.9,
          evidence: 'Another verified evidence',
          sources: [{ url: 'https://example.com/verified2', title: 'Verified 2', snippet: 'More evidence' }]
        });

      const input = {
        content: mockContent,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.verifiedClaims).toHaveLength(2);
      expect(result.disputedClaims).toHaveLength(1);
      expect(result.accuracyScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should handle search failures gracefully', async () => {
      const mockContent = createTestContentVersion({
        keyClaims: ['Test claim']
      });

      mockVeniceClient.performWebSearch.mockRejectedValue(new Error('Search failed'));

      const input = {
        content: mockContent,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.disputedClaims).toHaveLength(1);
      expect(result.disputedClaims[0].statement).toBe('Test claim');
      expect(result.disputedClaims[0].isVerified).toBe(false);
      expect(result.disputedClaims[0].confidence).toBe(0);
    });

    it('should calculate accuracy score correctly', async () => {
      const mockContent = createTestContentVersion({
        keyClaims: ['Claim 1', 'Claim 2', 'Claim 3', 'Claim 4']
      });

      const mockSearchResults = { results: [], totalResults: 0 };

      mockVeniceClient.performWebSearch.mockResolvedValue(mockSearchResults);

      // Mock specific confidence scores
      mockVeniceClient.generateWithSchema
        .mockResolvedValueOnce({ isVerified: true, confidence: 1.0, evidence: '', sources: [] })
        .mockResolvedValueOnce({ isVerified: true, confidence: 0.8, evidence: '', sources: [] })
        .mockResolvedValueOnce({ isVerified: false, confidence: 0.0, evidence: '', sources: [] })
        .mockResolvedValueOnce({ isVerified: true, confidence: 0.6, evidence: '', sources: [] });

      const input = {
        content: mockContent,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      // Accuracy score should be (1.0 + 0.8 + 0.0 + 0.6) / 4 * 100 = 60%
      expect(result.accuracyScore).toBe(60);
      expect(result.confidenceScore).toBeCloseTo(0.8, 1); // Average of verified claims: (1.0 + 0.8 + 0.6) / 3
    });
  });

  describe('analyzeClaimAccuracy', () => {
    it('should analyze claim with search results', async () => {
      const claim = 'AI transforms business operations';
      const searchResults = {
        results: [
          {
            title: 'AI Business Study',
            url: 'https://example.com/ai-study',
            snippet: 'Comprehensive study on AI business transformation'
          }
        ],
        totalResults: 1
      };

      const mockAnalysis = {
        isVerified: true,
        confidence: 0.9,
        evidence: 'Strong evidence from multiple sources',
        sources: [
          {
            url: 'https://example.com/source',
            title: 'Supporting source',
            snippet: 'Evidence'
          }
        ]
      };

      mockVeniceClient.generateWithSchema.mockResolvedValue(mockAnalysis);

      // Access private method through type assertion for testing
      const agentAny = agent as any;
      const result = await agentAny.analyzeClaimAccuracy(claim, searchResults);

      expect(result).toEqual({
        statement: claim,
        isVerified: true,
        confidence: 0.9,
        sources: [mockAnalysis.sources[0]]
      });

      expect(mockVeniceClient.generateWithSchema).toHaveBeenCalledWith(
        expect.stringContaining(claim),
        expect.any(Object),
        expect.stringContaining('fact-checking specialist')
      );
    });

    it('should handle analysis failures', async () => {
      const claim = 'Test claim';
      const searchResults = { results: [], totalResults: 0 };

      mockVeniceClient.generateWithSchema.mockRejectedValue(new Error('Analysis failed'));

      const agentAny = agent as any;
      const result = await agentAny.analyzeClaimAccuracy(claim, searchResults);

      expect(result).toEqual({
        statement: claim,
        isVerified: false,
        confidence: 0,
        sources: []
      });
    });
  });

  describe('calculateSourceReliability', () => {
    it('should assign high reliability to trusted domains', () => {
      const agentAny = agent as any;
      
      const reliableSources = [
        { url: 'https://en.wikipedia.org/test', title: 'Test', snippet: 'Test' },
        { url: 'https://www.bbc.com/article', title: 'Test', snippet: 'Test' },
        { url: 'https://nature.com/study', title: 'Test', snippet: 'Test' },
        { url: 'https://example.gov/report', title: 'Test', snippet: 'Test' },
        { url: 'https://harvard.edu/research', title: 'Test', snippet: 'Test' }
      ];

      reliableSources.forEach(source => {
        const reliability = agentAny.calculateSourceReliability(source);
        expect(reliability).toBe(0.9);
      });
    });

    it('should assign default reliability to unknown domains', () => {
      const agentAny = agent as any;
      
      const unknownSource = {
        url: 'https://unknown-website.com/article',
        title: 'Test',
        snippet: 'Test'
      };

      const reliability = agentAny.calculateSourceReliability(unknownSource);
      expect(reliability).toBe(0.6);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for low accuracy', () => {
      const agentAny = agent as any;
      
      const verifiedClaims = [];
      const disputedClaims = [
        { statement: 'Disputed claim 1' },
        { statement: 'Disputed claim 2' }
      ];
      const accuracyScore = 50;

      const recommendations = agentAny.generateRecommendations(verifiedClaims, disputedClaims, accuracyScore);

      expect(recommendations).toContain('Content requires significant fact-checking and revision');
      expect(recommendations).toContain('Review and revise 2 disputed claims');
    });

    it('should generate recommendations for medium accuracy', () => {
      const agentAny = agent as any;
      
      const verifiedClaims = [{ statement: 'Verified claim' }];
      const disputedClaims = [{ statement: 'Disputed claim' }];
      const accuracyScore = 75;

      const recommendations = agentAny.generateRecommendations(verifiedClaims, disputedClaims, accuracyScore);

      expect(recommendations).toContain('Content needs minor factual corrections');
      expect(recommendations).toContain('Review and revise 1 disputed claims');
    });

    it('should generate recommendations for high accuracy', () => {
      const agentAny = agent as any;
      
      const verifiedClaims = [
        { statement: 'Verified claim 1' },
        { statement: 'Verified claim 2' }
      ];
      const disputedClaims = [];
      const accuracyScore = 95;

      const recommendations = agentAny.generateRecommendations(verifiedClaims, disputedClaims, accuracyScore);

      expect(recommendations).toContain('Content demonstrates high factual accuracy');
    });

    it('should recommend adding verifiable claims when none exist', () => {
      const agentAny = agent as any;
      
      const verifiedClaims = [];
      const disputedClaims = [];
      const accuracyScore = 85;

      const recommendations = agentAny.generateRecommendations(verifiedClaims, disputedClaims, accuracyScore);

      expect(recommendations).toContain('Consider adding more verifiable claims with supporting evidence');
    });
  });

  describe('deduplicateSources', () => {
    it('should remove duplicate sources', () => {
      const agentAny = agent as any;
      
      const sources = [
        { url: 'https://example.com/source1', title: 'Source 1', snippet: 'Snippet 1' },
        { url: 'https://example.com/source2', title: 'Source 2', snippet: 'Snippet 2' },
        { url: 'https://example.com/source1', title: 'Source 1 Duplicate', snippet: 'Snippet 1' },
        { url: 'https://example.com/source3', title: 'Source 3', snippet: 'Snippet 3' }
      ];

      const deduplicated = agentAny.deduplicateSources(sources);

      expect(deduplicated).toHaveLength(3);
      expect(deduplicated.map(s => s.url)).toEqual([
        'https://example.com/source1',
        'https://example.com/source2',
        'https://example.com/source3'
      ]);
    });

    it('should handle empty sources array', () => {
      const agentAny = agent as any;
      
      const deduplicated = agentAny.deduplicateSources([]);
      expect(deduplicated).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle claim analysis errors gracefully', async () => {
      const mockContent = createTestContentVersion({
        keyClaims: ['Valid claim', 'Problematic claim']
      });

      const mockSearchResults = { results: [], totalResults: 0 };

      mockVeniceClient.performWebSearch.mockResolvedValue(mockSearchResults);
      
      // First claim succeeds, second fails
      mockVeniceClient.generateWithSchema
        .mockResolvedValueOnce({
          isVerified: true,
          confidence: 0.8,
          evidence: '',
          sources: []
        })
        .mockRejectedValueOnce(new Error('Analysis failed'));

      const input = {
        content: mockContent,
        cycleNumber: 1
      };

      const result = await agent.execute(input, mockWorkflowState);

      expect(result.verifiedClaims).toHaveLength(1);
      expect(result.disputedClaims).toHaveLength(1);
      expect(result.disputedClaims[0].statement).toBe('Problematic claim');
    });
  });
}); 