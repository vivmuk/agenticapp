import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ReviewComment, CommentType } from '@/types';

interface InlineCommentingProps {
  content: string;
  contentType: 'definition' | 'linkedinPost' | 'imagePrompt';
  onAddComment: (comment: Omit<ReviewComment, 'id' | 'timestamp'>) => void;
  existingComments?: ReviewComment[];
  readOnly?: boolean;
}

const InlineCommenting: React.FC<InlineCommentingProps> = ({
  content,
  contentType,
  onAddComment,
  existingComments = [],
  readOnly = false
}) => {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<CommentType>(CommentType.SUGGESTION);
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim() && contentRef.current) {
        const range = selection.getRangeAt(0);
        const preSelectionRange = range.cloneRange();
        const preCaretRange = range.cloneRange();
        
        preCaretRange.selectNodeContents(contentRef.current);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const start = preCaretRange.toString().length;
        
        preSelectionRange.selectNodeContents(contentRef.current);
        preSelectionRange.setEnd(range.endContainer, range.endOffset);
        const end = preSelectionRange.toString().length;

        setSelectedText(selection.toString());
        setSelectionRange({ start, end });
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  const handleAddComment = () => {
    if (selectedText && selectionRange && commentText.trim()) {
      onAddComment({
        contentType,
        text: commentText,
        selection: {
          start: selectionRange.start,
          end: selectionRange.end,
          selectedText,
        },
        type: commentType,
        author: 'Current User', // Would come from auth context
        resolved: false,
      });

      // Reset state
      setSelectedText('');
      setSelectionRange(null);
      setCommentText('');
      setShowCommentDialog(false);
      setCommentType(CommentType.SUGGESTION);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  };

  const getCommentTypeColor = (type: CommentType) => {
    switch (type) {
      case CommentType.SUGGESTION:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case CommentType.QUESTION:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case CommentType.ISSUE:
        return 'bg-red-100 text-red-800 border-red-200';
      case CommentType.PRAISE:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCommentTypeIcon = (type: CommentType) => {
    switch (type) {
      case CommentType.SUGGESTION:
        return '💡';
      case CommentType.QUESTION:
        return '❓';
      case CommentType.ISSUE:
        return '⚠️';
      case CommentType.PRAISE:
        return '👍';
      default:
        return '💬';
    }
  };

  const renderContentWithHighlights = () => {
    if (!contentRef.current) return null;

    let highlightedContent = content;
    const sortedComments = [...existingComments].sort((a, b) => b.selection.start - a.selection.start);

    sortedComments.forEach(comment => {
      if (comment.selection) {
        const before = highlightedContent.substring(0, comment.selection.start);
        const selected = highlightedContent.substring(comment.selection.start, comment.selection.end);
        const after = highlightedContent.substring(comment.selection.end);
        
        highlightedContent = `${before}<mark class="bg-yellow-200 dark:bg-yellow-800 cursor-pointer relative" data-comment-id="${comment.id}">${selected}</mark>${after}`;
      }
    });

    return (
      <div
        ref={contentRef}
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
        onMouseUp={(e) => {
          if (!readOnly && selectedText) {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            setShowCommentDialog(true);
          }
        }}
      />
    );
  };

  return (
    <div className="relative">
      {/* Content with highlighted sections */}
      <div className="relative">
        {renderContentWithHighlights()}
        
        {/* Comment tooltips */}
        {existingComments.map(comment => (
          hoveredComment === comment.id && (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs"
              style={{
                left: '0',
                top: '100%',
                marginTop: '4px',
              }}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">{getCommentTypeIcon(comment.type)}</span>
                <div className="flex-1">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCommentTypeColor(comment.type)}`}>
                    {comment.type}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.text}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{comment.author}</span>
                    <span>{new Date(comment.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        ))}
      </div>

      {/* Comment Dialog */}
      {showCommentDialog && !readOnly && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCommentDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Comment
            </h3>

            {/* Selected Text */}
            {selectedText && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Selected text:</p>
                <p className="text-sm text-gray-900 dark:text-white italic">"{selectedText}"</p>
              </div>
            )}

            {/* Comment Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comment Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(CommentType).map(type => (
                  <button
                    key={type}
                    onClick={() => setCommentType(type)}
                    className={`flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                      commentType === type
                        ? getCommentTypeColor(type)
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{getCommentTypeIcon(type)}</span>
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Text */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comment
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter your comment..."
                className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCommentDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Comment
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Comment List */}
      {existingComments.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Comments</h4>
          {existingComments.map(comment => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border ${getCommentTypeColor(comment.type)} ${
                comment.resolved ? 'opacity-60' : ''
              }`}
              onMouseEnter={() => setHoveredComment(comment.id)}
              onMouseLeave={() => setHoveredComment(null)}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">{getCommentTypeIcon(comment.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{comment.type}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{comment.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {comment.author}
                    </span>
                    {!comment.resolved && (
                      <button className="text-xs text-blue-600 hover:text-blue-800">
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InlineCommenting;