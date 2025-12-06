// @ts-nocheck
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  HumanReview, 
  ReviewComment, 
  ReviewQueueItem,
  ReviewMetrics,
  HumanReviewStatus,
  ReviewPriority,
  TriggerReason,
  ReviewAction,
  CommentType,
  FeedbackCategoryType
} from '../types';
import logger from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/human-review/queue - Get list of workflows awaiting human review
router.get('/queue', async (req: Request, res: Response) => {
  try {
    const { priority, assignedTo } = req.query;
    
    const whereClause: any = {};
    if (priority) {
      whereClause.priority = priority as ReviewPriority;
    }
    if (assignedTo) {
      whereClause.assignedTo = assignedTo as string;
    }

    const reviewQueue = await prisma.reviewQueue.findMany({
      where: whereClause,
      include: {
        workflowRun: {
          select: {
            id: true,
            topic: true,
            status: true,
            currentCycle: true,
            maxCycles: true,
            finalQualityScore: true,
            startedAt: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: {
        queue: reviewQueue,
        totalCount: reviewQueue.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get review queue', {
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving review queue',
    });
  }
});

// POST /api/human-review/:workflowId/comments - Add inline comments to review
router.post('/:workflowId/comments', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { contentType, text, selection, type, author }: ReviewComment = req.body;

    if (!workflowId || typeof workflowId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid workflow ID is required',
      });
    }

    // Validate required fields
    if (!contentType || !text || !type || !author) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contentType, text, type, author',
      });
    }

    // Get or create human review
    let humanReview = await prisma.humanReview.findFirst({
      where: { workflowRunId: workflowId },
    });

    if (!humanReview) {
      humanReview = await prisma.humanReview.create({
        data: {
          workflowRunId: workflowId,
          status: HumanReviewStatus.IN_PROGRESS,
          priority: ReviewPriority.MEDIUM,
          triggerReason: TriggerReason.USER_REQUESTED,
          reviewStartTime: new Date(),
        },
      });
    }

    // Create comment
    const comment = await prisma.reviewComment.create({
      data: {
        humanReviewId: humanReview.id,
        contentType,
        text,
        selection,
        type,
        author,
        timestamp: new Date(),
      },
    });

    logger.info('Added review comment', { workflowId, commentId: comment.id });

    res.json({
      success: true,
      data: {
        comment,
        reviewId: humanReview.id,
      },
    });
  } catch (error) {
    logger.error('Failed to add review comment', {
      workflowId: req.params.workflowId,
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while adding review comment',
    });
  }
});

// GET /api/human-review/:workflowId/history - Get historical review data
router.get('/:workflowId/history', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;

    if (!workflowId || typeof workflowId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid workflow ID is required',
      });
    }

    const reviewHistory = await prisma.humanReview.findMany({
      where: { workflowRunId: workflowId },
      include: {
        reviewComments: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        workflowId,
        reviewHistory,
        totalCount: reviewHistory.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get review history', {
      workflowId: req.params.workflowId,
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving review history',
    });
  }
});

// GET /api/human-review/metrics - Get review analytics and metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { reviewerId, startDate, endDate } = req.query;

    const whereClause: any = {};
    if (reviewerId) {
      whereClause.reviewerId = reviewerId as string;
    }
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const metrics = await prisma.reviewMetrics.findMany({
      where: whereClause,
      orderBy: { lastReviewDate: 'desc' },
    });

    // Get overall statistics
    const overallStats = await prisma.humanReview.aggregate({
      _count: { id: true },
      _avg: { qualityRating: true, timeSpent: true },
      where: whereClause,
    });

    res.json({
      success: true,
      data: {
        reviewerMetrics: metrics,
        overallStats: {
          totalReviews: overallStats._count.id,
          averageQualityRating: overallStats._avg.qualityRating,
          averageReviewTime: overallStats._avg.timeSpent,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get review metrics', {
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving review metrics',
    });
  }
});

