import React from 'react';
import { motion } from 'framer-motion';
import { HumanReviewWithComments } from '@/stores/humanReviewStore';

interface CritiqueSummaryProps {
  review: HumanReviewWithComments;
}

const CritiqueSummary: React.FC<CritiqueSummaryProps> = ({ review }) => {
  // Mock data for critiques - in real implementation this would come from the workflow
  const mockAccuracyCritique = {
    accuracyScore: 7.5,
    verifiedClaims: [
      { statement: "AI refers to machine intelligence", isVerified: true, confidence: 0.9, sources: ["Wikipedia", "Stanford AI Lab"] },
      { statement: "Machine learning is a subfield of AI", isVerified: true, confidence: 0.95, sources: ["MIT Technology Review"] },
    ],
    disputedClaims: [
      { statement: "AI can fully replicate human consciousness", isVerified: false, confidence: 0.3, sources: ["Nature", "Science"] },
    ],
    sources: [
      { title: "Artificial Intelligence: A Modern Approach", url: "https://example.com", snippet: "Comprehensive textbook on AI", reliability: 0.9 },
      { title: "Deep Learning by Ian Goodfellow", url: "https://example.com", snippet: "Foundational text on neural networks", reliability: 0.95 },
    ],
    recommendations: ["Add more specific examples", "Include recent developments", "Clarify terminology"],
    confidenceScore: 0.8,
  };

  const mockQualityCritique = {
    overallScore: 6.8,
    coherenceScore: 7.2,
    engagementScore: 6.5,
    accuracyScore: 7.5,
    improvements: [
      { type: 'definition', severity: 'medium', description: 'Definition lacks specific examples', suggestion: 'Add concrete examples of AI applications' },
      { type: 'linkedinPost', severity: 'low', description: 'Could be more engaging', suggestion: 'Add a question to encourage interaction' },
    ],
    finalRecommendation: 'improve',
    reasoning: 'Content is good but needs refinement for better engagement and clarity',
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Accuracy Critique */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Web Search Critic Assessment
        </h3>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accuracy Score</h4>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(mockAccuracyCritique.accuracyScore)}`}>
              {mockAccuracyCritique.accuracyScore}/10
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confidence</h4>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${mockAccuracyCritique.confidenceScore * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(mockAccuracyCritique.confidenceScore * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verified Claims</h4>
            <div className="space-y-2">
              {mockAccuracyCritique.verifiedClaims.map((claim, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{claim.statement}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Confidence: {Math.round(claim.confidence * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Disputed Claims</h4>
            <div className="space-y-2">
              {mockAccuracyCritique.disputedClaims.map((claim, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{claim.statement}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Confidence: {Math.round(claim.confidence * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sources</h4>
            <div className="space-y-2">
              {mockAccuracyCritique.sources.map((source, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">{source.title}</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{source.snippet}</p>
                    </div>
                    <div className="ml-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(source.reliability * 100)}% reliable
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quality Critique */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quality Critic Assessment
        </h3>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overall Quality</h4>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(mockQualityCritique.overallScore)}`}>
              {mockQualityCritique.overallScore}/10
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommendation</h4>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              mockQualityCritique.finalRecommendation === 'accept' ? 'text-green-600 bg-green-50' :
              mockQualityCritique.finalRecommendation === 'improve' ? 'text-yellow-600 bg-yellow-50' :
              'text-red-600 bg-red-50'
            }`}>
              {mockQualityCritique.finalRecommendation.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coherence</h4>
            <div className={`text-lg font-bold ${getScoreColor(mockQualityCritique.coherenceScore)}`}>
              {mockQualityCritique.coherenceScore}/10
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engagement</h4>
            <div className={`text-lg font-bold ${getScoreColor(mockQualityCritique.engagementScore)}`}>
              {mockQualityCritique.engagementScore}/10
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accuracy</h4>
            <div className={`text-lg font-bold ${getScoreColor(mockQualityCritique.accuracyScore)}`}>
              {mockQualityCritique.accuracyScore}/10
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Improvement Suggestions</h4>
            <div className="space-y-2">
              {mockQualityCritique.improvements.map((improvement, index) => (
                <div key={index} className={`p-3 border rounded-md ${getSeverityColor(improvement.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {improvement.type}
                      </h5>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{improvement.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{improvement.suggestion}</p>
                    </div>
                    <span className="ml-4 px-2 py-1 text-xs font-medium rounded-full bg-white dark:bg-gray-800">
                      {improvement.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reasoning</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {mockQualityCritique.reasoning}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CritiqueSummary;