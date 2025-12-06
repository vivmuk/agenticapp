 // Basic test setup - will be enhanced once dependencies are installed

// Test environment setup
export const setupTestEnvironment = () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/agentic_app_test';
  process.env.VENICE_API_KEY = 'test-api-key';
  process.env.VENICE_BASE_URL = 'https://api.venice.ai/api/v1';
  process.env.PORT = '3001';
};

// Test data fixtures
export const testFixtures = {
  workflowRun: {
    id: 'test-workflow-id',
    topic: 'Test topic for AI content generation',
    status: 'INITIALIZING',
    currentCycle: 1,
    maxCycles: 3,
    qualityThreshold: 7.0,
    humanReviewRequired: false,
    humanReviewProvided: false,
  },
  
  agentResponse: {
    id: 'test-agent-response-id',
    workflowRunId: 'test-workflow-id',
    agentType: 'CONTENT_GENERATOR',
    cycleNumber: 1,
    input: { topic: 'Test topic' },
    output: { content: 'Generated content' },
    success: true,
  },
  
  veniceApiResponse: {
    choices: [
      {
        message: {
          content: 'Test AI response content'
        }
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    }
  }
}; 