import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { workflowService } from '@/services/apiService';

interface WorkflowStartFormProps {
  onWorkflowStarted: (workflowId: string) => void;
}

const WorkflowStartForm: React.FC<WorkflowStartFormProps> = ({ onWorkflowStarted }) => {
  const [topic, setTopic] = useState('');
  const [maxCycles, setMaxCycles] = useState(3);
  const [qualityThreshold, setQualityThreshold] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await workflowService.startWorkflow({
        topic: topic.trim(),
        maxCycles,
        qualityThreshold,
      });

      if (response.success && response.data?.workflowId) {
        onWorkflowStarted(response.data.workflowId);
        setTopic('');
      } else {
        setError(response.error || 'Failed to start workflow');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to start workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedTopics = [
    'The Future of Quantum Computing',
    'Climate Change Solutions in 2025',
    'AI Ethics and Governance',
    'Space Exploration Milestones',
    'Sustainable Energy Technologies',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-8 shadow-2xl border border-purple-500/20">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Start Content Generation</h2>
          <p className="text-gray-400">Enter a topic to begin the agentic workflow</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Input */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2">
              Topic
            </label>
            <div className="relative">
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Future of AI in Healthcare"
                className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.map((suggestion, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTopic(suggestion)}
                  className="px-3 py-1 text-xs bg-slate-800/50 border border-slate-700 rounded-full text-gray-400 hover:text-purple-300 hover:border-purple-500/50 transition-all"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-300 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Advanced Options
          </button>

          {/* Advanced Options */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Max Cycles */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Improvement Cycles: {maxCycles}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={maxCycles}
                    onChange={(e) => setMaxCycles(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>

                {/* Quality Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quality Threshold: {(qualityThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={qualityThreshold}
                    onChange={(e) => setQualityThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !topic.trim()}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
              isLoading || !topic.trim()
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting Workflow...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generate Content
              </span>
            )}
          </motion.button>
        </form>

        {/* Pipeline Preview */}
        <div className="mt-8 pt-6 border-t border-purple-500/20">
          <p className="text-xs text-gray-500 text-center mb-4">Agent Pipeline</p>
          <div className="flex items-center justify-center gap-2">
            {['Content Gen', 'Web Critic', 'Quality Check', 'Review'].map((step, idx) => (
              <div key={idx} className="flex items-center">
                <div className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-gray-400">
                  {step}
                </div>
                {idx < 3 && (
                  <svg className="w-4 h-4 text-purple-500/50 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WorkflowStartForm;

