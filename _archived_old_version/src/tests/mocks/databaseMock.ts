 // Mock database for testing
export class DatabaseMock {
  private static data: Map<string, any[]> = new Map();

  static initialize() {
    this.data.clear();
    
    // Initialize with test data
    this.data.set('workflow_runs', [
      {
        id: 'test-workflow-1',
        topic: 'Test AI content generation',
        status: 'INITIALIZING',
        currentCycle: 1,
        maxCycles: 3,
        qualityThreshold: 7.0,
        finalQualityScore: null,
        humanReviewRequired: false,
        humanReviewProvided: false,
        humanReviewFeedback: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'test-workflow-2',
        topic: 'Another test topic',
        status: 'COMPLETED',
        currentCycle: 3,
        maxCycles: 3,
        qualityThreshold: 7.0,
        finalQualityScore: 8.5,
        humanReviewRequired: false,
        humanReviewProvided: false,
        humanReviewFeedback: null,
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date(),
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date()
      }
    ]);

    this.data.set('agent_responses', [
      {
        id: 'test-response-1',
        workflowRunId: 'test-workflow-1',
        agentType: 'CONTENT_GENERATOR',
        cycleNumber: 1,
        input: { topic: 'Test AI content generation' },
        output: { content: 'Generated content about AI' },
        success: true,
        errorMessage: null,
        executionTime: 1500,
        tokensUsed: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    this.data.set('human_reviews', [
      {
        id: 'test-review-1',
        workflowRunId: 'test-workflow-2',
        reviewerId: 'test-reviewer-1',
        reviewerName: 'Test Reviewer',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        triggerReason: 'QUALITY_THRESHOLD_NOT_MET',
        action: 'IMPROVE',
        feedback: 'Content needs more detail',
        customEdits: { content: 'Enhanced content' },
        qualityRating: 6,
        feedbackCategories: { accuracy: 7, relevance: 5 },
        reviewStartTime: new Date(Date.now() - 1800000),
        reviewCompletionTime: new Date(),
        estimatedReviewTime: 15,
        timeSpent: 12,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }

  static find(table: string, where?: any): any[] {
    const records = this.data.get(table) || [];
    
    if (!where) {
      return records;
    }

    return records.filter(record => {
      return Object.entries(where).every(([key, value]) => record[key] === value);
    });
  }

  static create(table: string, data: any): any {
    const records = this.data.get(table) || [];
    const newRecord = {
      id: `test-${table}-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    records.push(newRecord);
    this.data.set(table, records);
    
    return newRecord;
  }

  static update(table: string, id: string, data: any): any | null {
    const records = this.data.get(table) || [];
    const index = records.findIndex(record => record.id === id);
    
    if (index === -1) {
      return null;
    }

    records[index] = {
      ...records[index],
      ...data,
      updatedAt: new Date()
    };

    this.data.set(table, records);
    return records[index];
  }

  static delete(table: string, id: string): boolean {
    const records = this.data.get(table) || [];
    const index = records.findIndex(record => record.id === id);
    
    if (index === -1) {
      return false;
    }

    records.splice(index, 1);
    this.data.set(table, records);
    return true;
  }

  static clear() {
    this.data.clear();
  }
}

// Mock Prisma client
export const mockPrismaClient = {
  workflowRun: {
    findMany: (args?: any) => DatabaseMock.find('workflow_runs', args?.where),
    findUnique: (args: any) => {
      const records = DatabaseMock.find('workflow_runs', args.where);
      return records[0] || null;
    },
    create: (args: any) => DatabaseMock.create('workflow_runs', args.data),
    update: (args: any) => DatabaseMock.update('workflow_runs', args.where.id, args.data),
    delete: (args: any) => {
      const deleted = DatabaseMock.delete('workflow_runs', args.where.id);
      return deleted ? { id: args.where.id } : null;
    }
  },
  
  agentResponse: {
    findMany: (args?: any) => DatabaseMock.find('agent_responses', args?.where),
    create: (args: any) => DatabaseMock.create('agent_responses', args.data),
    findUnique: (args: any) => {
      const records = DatabaseMock.find('agent_responses', args.where);
      return records[0] || null;
    }
  },

  humanReview: {
    findMany: (args?: any) => DatabaseMock.find('human_reviews', args?.where),
    create: (args: any) => DatabaseMock.create('human_reviews', args.data),
    update: (args: any) => DatabaseMock.update('human_reviews', args.where.id, args.data),
    findUnique: (args: any) => {
      const records = DatabaseMock.find('human_reviews', args.where);
      return records[0] || null;
    }
  },

  $disconnect: async () => {}
}; 