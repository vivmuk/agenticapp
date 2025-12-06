import { motion } from 'framer-motion';
import {
  HumanReview,
  HumanReviewStatus,
  ReviewAction,
  ReviewPriority,
  TriggerReason,
  FeedbackCategoryType
} from '@/types';

interface ReviewHistoryProps {
  workflowId?: string;
  history?: HumanReview[];
}

const ReviewHistory: React.FC<ReviewHistoryProps> = ({ workflowId = '', history = [] }) => {
  const _getStatusColor = (status: HumanReviewStatus) => {
    switch (status) {
      case HumanReviewStatus.PENDING:
        return 'text-yellow-600 bg-yellow-50';
      case HumanReviewStatus.ASSIGNED:
        return 'text-blue-600 bg-blue-50';
      case HumanReviewStatus.IN_PROGRESS:
        return 'text-purple-600 bg-purple-50';
      case HumanReviewStatus.COMPLETED:
        return 'text-green-600 bg-green-50';
      case HumanReviewStatus.ESCALATED:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionColor = (action: ReviewAction) => {
    switch (action) {
      case ReviewAction.ACCEPT:
        return 'text-green-600 bg-green-50 border-green-200';
      case ReviewAction.IMPROVE:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case ReviewAction.REJECT:
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionLabel = (action: ReviewAction) => {
    switch (action) {
      case ReviewAction.ACCEPT:
        return 'Accepted';
      case ReviewAction.IMPROVE:
        return 'Sent for Improvement';
      case ReviewAction.REJECT:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  // Mock history data if none provided
  const mockHistory: HumanReview[] = history.length > 0 ? history : [
    {
      id: 'review-1',
      workflowId: workflowId,
      reviewerId: 'reviewer-1',
      reviewerName: 'John Doe',
      status: HumanReviewStatus.COMPLETED,
      priority: ReviewPriority.MEDIUM,
      triggerReason: TriggerReason.MAX_CYCLES_REACHED,
      action: ReviewAction.IMPROVE,
      feedback: 'Content needs better examples and more recent references. The definition is accurate but lacks depth.',
      qualityRating: 6,
      feedbackCategories: [
        { category: FeedbackCategoryType.FACTUAL_ACCURACY, rating: 8, comments: 'Good factual basis' },
        { category: FeedbackCategoryType.ENGAGEMENT, rating: 5, comments: 'Needs more engaging examples' },
      ],
      reviewStartTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      reviewCompletionTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      estimatedReviewTime: 15,
      timeSpent: 30,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    },
    {
      id: 'review-2',
      workflowId: workflowId,
      reviewerId: 'reviewer-2',
      reviewerName: 'Jane Smith',
      status: HumanReviewStatus.COMPLETED,
      priority: ReviewPriority.HIGH,
      triggerReason: TriggerReason.QUALITY_THRESHOLD_NOT_MET,
      action: ReviewAction.ACCEPT,
      feedback: 'Much improved after the first review. The examples are now relevant and the content is comprehensive.',
      qualityRating: 8,
      feedbackCategories: [
        { category: FeedbackCategoryType.FACTUAL_ACCURACY, rating: 9, comments: 'Excellent accuracy' },
        { category: FeedbackCategoryType.ENGAGEMENT, rating: 8, comments: 'Much more engaging' },
        { category: FeedbackCategoryType.CLARITY, rating: 8, comments: 'Clear and well-structured' },
      ],
      reviewStartTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      reviewCompletionTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      estimatedReviewTime: 20,
      timeSpent: 20,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
    },
  ];

  const totalTimeSpent = mockHistory.reduce((acc, review) => acc + (review.timeSpent || 0), 0);
  const averageQualityRating = mockHistory.reduce((acc, review) => acc + (review.qualityRating || 0), 0) / mockHistory.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {mockHistory.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Reviews</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(averageQualityRating * 10) / 10}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Avg Quality</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(totalTimeSpent)}m
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Time</div>
        </div>
      </div>

      {/* Review Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Timeline</h3>
        
        {mockHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No review history available</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            
            {mockHistory.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start space-x-4 pb-8"
              >
                {/* Timeline Dot */}
                <div className={`relative z-10 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                  review.action === ReviewAction.ACCEPT ? 'bg-green-500' :
                  review.action === ReviewAction.IMPROVE ? 'bg-blue-500' :
                  'bg-red-500'
                }`}></div>

                {/* Review Card */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.reviewerName || 'Anonymous Reviewer'}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getActionColor(review.action!)}`}>
                          {getActionLabel(review.action!)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{review.reviewCompletionTime ? new Date(review.reviewCompletionTime).toLocaleString() : 'Unknown'}</span>
                        <span>•</span>
                        <span>{review.timeSpent || 0} minutes</span>
                        {review.qualityRating && (
                          <>
                            <span>•</span>
                            <span>Quality: {review.qualityRating}/10</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {review.feedback && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{review.feedback}</p>
                    </div>
                  )}

                  {review.feedbackCategories && review.feedbackCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {review.feedbackCategories.map((category, catIndex) => (
                        <div
                          key={catIndex}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md"
                        >
                          <span className="text-gray-600 dark:text-gray-400">
                            {category.category.replace(/_/g, ' ')}:
                          </span>
                          <span className="ml-1 font-medium text-gray-900 dark:text-white">
                            {category.rating}/10
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Review Details */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Trigger:</span> {review.triggerReason.replace(/_/g, ' ')}
                    </div>
                    <div>
                      <span className="font-medium">Priority:</span> {review.priority}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {review.status.replace(/_/g, ' ')}
                    </div>
                    <div>
                      <span className="font-medium">Estimated:</span> {review.estimatedReviewTime || 0}m
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quality Trend */}
      {mockHistory.length > 1 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Quality Improvement Trend</h3>
          <div className="flex items-end space-x-2 h-16">
            {mockHistory.map((review, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(review.qualityRating || 0) * 10}%` }}
                ></div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Review {index + 1}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Start: {mockHistory[0]?.qualityRating || 0}/10</span>
            <span>Current: {mockHistory[mockHistory.length - 1]?.qualityRating || 0}/10</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReviewHistory;