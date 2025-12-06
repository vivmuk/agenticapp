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

 const structuredResponse = await this.veniceClient.generateWithSchema(
 prompt,
 this.getContentGenerationSchema(),
 systemPrompt
 );

 const imageResponse = await this.generateImage(structuredResponse.imagePrompt);

 const contentPackage: ContentPackage = {
 definition: structuredResponse.definition,
 linkedinPost: structuredResponse.linkedinPost,
 imagePrompt: structuredResponse.imagePrompt,
 imageUrl: imageResponse.data[0]?.url,
 keyClaims: structuredResponse.keyClaims,
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
 prompt += `\n\nPrevious content for reference:\nDefinition: ${input.previousContent.definition.substring(0, 200)}...\nLinkedIn Post: ${input.previousContent.linkedinPost.substring(0, 200)}...`;
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
 Cycle ${input.cycleNumber} of ${input.maxCycles || 3}. Focus on quality and improvement.`;
 }

 private getContentGenerationSchema() {
 return z.object({
 definition: z.string().min(50),
 linkedinPost: z.string().min(100),
 imagePrompt: z.string().min(20),
 keyClaims: z.array(z.string()).min(3),
 });
 }

 private async generateImage(prompt: string): Promise<any> {
 try {
 logger.info('Generating image for content', { prompt: prompt.substring(0, 50) });

 const imageRequest = {
 model: 'venice-sd35',
 prompt: prompt,
 width: 512,
 height: 512,
 steps: 25,
 };

 const imageResponse = await this.veniceClient.generateImage(imageRequest);

 logger.info('Image generated successfully', { imageUrl: imageResponse.data[0]?.url });

 return imageResponse;
 } catch (error) {
 logger.warn('Image generation failed, continuing without image', {
 error: (error as Error).message,
 });

 return {
 data: [{
 url: 'https://via.placeholder.com/512x512/cccccc/666666?text=Image+Generation+Failed',
 }],
 };
 }
 }
}

export default ContentGeneratorAgent;