// PUT /api/human-review/:workflowId/assign - Assign a reviewer to a workflow
router.put('/:workflowId/assign', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { reviewerId, reviewerName, priority } = req.body;

    if (!workflowId || typeof workflowId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid workflow ID is required',
      });
    }

    if (!reviewerId || !reviewerName) {
      return res.status(400).json({
        success: false,
        error: 'Reviewer ID and name are required',
      });
    }

    // Update human review
    const humanReview = await prisma.humanReview.upsert({
      where: { workflowRunId: workflowId },
      update: {
        reviewerId,
        reviewerName,
        priority: priority || ReviewPriority.MEDIUM,
        status: HumanReviewStatus.ASSIGNED,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
      create: {
        workflowRunId: workflowId,
        reviewerId,
        reviewerName,
        priority: priority || ReviewPriority.MEDIUM,
        status: HumanReviewStatus.ASSIGNED,
        triggerReason: TriggerReason.USER_REQUESTED,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Add to review queue
    await prisma.reviewQueue.upsert({
      where: { workflowRunId: workflowId },
      update: {
        assignedTo: reviewerId,
        priority: priority || ReviewPriority.MEDIUM,
      },
      create: {
        workflowRunId: workflowId,
        topic: '', // Will be populated from workflow
        priority: priority || ReviewPriority.MEDIUM,
        triggerReason: TriggerReason.USER_REQUESTED,
        currentCycle: 1,
        maxCycles: 3,
        qualityScore: 0,
        assignedTo: reviewerId,
      },
    });

    logger.info('Assigned reviewer to workflow', { workflowId, reviewerId });

    res.json({
      success: true,
      data: {
        reviewId: humanReview.id,
        reviewerId,
        reviewerName,
        status: humanReview.status,
        dueDate: humanReview.dueDate,
      },
    });
  } catch (error) {
    logger.error('Failed to assign reviewer', {
      workflowId: req.params.workflowId,
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while assigning reviewer',
    });
  }
});

// DELETE /api/human-review/:workflowId/comments/:commentId - Delete a comment
router.delete('/:workflowId/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const { workflowId, commentId } = req.params;

    if (!workflowId || !commentId) {
      return res.status(400).json({
        success: false,
        error: 'Valid workflow ID and comment ID are required',
      });
    }

    const comment = await prisma.reviewComment.delete({
      where: { id: commentId },
    });

    logger.info('Deleted review comment', { workflowId, commentId });

    res.json({
      success: true,
      data: {
        commentId: comment.id,
        deleted: true,
      },
    });
  } catch (error) {
    logger.error('Failed to delete review comment', {
      workflowId: req.params.workflowId,
      commentId: req.params.commentId,
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while deleting review comment',
    });
  }
});

// Helper function to update reviewer metrics
export async function updateReviewerMetrics(reviewerId: string, qualityRating: number) {
  try {
    const existingMetrics = await prisma.reviewMetrics.findUnique({
      where: { reviewerId },
    });

    if (existingMetrics) {
      await prisma.reviewMetrics.update({
        where: { reviewerId },
        data: {
          totalReviews: existingMetrics.totalReviews + 1,
          averageReviewTime: (existingMetrics.averageReviewTime + qualityRating) / 2,
          averageQualityImprovement: (existingMetrics.averageQualityImprovement + qualityRating) / 2,
          lastReviewDate: new Date(),
        },
      });
    } else {
      await prisma.reviewMetrics.create({
        data: {
          reviewerId,
          reviewerName: 'Unknown', // Would be populated from user service
          totalReviews: 1,
          averageReviewTime: qualityRating,
          averageQualityImprovement: qualityRating,
          lastReviewDate: new Date(),
        },
      });
    }
  } catch (error) {
    logger.error('Failed to update reviewer metrics', {
      reviewerId,
      error: (error as Error).message,
    });
  }
}

export default router;