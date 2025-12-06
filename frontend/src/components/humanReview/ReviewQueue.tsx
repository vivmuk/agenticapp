import { motion } from 'framer-motion';
import { ReviewQueueItem, ReviewPriority, TriggerReason } from '@/types';

interface ReviewQueueProps {
  queue?: ReviewQueueItem[];
  onReviewSelect?: (review: ReviewQueueItem) => void;
}

const ReviewQueue: React.FC<ReviewQueueProps> = ({ queue = [], onReviewSelect }) => {
  const getPriorityColor = (priority: ReviewPriority) => {
    switch (priority) {
      case ReviewPriority.URGENT:
        return 'text-red-600 bg-red-50 border-red-200';
      case ReviewPriority.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ReviewPriority.MEDIUM:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ReviewPriority.LOW:
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTimeInQueue = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTriggerReasonLabel = (reason: string) => {
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Mock data if no queue provided
  const mockQueue: ReviewQueueItem[] = queue.length > 0 ? queue : [
    {
      id: '1',
      workflowId: 'workflow-1',
      topic: 'Artificial Intelligence Overview',
      priority: ReviewPriority.HIGH,
      triggerReason: TriggerReason.MAX_CYCLES_REACHED,
      currentCycle: 3,
      maxCycles: 3,
      qualityScore: 6.5,
      estimatedReviewTime: 15,
      timeInQueue: 45,
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      workflowId: 'workflow-2',
      topic: 'Machine Learning Fundamentals',
      priority: ReviewPriority.MEDIUM,
      triggerReason: TriggerReason.QUALITY_THRESHOLD_NOT_MET,
      currentCycle: 2,
      maxCycles: 3,
      qualityScore: 5.8,
      estimatedReviewTime: 10,
      timeInQueue: 120,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Queue</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {mockQueue.length} items awaiting review
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {mockQueue.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No items in review queue</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {mockQueue.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onReviewSelect?.(item)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.topic}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.workflowId}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  <div>
                    <span className="font-medium">Quality:</span> {item.qualityScore}/10
                  </div>
                  <div>
                    <span className="font-medium">Cycle:</span> {item.currentCycle}/{item.maxCycles}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {getTimeInQueue(item.timeInQueue)}
                  </div>
                  <div>
                    <span className="font-medium">Est:</span> {item.estimatedReviewTime}m
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getTriggerReasonLabel(item.triggerReason)}
                    </span>
                  </div>
                  {item.dueDate && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Progress indicator */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full" 
                      style={{ width: `${(item.currentCycle / item.maxCycles) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Queue Stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Avg Wait Time:</span>
            <span className="ml-1 font-medium text-gray-900 dark:text-white">
              {mockQueue.length > 0 
                ? getTimeInQueue(Math.round(mockQueue.reduce((acc, item) => acc + item.timeInQueue, 0) / mockQueue.length))
                : '0m'
              }
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">High Priority:</span>
            <span className="ml-1 font-medium text-red-600">
              {mockQueue.filter(item => item.priority === ReviewPriority.HIGH || item.priority === ReviewPriority.URGENT).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueue;