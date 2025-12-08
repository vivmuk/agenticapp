import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentType, AgentResponse, Workflow } from '@/types';
import { format } from 'date-fns';
import { useWorkflowStore } from '@/stores/workflowStore';
import { WorkflowStatus } from '@/types';

interface AgentChatProps {
    workflowId: string | null;
}

const AgentChat: React.FC<AgentChatProps> = ({ workflowId }) => {
    const { currentWorkflow, isPolling, startPolling, stopPolling, fetchWorkflow } = useWorkflowStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (workflowId) {
            fetchWorkflow(workflowId);
            startPolling(workflowId);
        }
        return () => stopPolling();
    }, [workflowId, startPolling, stopPolling, fetchWorkflow]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentWorkflow?.agentResponses?.length]);

    if (!workflowId) return null;

    const responses = currentWorkflow?.agentResponses || [];
    const sortedResponses = [...responses].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const getAgentColor = (type: AgentType) => {
        switch (type) {
            case AgentType.CONTENT_GENERATOR: return 'border-purple-500 text-purple-400';
            case AgentType.WEB_SEARCH_CRITIC: return 'border-blue-500 text-blue-400';
            case AgentType.QUALITY_CRITIC: return 'border-green-500 text-green-400';
            default: return 'border-gray-500 text-gray-400';
        }
    };

    const getAgentName = (type: AgentType) => {
        switch (type) {
            case AgentType.CONTENT_GENERATOR: return 'Content Generator';
            case AgentType.WEB_SEARCH_CRITIC: return 'Web Search Critic';
            case AgentType.QUALITY_CRITIC: return 'Quality Critic';
            default: return 'System';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-xl font-semibold text-white">Agent Collaboration Log</h2>
                <div className="flex items-center space-x-2 mt-1">
                    <span className={`h-2 w-2 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="text-sm text-gray-400">
                        {currentWorkflow?.status === WorkflowStatus.RUNNING ? 'Workflow Running...' : `Status: ${currentWorkflow?.status}`}
                    </span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                    {sortedResponses.map((response) => (
                        <motion.div
                            key={response.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`border-l-4 ${getAgentColor(response.agentType)} bg-slate-800/30 rounded-r-lg p-4`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`font-bold ${getAgentColor(response.agentType).split(' ')[1]}`}>
                                    {getAgentName(response.agentType)}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {format(new Date(response.createdAt), 'HH:mm:ss')}
                                </span>
                            </div>

                            {/* Input (Prompt) - Collapsible or Details */}
                            <div className="mb-2">
                                <details className="text-xs text-gray-400 cursor-pointer">
                                    <summary className="hover:text-gray-300 transition-colors">View Input / Prompt</summary>
                                    <pre className="mt-2 p-2 bg-black/30 rounded overflow-x-auto whitespace-pre-wrap font-mono">
                                        {JSON.stringify(response.input, null, 2)}
                                    </pre>
                                </details>
                            </div>

                            {/* Output */}
                            <div className="text-sm text-gray-300">
                                <div className="font-semibold mb-1 text-xs uppercase tracking-wide opacity-75">Response:</div>
                                <div className="bg-slate-900/50 rounded p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                                    {/* Attempt to make JSON readable if it's an object */}
                                    {typeof response.output === 'string'
                                        ? response.output
                                        : JSON.stringify(response.output, null, 2)
                                    }
                                </div>
                            </div>

                            {/* Error Message if any */}
                            {!response.success && (
                                <div className="mt-2 text-red-400 text-sm">
                                    Error: {response.errorMessage}
                                </div>
                            )}
                        </motion.div>
                    ))}
                    {sortedResponses.length === 0 && (
                        <div className="text-center text-gray-500 mt-10">
                            Waiting for agents to start...
                        </div>
                    )}

                    {/* Running Agents Indicator */}
                    {currentWorkflow?.agentStatus && Object.entries(currentWorkflow.agentStatus)
                        .filter(([_, status]) => status.status === 'running')
                        .map(([agentType]) => (
                            <motion.div
                                key={`running-${agentType}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`border-l-4 ${getAgentColor(agentType as AgentType)} bg-slate-800/20 rounded-r-lg p-4 animate-pulse`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className={`font-bold ${getAgentColor(agentType as AgentType).split(' ')[1]}`}>
                                        {getAgentName(agentType as AgentType)}
                                    </span>
                                    <span className="text-xs text-gray-500 italic">Thinking...</span>
                                </div>
                            </motion.div>
                        ))
                    }
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default AgentChat;
