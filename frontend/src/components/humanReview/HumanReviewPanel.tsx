import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useHumanReviewStore } from '@/stores/humanReviewStore';
import { HumanReviewStatus, ReviewPriority, ReviewAction, ReviewQueueItem } from '@/types';
import ContentDisplay from './ContentDisplay';
import CritiqueSummary from './CritiqueSummary';
import DecisionControls from './DecisionControls';
import ReviewHistory from './ReviewHistory';
import ReviewQueue from './ReviewQueue';

interface HumanReviewPanelProps {
  workflowId?: string;
  onClose?: () => void;
}

const HumanReviewPanel: React.FC<HumanReviewPanelProps> = ({ workflowId, onClose }) => {
  const {
    currentReview,
    reviewQueue,
    reviewHistory,
    isLoading,
    isSubmitting,
    error,
    activeTab,
    setActiveTab,
    setCurrentReview,
    setReviewQueue,
    setReviewHistory,
    startReviewSession,
    endReviewSession,
    submitReview,
  } = useHumanReviewStore();

  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    // Load review data when component mounts
    loadReviewData();

    return () => {
      endReviewSession();
    };
  }, [workflowId]);

  const loadReviewData = async () => {
    try {
      // Load current review if workflowId is provided
      if (workflowId) {
        const reviewResponse = await fetch(`/api/workflows/${workflowId}`);
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json();
          if (reviewData.data?.humanReview) {
            setCurrentReview(reviewData.data.humanReview);
          }
        }

        // Load review history for this workflow
        const historyResponse = await fetch(`/api/human-review/${workflowId}/history`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setReviewHistory(historyData.data?.reviewHistory || []);
        }

        startReviewSession(workflowId);
      }

      // Always load review queue
      const queueResponse = await fetch('/api/human-review/queue');
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        setReviewQueue(queueData.data?.queue || []);
      }
    } catch (error) {
      console.error('Failed to load review data:', error);
    }
  };

  const handleSubmitReview = async (action: ReviewAction) => {
    await submitReview(action);
    if (onClose) {
      onClose();
    }
  };

  const getStatusColor = (status: HumanReviewStatus) => {
    switch (status) {
      case HumanReviewStatus.PENDING:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case HumanReviewStatus.ASSIGNED:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case HumanReviewStatus.IN_PROGRESS:
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case HumanReviewStatus.COMPLETED:
        return 'text-green-600 bg-green-50 border-green-200';
      case HumanReviewStatus.ESCALATED:
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: ReviewPriority) => {
    switch (priority) {
      case ReviewPriority.URGENT:
        return 'text-red-600 bg-red-50';
      case ReviewPriority.HIGH:
        return 'text-orange-600 bg-orange-50';
      case ReviewPriority.MEDIUM:
        return 'text-yellow-600 bg-yellow-50';
      case ReviewPriority.LOW:
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading && !currentReview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg"
    >
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Human Review
            </h1>
            {currentReview && (
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentReview.status)}`}>
                  {currentReview.status.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(currentReview.priority)}`}>
                  {currentReview.priority}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowQueue(!showQueue)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {showQueue ? 'Hide Queue' : 'Show Queue'} ({reviewQueue.length})
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Review Info */}
        {currentReview && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Reviewer:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {currentReview.reviewerName || 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Trigger Reason:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {currentReview.triggerReason.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {currentReview.dueDate ? new Date(currentReview.dueDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 flex space-x-1">
          {['content', 'critiques', 'comments', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Queue Sidebar */}
        {showQueue && (
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <ReviewQueue onReviewSelect={(queueItem: ReviewQueueItem) => {
              // Load the full review data when selecting from queue
              fetch(`/api/workflows/${queueItem.workflowId}`)
                .then(res => res.json())
                .then(data => {
                  if (data.data?.humanReview) {
                    setCurrentReview(data.data.humanReview);
                  }
                })
                .catch(err => console.error('Failed to load review:', err));
            }} />
          </div>
        )}

        {/* Review Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'content' && currentReview && (
              <ContentDisplay review={currentReview} />
            )}
            {activeTab === 'critiques' && currentReview && (
              <CritiqueSummary review={currentReview} />
            )}
            {activeTab === 'comments' && currentReview && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Review Comments</h3>
                {/* Comments component would go here */}
                <div className="text-gray-500 dark:text-gray-400">Comments feature coming soon...</div>
              </div>
            )}
            {activeTab === 'history' && (
              <ReviewHistory workflowId={workflowId} history={reviewHistory} />
            )}
          </div>

          {/* Decision Controls */}
          {currentReview && currentReview.status !== HumanReviewStatus.COMPLETED && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
              <DecisionControls
                review={currentReview}
                onSubmit={handleSubmitReview}
                isSubmitting={isSubmitting}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default HumanReviewPanel;