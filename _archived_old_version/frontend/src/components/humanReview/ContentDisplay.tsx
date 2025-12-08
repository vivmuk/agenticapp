import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HumanReviewWithComments } from '@/stores/humanReviewStore';
import { ContentPackage } from '@/types';

interface ContentDisplayProps {
  content: ContentPackage;
  review?: HumanReviewWithComments;
  onEdit?: (contentType: 'definition' | 'linkedinPost' | 'imagePrompt', content: string) => void;
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({ content, review, onEdit }) => {
  const [activeContent, setActiveContent] = useState<'definition' | 'linkedinPost' | 'image'>('definition');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const handleDownload = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Generated Content</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1 { color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h2 { color: #2d3748; margin-top: 2rem; }
    .content-box { background: #f7fafc; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #edf2f7; }
    .image-container { margin-top: 1rem; }
    img { max-width: 100%; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .prompt { color: #718096; font-style: italic; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <h1>Content Output</h1>
  
  <h2>Definition</h2>
  <div class="content-box">
    ${content.definition}
  </div>

  <h2>LinkedIn Post</h2>
  <div class="content-box">
    ${content.linkedinPost.replace(/\n/g, '<br>')}
  </div>

  <h2>Generated Image</h2>
  <div class="image-container">
    ${content.imageUrl ? `<img src="${content.imageUrl}" alt="Generated Image" />` : '<p>No image generated</p>'}
    <p class="prompt">Prompt: ${content.imagePrompt}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEdit = (contentType: 'definition' | 'linkedinPost' | 'imagePrompt') => {
    let value = '';
    // Map the content types correctly
    if (contentType === 'definition') value = content.definition;
    if (contentType === 'linkedinPost') value = content.linkedinPost;
    if (contentType === 'imagePrompt') value = content.imagePrompt;

    setEditContent(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onEdit) {
      onEdit(activeContent as 'definition' | 'linkedinPost' | 'imagePrompt', editContent);
    }
    setIsEditing(false);
    setEditContent('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const renderContent = () => {
    switch (activeContent) {
      case 'definition':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Definition</h3>
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter definition..."
              />
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {content.definition}
                </p>
              </div>
            )}
          </div>
        );

      case 'linkedinPost':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">LinkedIn Post</h3>
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter LinkedIn post..."
              />
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {content.linkedinPost}
                </p>
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generated Image</h3>
            {content.imageUrl ? (
              <div className="space-y-4">
                <img
                  src={content.imageUrl}
                  alt="Generated content"
                  className="w-full max-w-md rounded-lg shadow-lg"
                />
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Image Prompt:</p>
                  <p className="text-gray-700 dark:text-gray-300 italic">
                    {content.imagePrompt}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">No image generated</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Content Type Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          {[
            { key: 'definition', label: 'Definition', icon: '📝' },
            { key: 'linkedinPost', label: 'LinkedIn Post', icon: '💼' },
            { key: 'image', label: 'Image', icon: '🖼️' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveContent(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${activeContent === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center space-x-1 px-3 py-1.5 mr-2 text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          title="Download as HTML"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download</span>
        </button>
      </div>

      {/* Content Display */}
      <div className="space-y-4">
        {renderContent()}

        {/* Edit Controls */}
        {!isEditing && activeContent !== 'image' && onEdit && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEdit(activeContent as 'definition' | 'linkedinPost')}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              Edit Content
            </button>
          </div>
        )}

        {/* Editing Controls */}
        {isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Quality Indicators */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Quality Assessment</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Current Quality Score:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {review?.qualityRating || 'Not rated'}/10
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Review Cycle:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              Cycle 3 of 3
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Content Length:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {content.definition.length} characters
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Last Modified:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {review?.updatedAt ? new Date(review.updatedAt).toLocaleString() : 'Unknown'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ContentDisplay;