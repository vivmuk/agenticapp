import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ContentEditorProps {
  content: string;
  contentType: 'definition' | 'linkedinPost' | 'imagePrompt';
  onSave: (content: string) => void;
  onCancel: () => void;
  placeholder?: string;
  maxLength?: number;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  content,
  contentType,
  onSave,
  onCancel,
  placeholder = '',
  maxLength = 500
}) => {
  const [editorContent, setEditorContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(content.length);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditorContent(content);
    setWordCount(content.length);
  }, [content]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editorContent]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxLength) {
      setEditorContent(newContent);
      setWordCount(newContent.length);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave(editorContent);
    } catch (error) {
      console.error('Failed to save content:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditorContent(content);
    setWordCount(content.length);
    onCancel();
  };

  const getEditorStyle = () => {
    switch (contentType) {
      case 'definition':
        return 'font-serif text-base leading-relaxed';
      case 'linkedinPost':
        return 'font-sans text-sm leading-normal whitespace-pre-wrap';
      case 'imagePrompt':
        return 'font-mono text-sm leading-normal italic';
      default:
        return 'font-sans text-base leading-normal';
    }
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (contentType) {
      case 'definition':
        return 'Enter a clear and concise definition...';
      case 'linkedinPost':
        return 'Write an engaging LinkedIn post with hashtags...';
      case 'imagePrompt':
        return 'Describe the image you want to generate...';
      default:
        return 'Enter content...';
    }
  };

  const getCharacterCountColor = () => {
    const percentage = (wordCount / maxLength) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-gray-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            Edit {contentType.replace(/([A-Z])/g, ' $1').trim()}
          </h3>
          <span className={`text-sm ${getCharacterCountColor()}`}>
            {wordCount}/{maxLength}
          </span>
        </div>
        
        {/* Character Progress Bar */}
        <div className="w-32 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-colors ${
              wordCount / maxLength >= 0.9 ? 'bg-red-500' :
              wordCount / maxLength >= 0.75 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min((wordCount / maxLength) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Ctrl+B</span>
          <span>Bold</span>
        </div>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Ctrl+I</span>
          <span>Italic</span>
        </div>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Ctrl+U</span>
          <span>Underline</span>
        </div>
      </div>

      {/* Textarea Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={editorContent}
          onChange={handleContentChange}
          placeholder={getPlaceholder()}
          className={`w-full p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden ${getEditorStyle()}`}
          rows={6}
          disabled={isSaving}
        />
        
        {/* Word count overlay */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
          {wordCount} characters
        </div>
      </div>

      {/* Editor Tips */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Editing Tips:</p>
            <ul className="space-y-1">
              {contentType === 'definition' && (
                <>
                  <li>• Use clear, concise language</li>
                  <li>• Include key characteristics</li>
                  <li>• Avoid jargon when possible</li>
                </>
              )}
              {contentType === 'linkedinPost' && (
                <>
                  <li>• Keep it under 300 characters</li>
                  <li>• Use 2-3 relevant hashtags</li>
                  <li>• Include a call-to-action</li>
                </>
              )}
              {contentType === 'imagePrompt' && (
                <>
                  <li>• Be specific about style</li>
                  <li>• Include color preferences</li>
                  <li>• Describe the mood/feeling</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {contentType === 'linkedinPost' && (
            <span>LinkedIn recommends posts under 300 characters for optimal engagement</span>
          )}
          {contentType === 'definition' && (
            <span>Aim for 50-200 words for a comprehensive definition</span>
          )}
          {contentType === 'imagePrompt' && (
            <span>Detailed prompts generate better images</span>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || editorContent.trim() === content.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Auto-save indicator */}
      {isSaving && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-blue-600 dark:text-blue-400"
        >
          Saving your changes...
        </motion.div>
      )}
    </motion.div>
  );
};

export default ContentEditor;