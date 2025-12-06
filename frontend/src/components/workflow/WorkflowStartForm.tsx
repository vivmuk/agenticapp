import { useState } from 'react';
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
    'Future of Quantum Computing',
    'Climate Solutions 2025',
    'AI Ethics and Governance',
    'Space Exploration Milestones',
    'Sustainable Energy',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="topic" className="text-xs uppercase tracking-[0.2em] text-black/60">Topic</label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., The Future of AI in Healthcare"
          className="input-field"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-black/60">
          <span>Suggestions</span>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="underline-offset-4 underline text-black/60 hover:text-black"
          >
            {showAdvanced ? 'Hide advanced' : 'Show advanced'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedTopics.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTopic(suggestion)}
              className="text-xs px-3 py-1 border border-black/15 rounded-full hover:border-black/40 transition"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {showAdvanced && (
        <div className="space-y-4 border-t border-black/10 pt-4">
          <div>
            <div className="flex items-center justify-between text-xs text-black/60 mb-1">
              <span>Max cycles</span>
              <span>{maxCycles}</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={maxCycles}
              onChange={(e) => setMaxCycles(parseInt(e.target.value))}
              className="w-full accent-black"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-black/60 mb-1">
              <span>Quality threshold</span>
              <span>{(qualityThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={qualityThreshold}
              onChange={(e) => setQualityThreshold(parseFloat(e.target.value))}
              className="w-full accent-black"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 border border-red-200 rounded-lg p-2 bg-red-50">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !topic.trim()}
        className={`btn-primary w-full ${isLoading || !topic.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {isLoading ? 'Starting…' : 'Start Workflow'}
      </button>
    </form>
  );
};

export default WorkflowStartForm;

