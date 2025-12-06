import { useState } from 'react';
import { workflowService } from '@/services/apiService';
import { SUPPORTED_VENICE_MODELS } from '@/types';

interface WorkflowStartFormProps {
  onWorkflowStarted: (workflowId: string) => void;
}

type OutputFormat = 'linkedin_post' | 'thread' | 'article';

const WorkflowStartForm: React.FC<WorkflowStartFormProps> = ({ onWorkflowStarted }) => {
  const [topic, setTopic] = useState('');
  const [maxCycles, setMaxCycles] = useState(3);
  const [qualityThreshold, setQualityThreshold] = useState(0.8);
  const [model, setModel] = useState('qwen3-4b');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('linkedin_post');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options checkboxes
  const [generateImage, setGenerateImage] = useState(true);
  const [factCheck, setFactCheck] = useState(true);
  const [qualityReview, setQualityReview] = useState(true);

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
        model,
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

  const selectedModel = SUPPORTED_VENICE_MODELS.find(m => m.id === model);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Topic Input */}
      <div className="space-y-3">
        <label htmlFor="topic" className="form-label">
          Post Topic
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., The Future of AI in Healthcare"
          className="input-field text-lg"
          disabled={isLoading}
        />
      </div>

      {/* Topic Suggestions */}
      <div className="space-y-3">
        <span className="form-label">Quick Topics</span>
        <div className="flex flex-wrap gap-2">
          {suggestedTopics.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTopic(suggestion)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg
                         hover:bg-gray-200 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Output Format */}
      <div className="space-y-3">
        <label className="form-label">Output Format</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setOutputFormat('linkedin_post')}
            className={`format-card text-left ${outputFormat === 'linkedin_post' ? 'selected' : ''}`}
          >
            <div className="format-card-title">LinkedIn Post</div>
            <div className="format-card-desc">Single viral post with image.</div>
          </button>
          <button
            type="button"
            onClick={() => setOutputFormat('thread')}
            className={`format-card text-left ${outputFormat === 'thread' ? 'selected' : ''}`}
          >
            <div className="format-card-title">Thread</div>
            <div className="format-card-desc">Multi-part thread series.</div>
          </button>
          <button
            type="button"
            onClick={() => setOutputFormat('article')}
            className={`format-card text-left ${outputFormat === 'article' ? 'selected' : ''}`}
          >
            <div className="format-card-title">Article</div>
            <div className="format-card-desc">Long-form LinkedIn article.</div>
          </button>
        </div>
      </div>

      {/* AI Model Selection */}
      <div className="space-y-3">
        <label htmlFor="model" className="form-label">
          AI Model
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="input-field"
          disabled={isLoading}
        >
          <optgroup label="Fast & Affordable">
            {SUPPORTED_VENICE_MODELS.filter(m => m.traits.includes('fast') && !m.traits.includes('premium')).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} - ${m.pricing.input}/${m.pricing.output}
              </option>
            ))}
          </optgroup>
          <optgroup label="Balanced Performance">
            {SUPPORTED_VENICE_MODELS.filter(m => (m.traits.includes('balanced') || m.traits.includes('default')) && !m.traits.includes('premium')).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} - ${m.pricing.input}/${m.pricing.output}
              </option>
            ))}
          </optgroup>
          <optgroup label="Advanced Models">
            {SUPPORTED_VENICE_MODELS.filter(m => (m.traits.includes('high_quality') || m.traits.includes('reasoning') || m.traits.includes('code')) && !m.traits.includes('premium') && !m.traits.includes('fast') && !m.traits.includes('balanced') && !m.traits.includes('default')).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} - ${m.pricing.input}/${m.pricing.output}
              </option>
            ))}
          </optgroup>
          <optgroup label="Premium Models">
            {SUPPORTED_VENICE_MODELS.filter(m => m.traits.includes('premium')).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} - ${m.pricing.input}/${m.pricing.output}
              </option>
            ))}
          </optgroup>
        </select>
        {selectedModel && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {selectedModel.traits.includes('structured_responses') && (
              <span className="tag tag-green">Structured</span>
            )}
            {selectedModel.traits.includes('reasoning') && (
              <span className="tag tag-gray">Reasoning</span>
            )}
            {selectedModel.traits.includes('vision') && (
              <span className="tag tag-gray">Vision</span>
            )}
            {selectedModel.traits.includes('code') && (
              <span className="tag tag-gray">Code</span>
            )}
            {selectedModel.traits.includes('premium') && (
              <span className="tag tag-red">Premium</span>
            )}
            <span className="text-gray-500 ml-2">
              {selectedModel.contextTokens.toLocaleString()} context
            </span>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="form-label">Options</label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={generateImage}
              onChange={(e) => setGenerateImage(e.target.checked)}
              className="checkbox-custom"
            />
            <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              Generate Image
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={factCheck}
              onChange={(e) => setFactCheck(e.target.checked)}
              className="checkbox-custom"
            />
            <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              Fact Check
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={qualityReview}
              onChange={(e) => setQualityReview(e.target.checked)}
              className="checkbox-custom"
            />
            <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              Quality Review
            </span>
          </label>
        </div>
      </div>

      {/* Advanced Settings */}
      <details className="space-y-4">
        <summary className="form-label cursor-pointer select-none">
          Advanced Settings
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium uppercase tracking-wide">Max Cycles</span>
              <span className="font-bold">{maxCycles}</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={maxCycles}
              onChange={(e) => setMaxCycles(parseInt(e.target.value))}
              className="w-full accent-red-600 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium uppercase tracking-wide">Quality Threshold</span>
              <span className="font-bold">{(qualityThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={qualityThreshold}
              onChange={(e) => setQualityThreshold(parseFloat(e.target.value))}
              className="w-full accent-red-600 h-2 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </details>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !topic.trim()}
        className="btn-red w-full py-4 text-base"
      >
        {isLoading ? 'Creating Post...' : 'Create LinkedIn Post'}
      </button>
    </form>
  );
};

export default WorkflowStartForm;
