import { PrismaClient } from '@prisma/client';
import { AgentType, AgentResponse, WorkflowState } from '../../types';
import logger from '../../utils/logger';

export abstract class AgentBase<TInput, TOutput> {
  protected agentType: AgentType;
  protected veniceClient: any;
  protected prisma: PrismaClient;

  constructor(agentType: AgentType, veniceClient: any, prisma: PrismaClient) {
    this.agentType = agentType;
    this.veniceClient = veniceClient;
    this.prisma = prisma;
  }

  protected async logAgentExecution(
    workflowId: string,
    cycleNumber: number,
    input: TInput,
    output: TOutput,
    executionTime: number,
    tokensUsed?: number,
    error?: string
  ): Promise<void> {
    try {
      await this.prisma.agentResponse.create({
        data: {
          workflowRunId: workflowId,
          agentType: this.agentType,
          cycleNumber,
          input: input as any,
          output: output as any,
          success: !error,
          errorMessage: error,
          executionTime,
          tokensUsed,
        },
      });

      logger.info('Agent execution saved to database', {
        agentType: this.agentType,
        workflowId,
        cycleNumber,
      });
    } catch (err) {
      logger.error('Failed to save agent execution to database', {
        error: (err as Error).message,
        agentType: this.agentType,
        workflowId,
      });
    }

    logger.info('Agent execution logs', {
      agentType: this.agentType,
      workflowId,
      cycleNumber,
      success: !error,
      executionTime,
      tokensUsed,
    });
  }

  protected async measureExecutionTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    const result = await operation();
    const executionTime = Date.now() - startTime;

    return { result, executionTime };
  }

  protected handleError(error: Error, context: string): never {
    logger.error(`Agent ${this.agentType} error in ${context}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }

  protected validateInput(input: any, schema: any): void {
    if (!input) {
      throw new Error('Input is required');
    }
  }

  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        logger.warn(`Agent ${this.agentType} operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`, {
          error: lastError.message,
          attempt: attempt + 1,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export default AgentBase;
