 import React from 'react';
import { motion } from 'framer-motion';
import { useWorkflowStore } from '@/stores/workflowStore';
import { AgentType, AgentStatus } from '@/types';
import { Clock, AlertCircle, Brain, Search, Star, User } from 'lucide-react';

const getAgentIcon = (agentType: AgentType) => {
  switch (agentType) {
    case AgentType.CONTENT_GENERATOR:
      return <Brain className="w-5 h-5" />;
    case AgentType.WEB_SEARCH_CRITIC:
      return <Search className="w-5 h-5" />;
    case AgentType.QUALITY_CRITIC:
      return <Star className="w-5 h-5" />;
    case AgentType.WORKFLOW_MANAGER:
      return <User className="w-5 h-5" />;
    default:
      return <Brain className="w-5 h-5" />;
  }
};

const getStatusColor = (status: AgentStatus['status']) => {
  switch (status) {
    case 'idle':
      return 'text-gray-500';
    case 'running':
      return 'text-blue-500';
    case 'completed':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

const getStatusBgColor = (status: AgentStatus['status']) => {
  switch (status) {
    case 'idle':
      return 'bg-gray-100';
    case 'running':
      return 'bg-blue-100';
    case 'completed':
      return 'bg-green-100';
    case 'error':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
};

const getAgentTypeLabel = (agentType: AgentType) => {
  switch (agentType) {
    case AgentType.CONTENT_GENERATOR:
      return 'Content Generator';
    case AgentType.WEB_SEARCH_CRITIC:
      return 'Web Search Critic';
    case AgentType.QUALITY_CRITIC:
      return 'Quality Critic';
    case AgentType.WORKFLOW_MANAGER:
      return 'Workflow Manager';
    default:
      return 'Unknown Agent';
  }
};

export const NodeDetailsPanel: React.FC = () => {
  const { currentWorkflow, visualizationState, selectedNodeId, setSelectedNode } = useWorkflowStore();
  const selectedNode = visualizationState.nodes.find((node: any) => node.id === selectedNodeId);
  const agentStatus = selectedNode ? currentWorkflow?.agentStatus[AgentType[selectedNode.data.agentType]] : undefined;
  const metrics = selectedNode?.data.metrics;

  if (!selectedNode) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
          <User className="w-8 h-8 mx-auto text-gray-400" />
          <p className="mt-2">Select a node to view details</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getStatusBgColor(agentStatus?.status || 'idle')}`}>
            {getAgentIcon(selectedNode.data.agentType)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {getAgentTypeLabel(selectedNode.data.agentType)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedNode.data.label}</p>
          </div>
        </div>
        <button
          onClick={() => setSelectedNode(undefined)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-gray-500 dark:text-gray-400">×</span>
        </button>
      </div>

      {/* Status and Metrics */}
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
          <span className={`status-badge ${getStatusColor(agentStatus?.status || 'idle')}`}>
            {agentStatus?.status || 'idle'}
          </span>
        </div>

        {/* Execution Time */}
        {agentStatus?.executionTime && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Execution Time</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{agentStatus.executionTime}ms</span>
          </div>
        )}

        {/* Metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="space-y-3">
            {Object.entries(metrics).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {key.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Agent Description */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Agent Description</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {getAgentDescription(selectedNode.data.agentType)}
          </p>
        </div>

        {/* Error Message */}
        {agentStatus?.errorMessage && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">{agentStatus.errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last Execution */}
        {agentStatus?.lastExecution && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Last executed:</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {agentStatus.lastExecution.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const getAgentDescription = (agentType: AgentType): string => {
  switch (agentType) {
    case AgentType.CONTENT_GENERATOR:
      return 'Generates initial content including definitions, LinkedIn posts, and image prompts using the Venice API. This agent serves as the creative starting point for all workflows.';
    case AgentType.WEB_SEARCH_CRITIC:
      return 'Validates the accuracy of generated content by performing web searches and fact-checking claims. Ensures all information is factual and properly sourced.';
    case AgentType.QUALITY_CRITIC:
      return 'Evaluates the overall quality of content including coherence, engagement, and accuracy. Provides detailed feedback for improvement and generates quality scores.';
    case AgentType.WORKFLOW_MANAGER:
      return 'Manages the overall workflow execution, coordinates agent communication, and handles state transitions. Oversees the 3-cycle improvement loop.';
    default:
      return 'An AI agent that performs specific tasks within the workflow.';
  }
};

export default NodeDetailsPanel;