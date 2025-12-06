import { PrismaClient } from '@prisma/client';
import {
  AgentType,
  WorkflowState,
  WorkflowStatus,
  ContentPackage,
  AccuracyCritique,
  QualityCritique,
  WorkflowStartInput,
  HumanReviewInput,
  ReviewAction
} from '../types';
import ContentGeneratorAgent from '../agents/contentGeneratorAgent';
import WebSearchCriticAgent from '../agents/webSearchCriticAgent';
import QualityCriticAgent from '../agents/qualityCriticAgent';
import VeniceAPIClient from './veniceApiClient';
import logger from '../utils/logger';

export class WorkflowManager {
  private prisma: PrismaClient;
  private veniceClient: VeniceAPIClient;
  private contentGenerator: ContentGeneratorAgent;
  private webSearchCritic: WebSearchCriticAgent;
  private qualityCritic: QualityCriticAgent;

  constructor(veniceClient: VeniceAPIClient, prisma: PrismaClient) {
    this.prisma = prisma;
    this.veniceClient = veniceClient;
    this.contentGenerator = new ContentGeneratorAgent(veniceClient);
    this.webSearchCritic = new WebSearchCriticAgent(veniceClient);
    this.qualityCritic = new QualityCriticAgent(veniceClient);
  }

  async startWorkflow(input: WorkflowStartInput, options?: { runAsync?: boolean }): Promise<WorkflowState> {
    logger.info('Starting new workflow', { topic: input.topic, maxCycles: input.maxCycles });

    // Convert qualityThreshold from 0-1 scale to 0-10 scale for database
    // Frontend sends 0-1, but database stores 0-10
    const qualityThreshold = input.qualityThreshold
      ? input.qualityThreshold * 10
      : 7.0;

    // Create workflow in database first to get the generated ID
    const created = await this.prisma.workflowRun.create({
      data: {
        topic: input.topic,
        status: WorkflowStatus.INITIALIZING,
        currentCycle: 1,
        maxCycles: input.maxCycles || 3,
        qualityThreshold: qualityThreshold,
        humanReviewRequired: false,
        humanReviewProvided: false,
        agentStatus: {
          [AgentType.CONTENT_GENERATOR]: { status: 'idle' },
          [AgentType.WEB_SEARCH_CRITIC]: { status: 'idle' },
          [AgentType.QUALITY_CRITIC]: { status: 'idle' },
        },
        startedAt: new Date(),
      },
    });

    const workflowState: WorkflowState = {
      id: created.id,
      topic: created.topic,
      status: created.status as WorkflowStatus,
      currentCycle: created.currentCycle,
      maxCycles: created.maxCycles,
      qualityThreshold: created.qualityThreshold,
      humanReviewRequired: created.humanReviewRequired,
      humanReviewProvided: created.humanReviewProvided,
      agentStatus: {
        [AgentType.CONTENT_GENERATOR]: { status: 'idle' },
        [AgentType.WEB_SEARCH_CRITIC]: { status: 'idle' },
        [AgentType.QUALITY_CRITIC]: { status: 'idle' },
      },
      startedAt: created.startedAt,
    };

    try {
      if (options?.runAsync) {
        // Fire-and-forget execution so the caller can return immediately
        this.executeWorkflowCycle({ ...workflowState })
          .catch(async (error) => {
            logger.error('Async workflow execution failed', {
              workflowId: workflowState.id,
              error: (error as Error).message,
            });
            workflowState.status = WorkflowStatus.FAILED;
            await this.saveWorkflowState(workflowState);
          });
        return workflowState;
      }

      const finalState = await this.executeWorkflowCycle(workflowState);
      return finalState;
    } catch (error) {
      logger.error('Workflow failed to start', {
        workflowId: workflowState.id,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      workflowState.status = WorkflowStatus.FAILED;
      await this.saveWorkflowState(workflowState);

      throw error;
    }
  }

  async executeWorkflowCycle(workflowState: WorkflowState): Promise<WorkflowState> {
    logger.info('Starting workflow cycle', {
      workflowId: workflowState.id,
      cycle: workflowState.currentCycle,
      maxCycles: workflowState.maxCycles,
    });

    let currentContent: ContentPackage | undefined;
    let currentAccuracyCritique: AccuracyCritique | undefined;
    let currentQualityCritique: QualityCritique | undefined;
    let previousFeedback: string | undefined;

    try {
      // Step 1: Content Generation
      workflowState.status = WorkflowStatus.CONTENT_GENERATION;
      workflowState.agentStatus[AgentType.CONTENT_GENERATOR].status = 'running';
      await this.saveWorkflowState(workflowState);

      const contentInput = {
        topic: workflowState.topic,
        cycleNumber: workflowState.currentCycle,
        previousFeedback,
        previousContent: currentContent,
      };

      currentContent = await this.contentGenerator.execute(contentInput, workflowState);

      workflowState.currentContent = currentContent;
      workflowState.agentStatus[AgentType.CONTENT_GENERATOR] = {
        status: 'completed',
        lastExecution: new Date(),
      };
      await this.saveWorkflowState(workflowState);

      // Step 2: Web Search Critic
      workflowState.status = WorkflowStatus.WEB_SEARCH_CRITIC;
      workflowState.agentStatus[AgentType.WEB_SEARCH_CRITIC].status = 'running';
      await this.saveWorkflowState(workflowState);

      const webSearchInput = {
        content: currentContent,
        cycleNumber: workflowState.currentCycle,
      };

      currentAccuracyCritique = await this.webSearchCritic.execute(webSearchInput, workflowState);

      workflowState.currentAccuracyCritique = currentAccuracyCritique;
      workflowState.agentStatus[AgentType.WEB_SEARCH_CRITIC] = {
        status: 'completed',
        lastExecution: new Date(),
      };
      await this.saveWorkflowState(workflowState);

      // Step 3: Quality Critic
      workflowState.status = WorkflowStatus.QUALITY_CRITIC;
      workflowState.agentStatus[AgentType.QUALITY_CRITIC].status = 'running';
      await this.saveWorkflowState(workflowState);

      const qualityInput = {
        content: currentContent,
        accuracyCritique: currentAccuracyCritique,
        cycleNumber: workflowState.currentCycle,
      };

      currentQualityCritique = await this.qualityCritic.execute(qualityInput, workflowState);

      workflowState.currentQualityCritique = currentQualityCritique;
      workflowState.agentStatus[AgentType.QUALITY_CRITIC] = {
        status: 'completed',
        lastExecution: new Date(),
      };
      await this.saveWorkflowState(workflowState);

      // Step 4: Evaluate quality and decide next action
      const qualityScore = currentQualityCritique.overallScore / 10;
      const qualityThreshold = workflowState.qualityThreshold;

      logger.info('Quality evaluation completed', {
        workflowId: workflowState.id,
        cycle: workflowState.currentCycle,
        qualityScore,
        qualityThreshold,
        recommendation: currentQualityCritique.finalRecommendation,
      });

      if (qualityScore >= qualityThreshold) {
        workflowState.status = WorkflowStatus.COMPLETED;
        workflowState.finalQualityScore = qualityScore;
        workflowState.completedAt = new Date();
        await this.saveWorkflowState(workflowState);

        logger.info('Workflow completed successfully', {
          workflowId: workflowState.id,
          finalQualityScore: qualityScore,
          totalCycles: workflowState.currentCycle,
        });
      } else if (workflowState.currentCycle >= workflowState.maxCycles) {
        workflowState.status = WorkflowStatus.HUMAN_REVIEW;
        workflowState.humanReviewRequired = true;
        workflowState.finalQualityScore = qualityScore;
        await this.saveWorkflowState(workflowState);

        logger.info('Max cycles reached, requiring human review', {
          workflowId: workflowState.id,
          finalQualityScore: qualityScore,
        });
      } else {
        previousFeedback = this.generateFeedbackForNextCycle(currentQualityCritique);
        workflowState.currentCycle++;

        logger.info('Starting next improvement cycle', {
          workflowId: workflowState.id,
          nextCycle: workflowState.currentCycle,
          feedback: previousFeedback?.substring(0, 100),
        });

        return await this.executeWorkflowCycle(workflowState);
      }

      return workflowState;
    } catch (error) {
      logger.error('Workflow cycle failed', {
        workflowId: workflowState.id,
        cycle: workflowState.currentCycle,
        error: (error as Error).message,
      });

      workflowState.status = WorkflowStatus.FAILED;
      await this.saveWorkflowState(workflowState);

      throw error;
    }
  }

  async submitHumanReview(workflowId: string, review: HumanReviewInput): Promise<WorkflowState> {
    logger.info('Submitting human review', { workflowId, action: review.action });

    const workflowState = await this.getWorkflowState(workflowId);
    if (!workflowState) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflowState.status !== WorkflowStatus.HUMAN_REVIEW) {
      throw new Error(`Workflow ${workflowId} is not in human review status`);
    }

    workflowState.humanReviewProvided = true;
    workflowState.humanReviewFeedback = review.feedback;

    const action = (review.action as unknown as string).toUpperCase() as ReviewAction;

    if (action === ReviewAction.ACCEPT) {
      workflowState.status = WorkflowStatus.COMPLETED;
      workflowState.completedAt = new Date();
      await this.saveWorkflowState(workflowState);

      logger.info('Human review accepted - workflow completed', { workflowId });
    } else if (action === ReviewAction.IMPROVE && workflowState.currentCycle < workflowState.maxCycles) {
      const feedback = review.feedback || 'Human feedback provided for improvement';
      const customEdits = review.customEdits;

      if (customEdits && workflowState.currentContent) {
        if (customEdits.definition) {
          workflowState.currentContent.definition = customEdits.definition;
        }
        if (customEdits.linkedinPost) {
          workflowState.currentContent.linkedinPost = customEdits.linkedinPost;
        }
        if (customEdits.imagePrompt) {
          workflowState.currentContent.imagePrompt = customEdits.imagePrompt;
        }
      }

      workflowState.currentCycle++;
      await this.saveWorkflowState(workflowState);

      logger.info('Human review improvement - starting next cycle', {
        workflowId,
        nextCycle: workflowState.currentCycle,
      });

      return await this.executeWorkflowCycle(workflowState);
    } else {
      workflowState.status = WorkflowStatus.COMPLETED;
      workflowState.completedAt = new Date();
      await this.saveWorkflowState(workflowState);

      logger.info('Human review rejected - workflow completed', { workflowId });
    }

    return workflowState;
  }

  async getWorkflowState(workflowId: string): Promise<WorkflowState | null> {
    try {
      const workflow = await this.prisma.workflowRun.findUnique({
        where: { id: workflowId },
        include: {
          contentVersions: true,
          agentResponses: true,
        },
      });

      if (!workflow) {
        return null;
      }

      return this.mapDatabaseToWorkflowState(workflow);
    } catch (error) {
      logger.error('Failed to get workflow state', {
        workflowId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private async saveWorkflowState(workflowState: WorkflowState): Promise<void> {
    try {
      await this.prisma.workflowRun.update({
        where: { id: workflowState.id },
        data: {
          status: workflowState.status,
          currentCycle: workflowState.currentCycle,
          maxCycles: workflowState.maxCycles,
          qualityThreshold: workflowState.qualityThreshold,
          finalQualityScore: workflowState.finalQualityScore,
          humanReviewRequired: workflowState.humanReviewRequired,
          humanReviewProvided: workflowState.humanReviewProvided,
          humanReviewFeedback: workflowState.humanReviewFeedback,
          agentStatus: workflowState.agentStatus as any,
          completedAt: workflowState.completedAt,
        },
      });

      if (workflowState.currentContent) {
        // Check if content version already exists
        const existing = await this.prisma.contentVersion.findFirst({
          where: {
            workflowRunId: workflowState.id,
            cycleNumber: workflowState.currentCycle,
          },
        });

        if (existing) {
          await this.prisma.contentVersion.update({
            where: { id: existing.id },
            data: {
              content: workflowState.currentContent as any,
              imageUrl: workflowState.currentContent.imageUrl,
              metadata: workflowState.currentContent.metadata as any,
            },
          });
        } else {
          await this.prisma.contentVersion.create({
            data: {
              workflowRunId: workflowState.id,
              cycleNumber: workflowState.currentCycle,
              versionType: workflowState.currentCycle === 1 ? 'INITIAL' : 'IMPROVED',
              content: workflowState.currentContent as any,
              imageUrl: workflowState.currentContent.imageUrl,
              metadata: workflowState.currentContent.metadata as any,
            },
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Failed to save workflow state', {
        workflowId: workflowState.id,
        error: errorMessage,
        stack: errorStack,
        workflowState: {
          status: workflowState.status,
          currentCycle: workflowState.currentCycle,
          topic: workflowState.topic,
        },
      });

      console.error('[ERROR] Failed to save workflow state:', errorMessage);
      console.error('[ERROR] Stack:', errorStack);

      throw error;
    }
  }

  private mapDatabaseToWorkflowState(dbWorkflow: any): WorkflowState {
    // Prefer the latest content version by cycleNumber (or createdAt as fallback)
    const contentVersions = dbWorkflow.contentVersions || [];
    const latestContentVersion = contentVersions
      .slice()
      .sort((a: any, b: any) => {
        if (a.cycleNumber !== undefined && b.cycleNumber !== undefined) {
          return (b.cycleNumber || 0) - (a.cycleNumber || 0);
        }
        return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      })[0];

    return {
      id: dbWorkflow.id,
      topic: dbWorkflow.topic,
      status: dbWorkflow.status,
      currentCycle: dbWorkflow.currentCycle,
      maxCycles: dbWorkflow.maxCycles,
      qualityThreshold: dbWorkflow.qualityThreshold,
      finalQualityScore: dbWorkflow.finalQualityScore,
      humanReviewRequired: dbWorkflow.humanReviewRequired,
      humanReviewProvided: dbWorkflow.humanReviewProvided,
      humanReviewFeedback: dbWorkflow.humanReviewFeedback,
      currentContent: latestContentVersion?.content,
      agentStatus: dbWorkflow.agentStatus ? (dbWorkflow.agentStatus as Record<string, any>) : {},
      startedAt: dbWorkflow.startedAt,
      completedAt: dbWorkflow.completedAt,
    };
  }

  private generateFeedbackForNextCycle(qualityCritique: QualityCritique): string {
    const improvements = qualityCritique.improvements;
    const highPriorityImprovements = improvements.filter(imp => imp.severity === 'high');
    const mediumPriorityImprovements = improvements.filter(imp => imp.severity === 'medium');

    let feedback = `Quality score: ${qualityCritique.overallScore}/100. `;

    if (highPriorityImprovements.length > 0) {
      feedback += `High priority issues: ${highPriorityImprovements.map(imp => imp.description).join(', ')}. `;
    }

    if (mediumPriorityImprovements.length > 0) {
      feedback += `Medium priority issues: ${mediumPriorityImprovements.map(imp => imp.description).join(', ')}. `;
    }

    feedback += `Focus on: ${improvements.slice(0, 3).map(imp => imp.suggestion).join(', ')}.`;

    return feedback;
  }
}

export default WorkflowManager;
