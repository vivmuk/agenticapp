import { AgentBase } from './base/AgentBase';
import { AgentType, WebSearchInput, AccuracyCritique, WorkflowState, ContentPackage, Claim, Source } from '../types';
import VeniceAPIClient from '../services/veniceApiClient';
import logger from '../utils/logger';

export class WebSearchCriticAgent extends AgentBase<WebSearchInput, AccuracyCritique> {
  constructor(veniceClient: VeniceAPIClient) {
    super(AgentType.WEB_SEARCH_CRITIC, veniceClient);
  }

  async execute(input: WebSearchInput, workflowState: WorkflowState): Promise<AccuracyCritique> {
    logger.info('WebSearchCriticAgent starting execution', {
      cycleNumber: input.cycleNumber,
      claimCount: input.content.keyClaims.length,
    });

    try {
      const { result, executionTime } = await this.measureExecutionTime(async () => {
        const accuracyCritique = await this.performFactChecking(input.content);
        return accuracyCritique;
      });

      await this.logAgentExecution(
        workflowState.id,
        input.cycleNumber,
        input,
        result,
        executionTime
      );

      logger.info('WebSearchCriticAgent completed successfully', {
        cycleNumber: input.cycleNumber,
        accuracyScore: result.accuracyScore,
        verifiedClaims: result.verifiedClaims.length,
        disputedClaims: result.disputedClaims.length,
        sourceCount: result.sources.length,
      });

      return result;
    } catch (error) {
      this.handleError(error as Error, 'execute');
    }
  }

  private async performFactChecking(content: ContentPackage): Promise<AccuracyCritique> {
    const claims = content.keyClaims;
    const verifiedClaims: Claim[] = [];
    const disputedClaims: Claim[] = [];
    const sources: Source[] = [];
    let totalAccuracy = 0;

    logger.info('Starting fact-checking process', { claimCount: claims.length });

    for (const claim of claims) {
      try {
        const searchResults = await this.veniceClient.performWebSearch(claim);
        const claimAnalysis = await this.analyzeClaimAccuracy(claim, searchResults);

        if (claimAnalysis.isVerified) {
          verifiedClaims.push(claimAnalysis);
          totalAccuracy += claimAnalysis.confidence;
        } else {
          disputedClaims.push(claimAnalysis);
        }

        sources.push(...claimAnalysis.sources.map(source => ({
          ...source,
          reliability: this.calculateSourceReliability(source),
        })));
      } catch (error) {
        logger.warn('Failed to verify claim', {
          claim: claim.substring(0, 50),
          error: (error as Error).message,
        });

        disputedClaims.push({
          statement: claim,
          isVerified: false,
          confidence: 0,
          sources: [],
        });
      }
    }

    const accuracyScore = claims.length > 0 ? (totalAccuracy / claims.length) * 100 : 0;
    const confidenceScore = verifiedClaims.length > 0 ?
      verifiedClaims.reduce((sum, claim) => sum + claim.confidence, 0) / verifiedClaims.length : 0;

    const recommendations = this.generateRecommendations(verifiedClaims, disputedClaims, accuracyScore);

    return {
      accuracyScore,
      verifiedClaims,
      disputedClaims,
      sources: this.deduplicateSources(sources),
      recommendations,
      confidenceScore,
    };
  }

  private async analyzeClaimAccuracy(claim: string, searchResults: any): Promise<Claim> {
    const analysisPrompt = `Analyze the accuracy of the following claim based on the provided search results:

      Claim: "${claim}"
      Search Results: ${JSON.stringify(searchResults.results?.slice(0, 5) || [])}

      Provide a detailed analysis including:
      1. Whether the claim is verified (true/false)
      2. Confidence level (0-1)
      3. Supporting or contradicting evidence
      4. Source reliability assessment`;

    const systemPrompt = 'You are a fact-checking specialist. Analyze claims objectively based on search results and provide accurate assessments.';

    const schema = {
      isVerified: { type: 'boolean' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      evidence: { type: 'string' },
      sources: { type: 'array', items: { type: 'object' } },
    };

    try {
      const analysis = await this.veniceClient.generateWithSchema(
        analysisPrompt,
        schema,
        systemPrompt
      );

      return {
        statement: claim,
        isVerified: analysis.isVerified,
        confidence: analysis.confidence,
        sources: analysis.sources || [],
      };
    } catch (error) {
      logger.warn('Failed to analyze claim accuracy', {
        claim: claim.substring(0, 50),
        error: (error as Error).message,
      });

      return {
        statement: claim,
        isVerified: false,
        confidence: 0,
        sources: [],
      };
    }
  }

  private calculateSourceReliability(source: Source): number {
    const reliableDomains = [
      'wikipedia.org',
      'bbc.com', 'cnn.com', 'reuters.com', 'ap.org',
      'nature.com', 'science.org', 'ieee.org', 'acm.org',
      'gov', 'edu',
    ];

    const domain = new URL(source.url).hostname.toLowerCase();

    for (const reliableDomain of reliableDomains) {
      if (domain.includes(reliableDomain)) {
        return 0.9;
      }
    }

    return 0.6;
  }

  private generateRecommendations(
    verifiedClaims: Claim[],
    disputedClaims: Claim[],
    accuracyScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (accuracyScore < 70) {
      recommendations.push('Content requires significant fact-checking and revision');
    } else if (accuracyScore < 85) {
      recommendations.push('Content needs minor factual corrections');
    }

    if (disputedClaims.length > 0) {
      recommendations.push(`Review and revise ${disputedClaims.length} disputed claims`);
      recommendations.push('Add more reliable sources to support questionable statements');
    }

    if (verifiedClaims.length === 0) {
      recommendations.push('Consider adding more verifiable claims with supporting evidence');
    }

    if (accuracyScore > 90) {
      recommendations.push('Content demonstrates high factual accuracy');
    }

    return recommendations;
  }

  private deduplicateSources(sources: Source[]): Source[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      const key = source.url;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

export default WebSearchCriticAgent;
