 // Test utility functions
export const createTestWorkflowRun = (overrides?: any) => ({
  id: 'test-workflow-id',
  topic: 'Test topic for AI content generation',
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
  updatedAt: new Date(),
  ...overrides
});

export const createTestAgentResponse = (overrides?: any) => ({
  id: 'test-agent-response-id',
  workflowRunId: 'test-workflow-id',
  agentType: 'CONTENT_GENERATOR',
  cycleNumber: 1,
  input: { topic: 'Test topic' },
  output: { content: 'Generated content' },
  success: true,
  errorMessage: null,
  executionTime: 1500,
  tokensUsed: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createTestHumanReview = (overrides?: any) => ({
  id: 'test-review-id',
  workflowRunId: 'test-workflow-id',
  reviewerId: 'test-reviewer-id',
  reviewerName: 'Test Reviewer',
  status: 'PENDING',
  priority: 'MEDIUM',
  triggerReason: 'QUALITY_THRESHOLD_NOT_MET',
  action: null,
  feedback: null,
  customEdits: null,
  qualityRating: null,
  feedbackCategories: null,
  reviewStartTime: null,
  reviewCompletionTime: null,
  estimatedReviewTime: 15,
  timeSpent: null,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createTestContentVersion = (overrides?: any) => ({
  id: 'test-content-version-id',
  workflowRunId: 'test-workflow-id',
  cycleNumber: 1,
  versionType: 'INITIAL',
  content: { title: 'Test Content', body: 'Test body content' },
  imageUrl: null,
  metadata: { wordCount: 100 },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Performance measurement utilities
export class PerformanceTracker {
  private startTime: number;
  private measurements: Map<string, number[]> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  start(label: string) {
    this.measurements.set(label, []);
    return Date.now();
  }

  measure(label: string, startTime: number) {
    const duration = Date.now() - startTime;
    const measurements = this.measurements.get(label) || [];
    measurements.push(duration);
    this.measurements.set(label, measurements);
    return duration;
  }

  getAverage(label: string): number {
    const measurements = this.measurements.get(label) || [];
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }

  getTotalTime(): number {
    return Date.now() - this.startTime;
  }

  getReport(): Record<string, { count: number; average: number; min: number; max: number }> {
    const report: Record<string, { count: number; average: number; min: number; max: number }> = {};
    
    for (const [label, measurements] of this.measurements) {
      report[label] = {
        count: measurements.length,
        average: measurements.reduce((sum, time) => sum + time, 0) / measurements.length,
        min: Math.min(...measurements),
        max: Math.max(...measurements)
      };
    }
    
    return report;
  }
}

// Async test utilities
export const waitFor = (condition: () => boolean, timeout: number = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Condition not met within ${timeout}ms`));
      } else {
        setTimeout(check, 100);
      }
    };
    
    check();
  });
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Test data generators
export const generateRandomTopic = (): string => {
  const topics = [
    'The impact of AI on modern business',
    'Sustainable energy solutions for the future',
    'Remote work productivity strategies',
    'Digital transformation in healthcare',
    'Cybersecurity best practices for small businesses',
    'The future of autonomous vehicles',
    'Machine learning applications in finance',
    'Climate change mitigation technologies',
    'Social media marketing trends',
    'Blockchain beyond cryptocurrency'
  ];
  
  return topics[Math.floor(Math.random() * topics.length)];
};

export const generateRandomContent = (topic: string): string => {
  return `This is generated content about ${topic}. It includes comprehensive information, analysis, and insights that would typically be produced by an AI content generation system. The content is designed to be informative and engaging.`;
};

// Validation utilities
export const validateWorkflowRun = (workflow: any): boolean => {
  return !!(
    workflow.id &&
    typeof workflow.topic === 'string' &&
    ['INITIALIZING', 'RUNNING', 'CONTENT_GENERATION', 'WEB_SEARCH_CRITIC', 'QUALITY_CRITIC', 'HUMAN_REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(workflow.status) &&
    typeof workflow.currentCycle === 'number' &&
    typeof workflow.maxCycles === 'number' &&
    typeof workflow.qualityThreshold === 'number'
  );
};

export const validateAgentResponse = (response: any): boolean => {
  return !!(
    response.id &&
    typeof response.workflowRunId === 'string' &&
    ['CONTENT_GENERATOR', 'WEB_SEARCH_CRITIC', 'QUALITY_CRITIC', 'WORKFLOW_MANAGER'].includes(response.agentType) &&
    typeof response.cycleNumber === 'number' &&
    typeof response.success === 'boolean' &&
    response.output
  );
};

export const validateHumanReview = (review: any): boolean => {
  return !!(
    review.id &&
    typeof review.workflowRunId === 'string' &&
    ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED', 'EXPIRED'].includes(review.status) &&
    ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(review.priority) &&
    ['QUALITY_THRESHOLD_NOT_MET', 'MAX_CYCLES_REACHED', 'ACCURACY_CONCERNS', 'USER_REQUESTED', 'ESCALATION'].includes(review.triggerReason)
  );
}; 