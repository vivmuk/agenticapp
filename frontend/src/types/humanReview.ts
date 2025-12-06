// Human Review System Types

export interface HumanReviewInterface {
  workflowId: string;
  reviewStatus: ReviewStatus;
  assignedReviewer?: string;
  reviewStartTime?: Date;
  reviewCompletionTime?: Date;
  priority: ReviewPriority;
  triggerReason: TriggerReason;
}

export enum ReviewStatus {
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

export interface ReviewContent {
  definition: string;
  linkedinPost: string;
  imagePrompt: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface ReviewCritique {
  accuracyCritique: {
    accuracyScore: number;
    verifiedClaims: Claim[];
    disputedClaims: Claim[];
    sources: Source[];
    recommendations: string[];
    confidenceScore: number;
  };
  qualityCritique: {
    overallScore: number;
    coherenceScore: number;
    engagementScore: number;
    accuracyScore: number;
    improvements: Improvement[];
    finalRecommendation: 'accept' | 'improve' | 'reject';
    reasoning: string;
  };
}

export interface Claim {
  statement: string;
  isVerified: boolean;
  confidence: number;
  sources: string[];
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
  reliability: number;
}

export interface Improvement {
  type: 'definition' | 'linkedinPost' | 'imagePrompt' | 'general';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export interface ReviewDecision {
  action: ReviewAction;
  feedback?: string;
  customEdits?: CustomEdits;
  qualityRating?: number;
  feedbackCategories?: FeedbackCategory[];
  estimatedImprovementTime?: number;
}

export enum ReviewAction {
  ACCEPT = 'ACCEPT',
  IMPROVE = 'IMPROVE',
  REJECT = 'REJECT'
}

export interface CustomEdits {
  definition?: string;
  linkedinPost?: string;
  imagePrompt?: string;
}

export interface FeedbackCategory {
  category: FeedbackCategoryType;
  rating: number;
  comments?: string;
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

export interface ReviewComment {
  id: string;
  contentId: string;
  contentType: 'definition' | 'linkedinPost' | 'imagePrompt';
  text: string;
  selection: TextSelection;
  type: CommentType;
  author: string;
  timestamp: Date;
  resolved: boolean;
  replies?: ReviewComment[];
}

export interface TextSelection {
  start: number;
  end: number;
  selectedText: string;
}

export enum CommentType {
  SUGGESTION = 'SUGGESTION',
  QUESTION = 'QUESTION',
  ISSUE = 'ISSUE',
  PRAISE = 'PRAISE'
}

export interface ReviewHistory {
  id: string;
  workflowId: string;
  reviewerId: string;
  reviewerName: string;
  action: ReviewAction;
  feedback: string;
  qualityRating: number;
  timeSpent: number; // in minutes
  timestamp: Date;
  cycleNumber: number;
  previousQualityScore: number;
  newQualityScore?: number;
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
  timeInQueue: number; // in minutes
  dueDate?: Date;
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
  reviewerPerformance: ReviewerPerformance[];
}

export interface ReviewerPerformance {
  reviewerId: string;
  reviewerName: string;
  totalReviews: number;
  averageReviewTime: number;
  averageQualityRating: number;
  accuracyScore: number;
  reliabilityScore: number;
}

export interface ReviewNotification {
  id: string;
  type: NotificationType;
  workflowId: string;
  recipientId: string;
  message: string;
  priority: ReviewPriority;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export enum NotificationType {
  REVIEW_ASSIGNED = 'REVIEW_ASSIGNED',
  REVIEW_ESCALATED = 'REVIEW_ESCALATED',
  REVIEW_COMPLETED = 'REVIEW_COMPLETED',
  REVIEW_OVERDUE = 'REVIEW_OVERDUE',
  QUALITY_ALERT = 'QUALITY_ALERT'
}

export interface ReviewAnalytics {
  timeSeriesData: QualityTrendData[];
  decisionPatterns: DecisionPatternData[];
  categoryInsights: CategoryInsightData[];
  performanceMetrics: PerformanceMetricData[];
}

export interface QualityTrendData {
  date: string;
  averageQualityScore: number;
  reviewCount: number;
  improvementRate: number;
}

export interface DecisionPatternData {
  period: string;
  acceptRate: number;
  improveRate: number;
  rejectRate: number;
  averageQualityScore: number;
}

export interface CategoryInsightData {
  category: FeedbackCategoryType;
  frequency: number;
  averageRating: number;
  improvementTrend: number;
}

export interface PerformanceMetricData {
  reviewerId: string;
  reviewerName: string;
  efficiency: number;
  accuracy: number;
  consistency: number;
  speed: number;
}

export interface ReviewSession {
  id: string;
  workflowId: string;
  reviewerId: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  autoSaveEnabled: boolean;
  lastSaveTime?: Date;
  currentContent?: ReviewContent;
  currentDecision?: Partial<ReviewDecision>;
  comments: ReviewComment[];
}

export interface ReviewComparison {
  currentVersion: ReviewContent;
  previousVersion: ReviewContent;
  changes: ContentChange[];
  qualityDelta: number;
}

export interface ContentChange {
  type: 'definition' | 'linkedinPost' | 'imagePrompt';
  changeType: 'addition' | 'deletion' | 'modification';
  oldValue?: string;
  newValue?: string;
  description: string;
}

export interface ReviewTemplate {
  id: string;
  name: string;
  description: string;
  feedbackCategories: FeedbackCategoryType[];
  defaultQualityThreshold: number;
  autoAssignRules: AutoAssignRule[];
}

export interface AutoAssignRule {
  condition: string;
  priority: ReviewPriority;
  assignTo?: string;
  escalateAfter?: number; // minutes
}

export interface ReviewConfiguration {
  enableAutoAssign: boolean;
  defaultReviewTimeout: number; // minutes
  escalationRules: EscalationRule[];
  notificationSettings: NotificationSettings;
  qualityThresholds: QualityThresholds;
}

export interface EscalationRule {
  triggerCondition: string;
  escalateTo: string;
  timeLimit: number; // minutes
}

export interface NotificationSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  slackNotifications: boolean;
  notificationFrequency: 'immediate' | 'batched' | 'daily';
}

export interface QualityThresholds {
  minimumAcceptable: number;
  targetQuality: number;
  excellenceThreshold: number;
}