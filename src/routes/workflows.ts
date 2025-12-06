import express from 'express'; import { PrismaClient } from '@prisma/client'; import { VeniceAPIClient } from '../services/veniceApiClient'; import { WorkflowManager } from '../services/workflowManager'; import { WorkflowStartInput, HumanReviewInput } from '../types'; import logger from '../utils/logger';  const router = express.Router();  // Initialize services (in production, these would be dependency injected) const prisma = new PrismaClient(); const veniceClient = new VeniceAPIClient({   apiKey: process.env.VENICE_API_KEY!,   baseURL: process.env.VENICE_BASE_URL!,   model: 'llama-3.2-3b',   temperature: 0.8,   topP: 0.9, }); const workflowManager = new WorkflowManager(veniceClient, prisma);  // POST /api/workflows/start - Initialize new workflow router.post('/start', async (req, res) => {   try {     const { topic, maxCycles, qualityThreshold }: WorkflowStartInput = req.body;      // Validate input     if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {       return res.status(400).json({         success: false,         error: 'Topic is required and must be a non-empty string',       });     }      if (maxCycles && (typeof maxCycles !== 'number' || maxCycles < 1 || maxCycles > 10)) {       return res.status(400).json({         success: false,         error: 'maxCycles must be a number between 1 and 10',       });     }      if (qualityThreshold && (typeof qualityThreshold !== 'number' || qualityThreshold < 1 || qualityThreshold > 10)) {       return res.status(400).json({         success: false,         error: 'qualityThreshold must be a number between 1 and 10',       });     }      logger.info('Starting new workflow', { topic, maxCycles, qualityThreshold });      const workflowState = await workflowManager.startWorkflow({       topic: topic.trim(),       maxCycles,       qualityThreshold,     });      res.status(201).json({       success: true,       data: {         workflowId: workflowState.id,         status: workflowState.status,         topic: workflowState.topic,         currentCycle: workflowState.currentCycle,         maxCycles: workflowState.maxCycles,         qualityThreshold: workflowState.qualityThreshold,         startedAt: workflowState.startedAt,       },     });   } catch (error) {     logger.error('Failed to start workflow', {       error: (error as Error).message,       stack: (error as Error).stack,     });      res.status(500).json({       success: false,       error: 'Internal server error while starting workflow',     });   } });  // GET /api/workflows/:id - Get workflow status and results router.get('/:id', async (req, res) => {   try {     const { id } = req.params;      if (!id || typeof id !== 'string') {       return res.status(400).json({         success: false,         error: 'Valid workflow ID is required',       });     }      logger.info('Getting workflow status', { workflowId: id });      const workflowState = await workflowManager.getWorkflowState(id);      if (!workflowState) {       return res.status(404).json({         success: false,         error: 'Workflow not found',       });     }      res.json({       success: true,       data: {         workflowId: workflowState.id,         status: workflowState.status,         topic: workflowState.topic,         currentCycle: workflowState.currentCycle,         maxCycles: workflowState.maxCycles,         qualityThreshold: workflowState.qualityThreshold,         finalQualityScore: workflowState.finalQualityScore,         humanReviewRequired: workflowState.humanReviewRequired,         humanReviewProvided: workflowState.humanReviewProvided,         humanReviewFeedback: workflowState.humanReviewFeedback,         currentContent: workflowState.currentContent,         currentAccuracyCritique: workflowState.currentAccuracyCritique,         currentQualityCritique: workflowState.currentQualityCritique,         agentStatus: workflowState.agentStatus,         startedAt: workflowState.startedAt,         completedAt: workflowState.completedAt,       },     });   } catch (error) {     logger.error('Failed to get workflow', {       workflowId: req.params.id,       error: (error as Error).message,     });      res.status(500).json({       success: false,       error: 'Internal server error while retrieving workflow',     });   } });  // POST /api/workflows/:id/human-review - Submit human feedback router.post('/:id/human-review', async (req, res) => {   try {     const { id } = req.params;     const { action, feedback, customEdits }: HumanReviewInput = req.body;      if (!id || typeof id !== 'string') {       return res.status(400).json({         success: false,         error: 'Valid workflow ID is required',       });     }      if (!action || !['accept', 'improve', 'reject'].includes(action)) {       return res.status(400).json({         success: false,         error: 'Action must be one of: accept, improve, reject',       });     }      if (feedback && typeof feedback !== 'string') {       return res.status(400).json({         success: false,         error: 'Feedback must be a string',       });     }      if (customEdits && typeof customEdits !== 'object') {       return res.status(400).json({         success: false,         error: 'Custom edits must be an object',       });     }      logger.info('Submitting human review', { workflowId: id, action, feedback });      const workflowState = await workflowManager.submitHumanReview(id, {       action,       feedback,       customEdits,     });      res.json({       success: true,       data: {         workflowId: workflowState.id,         status: workflowState.status,         topic: workflowState.topic,         currentCycle: workflowState.currentCycle,         maxCycles: workflowState.maxCycles,         finalQualityScore: workflowState.finalQualityScore,         humanReviewProvided: workflowState.humanReviewProvided,         humanReviewFeedback: workflowState.humanReviewFeedback,         completedAt: workflowState.completedAt,       },     });   } catch (error) {     logger.error('Failed to submit human review', {       workflowId: req.params.id,       error: (error as Error).message,     });      res.status(500).json({       success: false,       error: 'Internal server error while submitting human review',     });   } });  // GET /api/workflows/:id/versions - Get content version history router.get('/:id/versions', async (req, res) => {   try {     const { id } = req.params;      if (!id || typeof id !== 'string') {       return res.status(400).json({         success: false,         error: 'Valid workflow ID is required',       });     }      logger.info('Getting workflow versions', { workflowId: id });      const versions = await prisma.contentVersion.findMany({       where: { workflowRunId: id },       orderBy: { cycleNumber: 'asc' },       select: {         id: true,         cycleNumber: true,         versionType: true,         content: true,         imageUrl: true,         metadata: true,         createdAt: true,       },     });      if (versions.length === 0) {       return res.status(404).json({         success: false,         error: 'Workflow not found or no versions available',       });     }      res.json({       success: true,       data: {         workflowId: id,         versions,         totalCount: versions.length,       },     });   } catch (error) {     logger.error('Failed to get workflow versions', {       workflowId: req.params.id,       error: (error as Error).message,     });      res.status(500).json({       success: false,       error: 'Internal server error while retrieving workflow versions',     });   } });  // GET /api/workflows - List all workflows (with pagination) router.get('/', async (req, res) => {   try {     const page = parseInt(req.query.page as string) || 1;     const limit = parseInt(req.query.limit as string) || 10;     const status = req.query.status as string;      if (page < 1 || limit < 1 || limit > 100) {       return res.status(400).json({         success: false,         error: 'Page must be >= 1 and limit must be between 1 and 100',       });     }      const skip = (page - 1) * limit;      const whereClause = status ? { status } : {};      const [workflows, totalCount] = await Promise.all([       prisma.workflowRun.findMany({         where: whereClause,         skip,         take: limit,         orderBy: { startedAt: 'desc' },         select: {           id: true,           topic: true,           status: true,           currentCycle: true,           maxCycles: true,           finalQualityScore: true,           humanReviewRequired: true,           humanReviewProvided: true,           startedAt: true,           completedAt: true,           _count: {             select: {               contentVersions: true,               agentResponses: true,             },           },         },       }),       prisma.workflowRun.count({ where: whereClause }),     ]);      res.json({       success: true,       data: {         workflows,         pagination: {           page,           limit,           totalCount,           totalPages: Math.ceil(totalCount / limit),           hasNextPage: page * limit < totalCount,           hasPreviousPage: page > 1,         },       },     });   } catch (error) {     logger.error('Failed to list workflows', {       error: (error as Error).message,     });      res.status(500).json({       success: false,       error: 'Internal server error while listing workflows',     });   } });  // DELETE /api/workflows/:id - Cancel/delete a workflow router.delete('/:id', async (req, res) => {   try {     const { id } = req.params;      if (!id || typeof id !== 'string') {       return res.status(400).json({         success: false,         error: 'Valid workflow ID is required',       });     }      logger.info('Deleting workflow', { workflowId: id });      // Check if workflow exists     const workflow = await prisma.workflowRun.findUnique({       where: { id },     });      if (!workflow) {       return res.status(404).json({         success: false,         error: 'Workflow not found',       });     }      // Delete workflow and related data     await prisma.workflowRun.delete({       where: { id },     });      res.json({       success: true,       data: {         workflowId: id,         deleted: true,       },     });   } catch (error) {     logger.error('Failed to delete workflow', {       workflowId: req.params.id,       error: (error as Error).message,     });      res.status(500).json({       success: false,       error: 'Internal server error while deleting workflow',     });   } });  export default router; 

