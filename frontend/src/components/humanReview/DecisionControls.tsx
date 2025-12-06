import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HumanReviewWithComments, ReviewAction, FeedbackCategoryType } from '@/stores/humanReviewStore';

interface DecisionControlsProps {
  review: HumanReviewWithComments;
  onSubmit: (action: ReviewAction) => void;
  isSubmitting: boolean;
}

const DecisionControls: React.FC<DecisionControlsProps> = ({ review, onSubmit, isSubmitting }) => {
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [feedback, setFeedback] = useState(review.feedback || '');
  const [qualityRating, setQualityRating] = useState(review.qualityRating || 5);
  const [feedbackCategories, setFeedbackCategories] = useState<Record<FeedbackCategoryType, number>>(
    review.feedbackCategories?.reduce((acc, cat) => ({ ...acc, [cat.category]: cat.rating }), {} as Record<FeedbackCategoryType, number>) || 
    {} as Record<FeedbackCategoryType, number>
  );

  const handleSubmit = () => {
    if (!selectedAction) {
      alert('Please select an action (Accept, Improve, or Reject)');
      return;
    }

    // Update review with feedback data
    const categories = Object.entries(feedbackCategories).map(([category, rating]) => ({
      category: category as FeedbackCategoryType,
      rating,
    }));

    // Submit the review
    onSubmit(selectedAction);
  };

  const handleCategoryRating = (category: FeedbackCategoryType, rating: number) => {
    setFeedbackCategories(prev => ({
      ...prev,
      [category]: rating,
    }));
  };

  const getActionButtonStyles = (action: ReviewAction) => {
    const baseStyles = "flex-1 px-6 py-3 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    switch (action) {
      case ReviewAction.ACCEPT:
        return `${baseStyles} ${
          selectedAction === action
            ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-500 ring-offset-2'
            : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
        } focus:ring-green-500`;
      case ReviewAction.IMPROVE:
        return `${baseStyles} ${
          selectedAction === action
            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-500 ring-offset-2'
            : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
        } focus:ring-blue-500`;
      case ReviewAction.REJECT:
        return `${baseStyles} ${
          selectedAction === action
            ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-500 ring-offset-2'
            : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
        } focus:ring-red-500`;
      default:
        return baseStyles;
    }
  };

  const getCategoryLabel = (category: FeedbackCategoryType): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Action Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Decision</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setSelectedAction(ReviewAction.ACCEPT)}
            className={getActionButtonStyles(ReviewAction.ACCEPT)}
            disabled={isSubmitting}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Accept</span>
            </div>
            <p className="text-xs mt-1 opacity-75">Content is ready</p>
          </button>

          <button
            onClick={() => setSelectedAction(ReviewAction.IMPROVE)}
            className={getActionButtonStyles(ReviewAction.IMPROVE)}
            disabled={isSubmitting}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Improve</span>
            </div>
            <p className="text-xs mt-1 opacity-75">Needs refinement</p>
          </button>

          <button
            onClick={() => setSelectedAction(ReviewAction.REJECT)}
            className={getActionButtonStyles(ReviewAction.REJECT)}
            disabled={isSubmitting}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Reject</span>
            </div>
            <p className="text-xs mt-1 opacity-75">Not suitable</p>
          </button>
        </div>
      </div>

      {/* Quality Rating */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Rating</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Rate the overall quality:</span>
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <button
                key={rating}
                onClick={() => setQualityRating(rating)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  rating <= qualityRating
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {qualityRating}/10
          </span>
        </div>
      </div>

      {/* Feedback Categories */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detailed Feedback</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.values(FeedbackCategoryType).map((category) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getCategoryLabel(category)}
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {feedbackCategories[category] || 0}/10
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={feedbackCategories[category] || 0}
                onChange={(e) => handleCategoryRating(category, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Text */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Additional Feedback
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            (Optional)
          </span>
        </h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Provide specific feedback for improvement..."
          className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {feedback.length}/500 characters
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedAction}
          className="px-8 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            `Submit ${selectedAction ? selectedAction.charAt(0) + selectedAction.slice(1).toLowerCase() : 'Review'}`
          )}
        </button>
      </div>

      {/* Review Summary */}
      {selectedAction && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
        >
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Review Summary</h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong>Action:</strong> {selectedAction}</p>
            <p><strong>Quality Rating:</strong> {qualityRating}/10</p>
            <p><strong>Categories Rated:</strong> {Object.keys(feedbackCategories).length}/8</p>
            {feedback && <p><strong>Feedback:</strong> {feedback.substring(0, 100)}{feedback.length > 100 ? '...' : ''}</p>}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DecisionControls;