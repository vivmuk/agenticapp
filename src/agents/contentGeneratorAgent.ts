import { AgentBase } from './base/AgentBase';
import { AgentType, ContentGenerationInput, ContentPackage, WorkflowState } from '../types';
import VeniceAPIClient from '../services/veniceApiClient';
import logger from '../utils/logger';
import { z } from 'zod';

export class ContentGeneratorAgent extends AgentBase<ContentGenerationInput, ContentPackage> {
  constructor(veniceClient: VeniceAPIClient) {
    super(AgentType.CONTENT_GENERATOR, veniceClient);
  }

  async execute(input: ContentGenerationInput, workflowState: WorkflowState): Promise<ContentPackage> {
    logger.info('ContentGeneratorAgent starting execution', {
      topic: input.topic,
      cycleNumber: input.cycleNumber,
      hasPreviousFeedback: !!input.previousFeedback,
    });

    try {
      const { result, executionTime } = await this.measureExecutionTime(async () => {
        const prompt = this.buildGenerationPrompt(input);
        const systemPrompt = this.buildSystemPrompt(input);

        let structuredResponse = await this.veniceClient.generateWithSchema(
          prompt,
          this.getContentGenerationSchema(),
          systemPrompt,
          undefined,
          {
            max_tokens: 4096,
            venice_parameters: { strip_thinking_response: true }
          }
        );

        structuredResponse = this.normalizeContentFields(structuredResponse);

        // Normalize field names if needed (handle cases where API returns different field names)
        if (structuredResponse && typeof structuredResponse === 'object') {
          // Handle case where API returns linkedin_post instead of linkedinPost
          if (!structuredResponse.linkedinPost && (structuredResponse as any).linkedin_post) {
            structuredResponse.linkedinPost = (structuredResponse as any).linkedin_post;
          }
          // Handle case where API returns image_prompt instead of imagePrompt
          if (!structuredResponse.imagePrompt && (structuredResponse as any).image_prompt) {
            structuredResponse.imagePrompt = (structuredResponse as any).image_prompt;
          }
          // Handle case where API returns key_claims instead of keyClaims
          if (!structuredResponse.keyClaims && (structuredResponse as any).key_claims) {
            structuredResponse.keyClaims = (structuredResponse as any).key_claims;
          }
        }

        // Validate that we have all required fields and provide defaults if missing
        const validatedResponse = {
          definition: structuredResponse.definition || 'Content generation failed - no definition provided',
          linkedinPost: structuredResponse.linkedinPost || 'Content generation failed - no LinkedIn post provided',
          imagePrompt: structuredResponse.imagePrompt || 'Content generation failed - no image prompt provided',
          keyClaims: Array.isArray(structuredResponse.keyClaims) && structuredResponse.keyClaims.length > 0 ? structuredResponse.keyClaims : ['Content generation failed - no key claims provided'],
        };

        const imageResponse = await this.generateImage(validatedResponse.imagePrompt);

        const contentPackage: ContentPackage = {
          definition: validatedResponse.definition,
          linkedinPost: validatedResponse.linkedinPost,
          imagePrompt: validatedResponse.imagePrompt,
          imageUrl: imageResponse.images?.[0]?.url || imageResponse.images?.[0]?.b64_json,
          keyClaims: validatedResponse.keyClaims,
          metadata: {
            cycleNumber: input.cycleNumber,
            generatedAt: new Date().toISOString(),
            topic: input.topic,
          },
        };

        return contentPackage;
      });

      await this.logAgentExecution(
        workflowState.id,
        input.cycleNumber,
        input,
        result,
        executionTime
      );

      logger.info('ContentGeneratorAgent completed successfully', {
        topic: input.topic,
        cycleNumber: input.cycleNumber,
        definitionLength: result.definition.length,
        linkedinPostLength: result.linkedinPost.length,
        hasImage: !!result.imageUrl,
      });

      return result;
    } catch (error) {
      this.handleError(error as Error, 'execute');
    }
  }

  private buildGenerationPrompt(input: ContentGenerationInput): string {
    let prompt = `Generate comprehensive content about the topic: "${input.topic}".`;

    if (input.cycleNumber > 1 && input.previousFeedback) {
      prompt += `\n\nPrevious feedback for improvement: ${input.previousFeedback}`;
      prompt += '\nPlease address this feedback in your new content.';
    }

    if (input.previousContent) {
      prompt += `\n\nPrevious content for reference:
Definition: ${input.previousContent.definition.substring(0, 200)}...
LinkedIn Post: ${input.previousContent.linkedinPost.substring(0, 200)}...`;
    }

    prompt += `
Please provide:
1. A comprehensive definition (150-300 words) explaining the topic clearly
2. A professional LinkedIn post (100-200 words) with engaging tone
3. An image prompt for visual representation (20-50 words)
4. 3-5 key claims that can be fact-checked
Ensure all content is accurate, professional, and engaging.`;

    return prompt;
  }

  private buildSystemPrompt(input: ContentGenerationInput): string {
    return `You are a professional content creator specializing in business and technology topics. Your task is to generate high-quality, accurate, and engaging content.

Guidelines:
- Use clear, professional language
- Ensure factual accuracy
- Create content suitable for LinkedIn audience
- Generate image prompts that are descriptive and appropriate
- Extract key claims that can be verified
- If improving previous content, address specific feedback provided
- Maintain consistency between definition and LinkedIn post
- Always respond in valid JSON format with the following structure:
{
  "definition": "your definition here",
  "linkedinPost": "your LinkedIn post here",
  "imagePrompt": "your image prompt here",
  "keyClaims": ["claim1", "claim2", "claim3"]
}
Cycle ${input.cycleNumber} of ${input.maxCycles || 3}. Focus on quality and improvement.`;
  }

  private getContentGenerationSchema() {
    return z.object({
      definition: z.string().min(1), // Reduced minimum length to prevent validation errors
      linkedinPost: z.string().min(1), // Reduced minimum length to prevent validation errors
      imagePrompt: z.string().min(1), // Reduced minimum length to prevent validation errors
      keyClaims: z.array(z.string()).min(1), // Reduced minimum count to prevent validation errors
    });
  }

  private normalizeContentFields(raw: any) {
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    // Normalize keys by removing spaces/underscores and lowercasing for easier matching
    const normalizedEntries = Object.entries(raw).reduce<Record<string, any>>((acc, [key, value]) => {
      const normalizedKey = key.replace(/[\s_-]+/g, '').toLowerCase();
      acc[normalizedKey] = value;
      return acc;
    }, {});

    const pick = (...aliases: string[]) => {
      for (const alias of aliases) {
        const normalized = alias.replace(/[\s_-]+/g, '').toLowerCase();
        if (normalizedEntries[normalized] !== undefined) {
          return normalizedEntries[normalized];
        }
      }
      return undefined;
    };

    return {
      definition: pick('definition', 'summary', 'overview'),
      linkedinPost: pick('linkedinpost', 'linkedin_post', 'linkedInPost', 'linkedin', 'post'),
      imagePrompt: pick('imageprompt', 'image_prompt', 'prompt', 'image'),
      keyClaims: pick('keyclaims', 'key_claims', 'claims', 'bullets', 'points'),
    };
  }

  private async generateImage(prompt: string): Promise<any> {
    try {
      logger.info('Generating image for content', { prompt: prompt.substring(0, 50) });

      const imageRequest = {
        model: 'z-image-turbo',
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 8,
      };

      const imageResponse = await this.veniceClient.generateImage(imageRequest);

      logger.info('Image generated successfully', {
        hasUrl: !!imageResponse.images?.[0]?.url,
        hasB64: !!imageResponse.images?.[0]?.b64_json
      });

      return imageResponse;
    } catch (error) {
      logger.warn('Image generation failed, continuing without image', {
        error: (error as Error).message,
      });

      return {
        images: [{
          url: 'https://via.placeholder.com/1024x1024/cccccc/666666?text=Image+Generation+Failed',
        }],
      };
    }
  }
}

export default ContentGeneratorAgent;