// GET /api/workflows/review-queue - Get list of workflows awaiting human review
router.get('/review-queue', async (req, res) => {
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

// POST /api/workflows/:id/review-comments - Add inline comments to review
router.post('/:id/review-comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { contentType, text, selection, type, author }: ReviewComment = req.body;

    if (!id || typeof id !== 'string') {
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
      where: { workflowRunId: id },
    });

    if (!humanReview) {
      humanReview = await prisma.humanReview.create({
        data: {
          workflowRunId: id,
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

    logger.info('Added review comment', { workflowId: id, commentId: comment.id });

    res.json({
      success: true,
      data: {
        comment,
        reviewId: humanReview.id,
      },
    });
  } catch (error) {
    logger.error('Failed to add review comment', {
      workflowId: req.params.id,
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while adding review comment',
    });
  }
});

// GET /api/workflows/:id/review-history - Get historical review data
router.get('/:id/review-history', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid workflow ID is required',
      });
    }

    const reviewHistory = await prisma.humanReview.findMany({
      where: { workflowRunId: id },
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
        workflowId: id,
        reviewHistory,
        totalCount: reviewHistory.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get review history', {
      workflowId: req.params.id,
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving review history',
    });
  }
});

// GET /api/workflows/review-metrics - Get review analytics and metrics
router.get('/review-metrics', async (req, res) => {
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

// PUT /api/workflows/:id/assign-reviewer - Assign a reviewer to a workflow
router.put('/:id/assign-reviewer', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId, reviewerName, priority } = req.body;

    if (!id || typeof id !== 'string') {
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
      where: { workflowRunId: id },
      update: {
        reviewerId,
        reviewerName,
        priority: priority || ReviewPriority.MEDIUM,
        status: HumanReviewStatus.ASSIGNED,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
      create: {
        workflowRunId: id,
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
      where: { workflowRunId: id },
      update: {
        assignedTo: reviewerId,
        priority: priority || ReviewPriority.MEDIUM,
      },
      create: {
        workflowRunId: id,
        topic: '', // Will be populated from workflow
        priority: priority || ReviewPriority.MEDIUM,
        triggerReason: TriggerReason.USER_REQUESTED,
        currentCycle: 1,
        maxCycles: 3,
        qualityScore: 0,
        assignedTo: reviewerId,
      },
    });

    logger.info('Assigned reviewer to workflow', { workflowId: id, reviewerId });

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
      workflowId: req.params.id,
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error while assigning reviewer',
    });
  }
});

// Helper function to update reviewer metrics
async function updateReviewerMetrics(reviewerId: string, qualityRating: number) {
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