export interface ContentGenerationInput {
  topic: string;
  cycleNumber: number;
  previousFeedback?: string;
  previousContent?: ContentPackage;
  maxCycles?: number;
}

export interface ContentPackage {
  definition: string;
  linkedinPost: string;
  imagePrompt: string;
  imageUrl?: string;
  keyClaims: string[];
  metadata?: Record<string, any>;
}

export interface WebSearchInput {
  content: ContentPackage;
  cycleNumber: number;
}

export interface AccuracyCritique {
  accuracyScore: number;
  verifiedClaims: Claim[];
  disputedClaims: Claim[];
  sources: Source[];
  recommendations: string[];
  confidenceScore: number;
}

export interface Claim {
  statement: string;
  isVerified: boolean;
  confidence: number;
  sources: Source[];
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
  reliability?: number;
}

export interface QualityCritiqueInput {
  content: ContentPackage;
  accuracyCritique: AccuracyCritique;
  cycleNumber: number;
}

export interface QualityCritique {
  overallScore: number;
  coherenceScore: number;
  engagementScore: number;
  accuracyScore: number;
  improvements: Improvement[];
  finalRecommendation: 'accept' | 'improve' | 'reject';
  reasoning: string;
}

export interface Improvement {
  type: 'definition' | 'linkedinPost' | 'imagePrompt' | 'general';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

// Human Review System Types
export interface HumanReview {
  id: string;
  workflowRunId: string;
  reviewerId?: string;
  reviewerName?: string;
  status: HumanReviewStatus;
  priority: ReviewPriority;
  triggerReason: TriggerReason;
  action?: ReviewAction;
  feedback?: string;
  customEdits?: CustomEdits;
  qualityRating?: number;
  feedbackCategories?: FeedbackCategory[];
  reviewStartTime?: Date;
  reviewCompletionTime?: Date;
  estimatedReviewTime?: number;
  timeSpent?: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewComment {
  id: string;
  humanReviewId: string;
  contentType: 'definition' | 'linkedinPost' | 'imagePrompt';
  text: string;
  selection: TextSelection;
  type: CommentType;
  author: string;
  timestamp: Date;
  resolved: boolean;
  parentId?: string;
}

export interface TextSelection {
  start: number;
  end: number;
  selectedText: string;
}

export interface FeedbackCategory {
  category: FeedbackCategoryType;
  rating: number;
  comments?: string;
}

export interface CustomEdits {
  definition?: string;
  linkedinPost?: string;
  imagePrompt?: string;
}

export interface ReviewMetrics {
  totalReviews: number;
  averageReviewTime: number;
  averageQualityImprovement: number;
  decisionBreakdown: {
    accept: number;
    improve: number;
    reject: number;
  };
  categoryBreakdown: Record<FeedbackCategoryType, number>;
}

export interface ReviewQueueItem {
  id: string;
  workflowRunId: string;
  topic: string;
  priority: ReviewPriority;
  triggerReason: TriggerReason;
  currentCycle: number;
  maxCycles: number;
  qualityScore: number;
  estimatedReviewTime: number;
  assignedTo?: string;
  timeInQueue: number;
  dueDate?: Date;
}

export enum HumanReviewStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ESCALATED = 'ESCALATED',
  EXPIRED = 'EXPIRED'
}

export enum ReviewPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TriggerReason {
  QUALITY_THRESHOLD_NOT_MET = 'QUALITY_THRESHOLD_NOT_MET',
  MAX_CYCLES_REACHED = 'MAX_CYCLES_REACHED',
  ACCURACY_CONCERNS = 'ACCURACY_CONCERNS',
  USER_REQUESTED = 'USER_REQUESTED',
  ESCALATION = 'ESCALATION'
}

export enum ReviewAction {
  ACCEPT = 'ACCEPT',
  IMPROVE = 'IMPROVE',
  REJECT = 'REJECT'
}

export enum CommentType {
  SUGGESTION = 'SUGGESTION',
  QUESTION = 'QUESTION',
  ISSUE = 'ISSUE',
  PRAISE = 'PRAISE'
}

export enum FeedbackCategoryType {
  FACTUAL_ACCURACY = 'FACTUAL_ACCURACY',
  TONE_AND_STYLE = 'TONE_AND_STYLE',
  ENGAGEMENT = 'ENGAGEMENT',
  CLARITY = 'CLARITY',
  COMPLETENESS = 'COMPLETENESS',
  BRAND_ALIGNMENT = 'BRAND_ALIGNMENT',
  TECHNICAL_ACCURACY = 'TECHNICAL_ACCURACY',
  CREATIVITY = 'CREATIVITY'
}

export interface WorkflowState {
  id: string;
  topic: string;
  status: WorkflowStatus;
  currentCycle: number;
  maxCycles: number;
  qualityThreshold: number;
  finalQualityScore?: number;
  humanReviewRequired: boolean;
  humanReviewProvided: boolean;
  humanReviewFeedback?: string;
  currentContent?: ContentPackage;
  currentAccuracyCritique?: AccuracyCritique;
  currentQualityCritique?: QualityCritique;
  agentStatus: Record<string, AgentStatus>;
  startedAt: Date;
  completedAt?: Date;
}

export interface AgentStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  lastExecution?: Date;
  executionTime?: number;
  errorMessage?: string;
}

export enum WorkflowStatus {
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  CONTENT_GENERATION = 'CONTENT_GENERATION',
  WEB_SEARCH_CRITIC = 'WEB_SEARCH_CRITIC',
  QUALITY_CRITIC = 'QUALITY_CRITIC',
  HUMAN_REVIEW = 'HUMAN_REVIEW',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum AgentType {
  CONTENT_GENERATOR = 'CONTENT_GENERATOR',
  WEB_SEARCH_CRITIC = 'WEB_SEARCH_CRITIC',
  QUALITY_CRITIC = 'QUALITY_CRITIC',
  WORKFLOW_MANAGER = 'WORKFLOW_MANAGER'
}

export enum VersionType {
  INITIAL = 'INITIAL',
  IMPROVED = 'IMPROVED',
  FINAL = 'FINAL'
}

export interface HumanReviewInput {
  action: ReviewAction;
  feedback?: string;
  customEdits?: CustomEdits;
  qualityRating?: number;
  feedbackCategories?: FeedbackCategory[];
  estimatedImprovementTime?: number;
}

export interface WorkflowStartInput {
  topic: string;
  maxCycles?: number;
  qualityThreshold?: number;
  model?: string;
}

// Venice AI Models that support structured responses for orchestration
export const SUPPORTED_VENICE_MODELS = [
  // Fast & Affordable
  {
    id: 'qwen3-4b',
    name: 'Venice Small (Qwen 3 4B)',
    description: 'Fast and efficient with structured responses',
    pricing: { input: 0.05, output: 0.15 },
    contextTokens: 32768,
    traits: ['fast', 'structured_responses', 'function_calling', 'reasoning'],
  },
  // Balanced Performance
  {
    id: 'mistral-31-24b',
    name: 'Venice Medium (Mistral 3.1 24B)',
    description: 'Balanced performance with vision support',
    pricing: { input: 0.5, output: 2 },
    contextTokens: 131072,
    traits: ['balanced', 'structured_responses', 'function_calling', 'vision'],
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    description: 'Default model with function calling',
    pricing: { input: 0.7, output: 2.8 },
    contextTokens: 131072,
    traits: ['default', 'function_calling'],
  },
  // Advanced Models
  {
    id: 'qwen3-235b',
    name: 'Venice Large 1.1 (Qwen 3 235B)',
    description: 'High quality with reasoning capabilities',
    pricing: { input: 0.45, output: 3.5 },
    contextTokens: 131072,
    traits: ['high_quality', 'structured_responses', 'function_calling', 'reasoning'],
  },
  {
    id: 'grok-41-fast',
    name: 'Grok 4.1 Fast',
    description: 'Fast reasoning with vision support',
    pricing: { input: 0.5, output: 1.25 },
    contextTokens: 262144,
    traits: ['fast', 'structured_responses', 'function_calling', 'reasoning', 'vision'],
  },
  {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    description: 'Deep reasoning optimized for code',
    pricing: { input: 0.75, output: 3.2 },
    contextTokens: 262144,
    traits: ['structured_responses', 'function_calling', 'reasoning', 'code'],
  },
  {
    id: 'zai-org-glm-4.6',
    name: 'GLM 4.6',
    description: 'Powerful function calling model',
    pricing: { input: 0.85, output: 2.75 },
    contextTokens: 202752,
    traits: ['structured_responses', 'function_calling'],
  },
  {
    id: 'deepseek-ai-DeepSeek-R1',
    name: 'DeepSeek R1',
    description: 'Strong reasoning with function calling',
    pricing: { input: 0.85, output: 2.75 },
    contextTokens: 131072,
    traits: ['structured_responses', 'function_calling'],
  },
  // Premium Models
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: 'Google\'s latest with reasoning & vision',
    pricing: { input: 2.5, output: 15 },
    contextTokens: 202752,
    traits: ['premium', 'structured_responses', 'function_calling', 'reasoning', 'vision'],
  },
  {
    id: 'claude-opus-45',
    name: 'Claude Opus 4.5',
    description: 'Anthropic\'s flagship with full capabilities',
    pricing: { input: 6, output: 30 },
    contextTokens: 202752,
    traits: ['premium', 'structured_responses', 'function_calling', 'reasoning', 'vision', 'code'],
  },
] as const;

export interface WorkflowResponse {
  success: boolean;
  workflowId: string;
  status: WorkflowStatus;
  message?: string;
  data?: any;
}

export interface AgentResponse {
  id: string;
  workflowRunId: string;
  agentType: AgentType;
  cycleNumber: number;
  input?: any;
  output: any;
  success: boolean;
  errorMessage?: string;
  executionTime?: number;
  tokensUsed?: number;
  createdAt: Date;
  updatedAt: Date;
}