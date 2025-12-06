import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
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
  FeedbackCategoryType,
  FeedbackCategory,
  CustomEdits
} from '@/types';

// Extended HumanReview interface for store state
export interface HumanReviewWithComments extends HumanReview {
  reviewComments?: ReviewComment[];
}


interface HumanReviewState {
  // Current review state
  currentReview: HumanReview | null;
  reviewQueue: ReviewQueueItem[];
  reviewHistory: HumanReview[];
  reviewMetrics: ReviewMetrics | null;
  
  // UI state
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  selectedComment: ReviewComment | null;
  activeTab: 'content' | 'critiques' | 'comments' | 'history';
  
  // Review session state
  sessionStartTime?: Date;
  autoSaveEnabled: boolean;
  lastSaveTime?: Date;
  unsavedChanges: boolean;
  
  // Actions
  setCurrentReview: (review: HumanReview | null) => void;
  setReviewQueue: (queue: ReviewQueueItem[]) => void;
  setReviewHistory: (history: HumanReview[]) => void;
  setReviewMetrics: (metrics: ReviewMetrics | null) => void;
  
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedComment: (comment: ReviewComment | null) => void;
  setActiveTab: (tab: 'content' | 'critiques' | 'comments' | 'history') => void;
  
  // Review actions
  startReviewSession: (reviewId: string) => void;
  endReviewSession: () => void;
  addComment: (comment: Omit<ReviewComment, 'id' | 'timestamp'>) => void;
  updateComment: (commentId: string, updates: Partial<ReviewComment>) => void;
  deleteComment: (commentId: string) => void;
  resolveComment: (commentId: string) => void;
  
  // Feedback actions
  updateFeedback: (feedback: string) => void;
  updateQualityRating: (rating: number) => void;
  updateFeedbackCategories: (categories: FeedbackCategory[]) => void;
  updateCustomEdits: (edits: CustomEdits) => void;
  
  // Submission actions
  submitReview: (action: ReviewAction) => Promise<void>;
  saveDraft: () => Promise<void>;
  discardChanges: () => void;
  
  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  triggerAutoSave: () => void;
}

export const useHumanReviewStore = create<HumanReviewState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentReview: null,
    reviewQueue: [],
    reviewHistory: [],
    reviewMetrics: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    selectedComment: null,
    activeTab: 'content',
    autoSaveEnabled: true,
    unsavedChanges: false,

    // Basic setters
    setCurrentReview: (review) => set({ currentReview: review }),
    setReviewQueue: (queue) => set({ reviewQueue: queue }),
    setReviewHistory: (history) => set({ reviewHistory: history }),
    setReviewMetrics: (metrics) => set({ reviewMetrics: metrics }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    setSubmitting: (submitting) => set({ isSubmitting: submitting }),
    setError: (error) => set({ error }),
    setSelectedComment: (comment) => set({ selectedComment: comment }),
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Review session management
    startReviewSession: (reviewId) => {
      set({
        sessionStartTime: new Date(),
        unsavedChanges: false,
        error: null,
      });
    },

    endReviewSession: () => {
      set({
        sessionStartTime: undefined,
        lastSaveTime: undefined,
        unsavedChanges: false,
        selectedComment: null,
      });
    },

    // Comment management
    addComment: (commentData) => {
      const currentReview = get().currentReview;
      if (!currentReview) return;

      const newComment: ReviewComment = {
        ...commentData,
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      set((state) => ({
        currentReview: state.currentReview ? {
          ...state.currentReview,
          reviewComments: [...(state.currentReview.reviewComments || []), newComment],
        } : null,
        unsavedChanges: true,
      }));
    },

    updateComment: (commentId, updates) => {
      set((state) => ({
        currentReview: state.currentReview ? {
          ...state.currentReview,
          reviewComments: state.currentReview.reviewComments?.map(comment =>
            comment.id === commentId ? { ...comment, ...updates } : comment
          ),
        } : null,
        unsavedChanges: true,
      }));
    },

    deleteComment: (commentId) => {
      set((state) => ({
        currentReview: state.currentReview ? {
          ...state.currentReview,
          reviewComments: state.currentReview.reviewComments?.filter(comment => comment.id !== commentId),
        } : null,
        unsavedChanges: true,
      }));
    },

    resolveComment: (commentId) => {
      set((state) => ({
        currentReview: state.currentReview ? {
          ...state.currentReview,
          reviewComments: state.currentReview.reviewComments?.map(comment =>
            comment.id === commentId ? { ...comment, resolved: true } : comment
          ),
        } : null,
        unsavedChanges: true,
      }));
    },

    // Feedback management
    updateFeedback: (feedback) => {
      set((state) => ({
        currentReview: state.currentReview ? {
          ...state.currentReview,
          feedback,
        } : null,
        unsavedChanges: true,
      }));
    },

    updateQualityRating: (rating) => {
      set((state) => ({
        currentReview: state.currentReview ? {
          ...state.currentReview,
          qualityRating: rating,
        } : null,
        unsavedChanges: true,
      }));
    },

    updateFeedbackCategories: (categories) => {
      set((state) => ({
        currentReview: state.currentReview ? {
          ...state.currentReview,
          feedbackCategories: categories,
        } : null,
        unsavedChanges: true,
      }));
    },

    updateCustomEdits: (edits) => {
      set((state) => ({
        currentReview: state.currentReview ? {
          ...state.currentReview,
          customEdits: edits,
        } : null,
        unsavedChanges: true,
      }));
    },

    // Submission actions
    submitReview: async (action) => {
      const { currentReview } = get();
      if (!currentReview) {
        set({ error: 'No active review to submit' });
        return;
      }

      set({ isSubmitting: true, error: null });

      try {
        // API call would go here
        const response = await fetch(`/api/workflows/${currentReview.workflowId}/human-review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            feedback: currentReview.feedback,
            customEdits: currentReview.customEdits,
            qualityRating: currentReview.qualityRating,
            feedbackCategories: currentReview.feedbackCategories,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit review');
        }

        const result = await response.json();
        
        set({
          currentReview: { ...currentReview, action, status: HumanReviewStatus.COMPLETED },
          isSubmitting: false,
          unsavedChanges: false,
        });

        // End the session
        get().endReviewSession();
      } catch (error) {
        set({
          error: (error as Error).message,
          isSubmitting: false,
        });
      }
    },

    saveDraft: async () => {
      const { currentReview } = get();
      if (!currentReview) return;

      set({ isLoading: true, error: null });

      try {
        // API call to save draft
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
        
        set({
          lastSaveTime: new Date(),
          isLoading: false,
          unsavedChanges: false,
        });
      } catch (error) {
        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    discardChanges: () => {
      set({
        unsavedChanges: false,
        error: null,
      });
    },

    // Auto-save management
    enableAutoSave: () => set({ autoSaveEnabled: true }),
    disableAutoSave: () => set({ autoSaveEnabled: false }),
    
    triggerAutoSave: () => {
      const { autoSaveEnabled, unsavedChanges, isLoading } = get();
      if (autoSaveEnabled && unsavedChanges && !isLoading) {
        get().saveDraft();
      }
    },
  }))
);

// Auto-save effect
let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

export const startAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  autoSaveInterval = setInterval(() => {
    useHumanReviewStore.getState().triggerAutoSave();
  }, 30000); // Auto-save every 30 seconds
};

export const stopAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
};

// Cleanup on unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', stopAutoSave);
}

export default useHumanReviewStore;