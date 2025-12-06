// Basic types for the workflow system

export enum AgentType {
  CONTENT_GENERATOR = 'CONTENT_GENERATOR',
  WEB_SEARCH_CRITIC = 'WEB_SEARCH_CRITIC',
  QUALITY_CRITIC = 'QUALITY_CRITIC',
  WORKFLOW_MANAGER = 'WORKFLOW_MANAGER'
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

// Human Review System Types
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

export interface AgentStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  executionTime?: number;
  metrics?: Record<string, any>;
  errorMessage?: string;
  lastExecution?: Date;
}

export interface ContentVersion {
  id: string;
  cycle: number;
  contentType: 'definition' | 'linkedin_post' | 'image_prompt';
  content: string;
  qualityScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HumanReview {
  id: string;
  workflowId: string;
  reviewerId?: string;
  reviewerName?: string;
  status: HumanReviewStatus;
  priority: ReviewPriority;
  triggerReason: TriggerReason;
  action?: ReviewAction;
  feedback?: string;
  customEdits?: {
    definition?: string;
    linkedinPost?: string;
    imagePrompt?: string;
  };
  qualityRating?: number;
  feedbackCategories?: FeedbackCategory[];
  reviewStartTime?: Date;
  reviewCompletionTime?: Date;
  estimatedReviewTime?: number;
  timeSpent?: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  reviewComments?: ReviewComment[];
}

export interface ReviewComment {
  id: string;
  humanReviewId: string;
  contentType: 'definition' | 'linkedinPost' | 'imagePrompt';
  text: string;
  selection: {
    start: number;
    end: number;
    selectedText: string;
  };
  type: CommentType;
  author: string;
  timestamp: Date;
  resolved: boolean;
  parentId?: string;
}

export interface FeedbackCategory {
  category: FeedbackCategoryType;
  rating: number;
  comments?: string;
}

export interface ReviewQueueItem {
  id: string;
  workflowId: string;
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

export interface Workflow {
  id: string;
  status: WorkflowStatus;
  currentCycle: number;
  maxCycles: number;
  // Added to align with UI expectations
  topic: string;
  currentContent?: string;
  agentStatus: Record<AgentType, AgentStatus>;
  contentVersions: ContentVersion[];
  humanReviewRequired: boolean;
  humanReviewProvided: boolean;
  humanReviewFeedback?: string;
  finalQualityScore?: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
  humanReview?: HumanReview;
}

export interface WorkflowStartInput {
  // Topic to generate content for
  topic: string;
  // Optional controls
  maxCycles?: number;
  qualityThreshold?: number;
  enableHumanReview?: boolean;
  metadata?: Record<string, any>;
  model?: string;
}

// Venice AI Models that support structured responses for orchestration
export interface VeniceModel {
  id: string;
  name: string;
  description: string;
  pricing: { input: number; output: number };
  contextTokens: number;
  traits: string[];
}

export const SUPPORTED_VENICE_MODELS: VeniceModel[] = [
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
    description: "Google's latest with reasoning & vision",
    pricing: { input: 2.5, output: 15 },
    contextTokens: 202752,
    traits: ['premium', 'structured_responses', 'function_calling', 'reasoning', 'vision'],
  },
  {
    id: 'claude-opus-45',
    name: 'Claude Opus 4.5',
    description: "Anthropic's flagship with full capabilities",
    pricing: { input: 6, output: 30 },
    contextTokens: 202752,
    traits: ['premium', 'structured_responses', 'function_calling', 'reasoning', 'vision', 'code'],
  },
];

export interface HumanReviewInput {
  action: ReviewAction;
  feedback?: string;
  customEdits?: {
    definition?: string;
    linkedinPost?: string;
    imagePrompt?: string;
  };
  qualityRating?: number;
  feedbackCategories?: FeedbackCategory[];
  estimatedImprovementTime?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// React Flow specific types
export interface WorkflowNode {
  id: string;
  type: 'default';
  position: { x: number; y: number };
  data: {
    label: string;
    agentType: AgentType;
    status: 'idle' | 'running' | 'completed' | 'error';
    metrics?: Record<string, any>;
    errorMessage?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  data?: {
    label?: string;
  };
}

export interface VisualizationState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
}

// UI state
export interface UIState {
  isRealTimeConnected: boolean;
  darkMode: boolean;
  viewMode: 'canvas' | 'list';
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'workflow_update' | 'agent_status' | 'error';
  data: any;
}

export interface WorkflowUpdateMessage extends WebSocketMessage {
  type: 'workflow_update';
  data: {
    workflowId: string;
    workflow: Partial<Workflow>;
  };
}

export interface AgentStatusMessage extends WebSocketMessage {
  type: 'agent_status';
  data: {
    workflowId: string;
    agentType: AgentType;
    status: AgentStatus;
  };
}

export interface AgentActivity {
  id: string;
  workflowId: string;
  agentType: AgentType;
  action: string;
  timestamp: Date;
  details?: any;
}

// Component props
export interface CustomNodeData {
  label: string;
  agentType: AgentType;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress?: number;
  metrics?: Record<string, any>;
  errorMessage?: string;
}

export interface WorkflowControlsProps {
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onToggleDarkMode: () => void;
  onToggleView: () => void;
}

export interface NodeDetailsPanelProps {
  selectedNode: WorkflowNode | null;
  onClose: () => void;
}

// Chart data types
export interface QualityMetricsData {
  cycle: number;
  accuracy: number;
  quality: number;
  engagement: number;
  coherence: number;
}

export interface AgentMetricsData {
  agentType: AgentType;
  executionTime: number;
  successRate: number;
  avgQuality: number;
}

// API response types for frontend services
export interface WorkflowState {
  workflow: Workflow;
  isRunning: boolean;
  currentAccuracyCritique: {
    sources: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
    overallScore: number;
    feedback: string;
  };
  currentQualityCritique: {
    overallScore: number;
    feedback: string;
    recommendations: string[];
  };
  humanReviewProvided: boolean;
  humanReviewFeedback?: string;
}

// Content Package type for generated content
export interface ContentPackage {
  definition: string;
  linkedinPost: string;
  imagePrompt: string;
  imageUrl?: string;
  keyClaims: string[];
  metadata?: Record<string, any>;
}

// Additional types for Human Review
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

export interface CustomEdits {
  definition?: string;
  linkedinPost?: string;
  imagePrompt?: string;
}