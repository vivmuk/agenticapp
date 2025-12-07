import React from 'react';
import AgentChat from './AgentChat';
import ContentDisplay from '../humanReview/ContentDisplay';
import useWorkflowStore from '@/stores/workflowStore';
import { ContentPackage } from '@/types';

interface AgentChatViewProps {
    workflowId: string | null;
}

const AgentChatView: React.FC<AgentChatViewProps> = ({ workflowId }) => {
    const { currentWorkflow } = useWorkflowStore();

    // Extract content if available (handle string or object)
    let contentPackage: ContentPackage | null = null;
    if (currentWorkflow?.currentContent) {
        if (typeof currentWorkflow.currentContent === 'string') {
            // Fallback if it's a string
            contentPackage = {
                definition: currentWorkflow.currentContent,
                linkedinPost: '',
                imagePrompt: '',
                keyClaims: [],
            };
        } else {
            contentPackage = currentWorkflow.currentContent;
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]"> {/* Adjust height based on header */}
            {/* Top Section: Chat - Takes remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <AgentChat workflowId={workflowId} />
            </div>

            {/* Bottom Section: Result Preview - Fixed height or percentage driven */}
            {contentPackage && (
                <div className="h-[45%] flex flex-col bg-slate-900 border-t-2 border-slate-700 shadow-xl z-10">
                    <div className="px-6 py-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-purple-400">✨</span> Live Result Preview
                        </h3>
                        <span className="text-xs text-gray-400">Updates automatically</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <ContentDisplay content={contentPackage} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentChatView;
