import React from 'react';
import { motion } from 'framer-motion';
import { Handle, Position, NodeProps } from 'reactflow';
import { AgentType, AgentStatus, CustomNodeData } from '@/types';
import { Clock, CheckCircle, AlertCircle, XCircle, Loader2, Brain, Search, Star, User } from 'lucide-react';

const agentIcons = {
  [AgentType.CONTENT_GENERATOR]: Brain,
  [AgentType.WEB_SEARCH_CRITIC]: Search,
  [AgentType.QUALITY_CRITIC]: Star,
  [AgentType.WORKFLOW_MANAGER]: User,
};

const agentColors = {
  [AgentType.CONTENT_GENERATOR]: 'border-agent-generator bg-agent-generator/10',
  [AgentType.WEB_SEARCH_CRITIC]: 'border-agent-critic bg-agent-critic/10',
  [AgentType.QUALITY_CRITIC]: 'border-agent-quality bg-agent-quality/10',
  [AgentType.WORKFLOW_MANAGER]: 'border-agent-human bg-agent-human/10',
};

const statusColors = {
  idle: 'text-gray-500',
  running: 'text-blue-500 animate-pulse',
  completed: 'text-green-500',
  error: 'text-red-500',
};

const statusBgColors = {
  idle: 'bg-gray-100',
  running: 'bg-blue-100 animate-pulse-slow',
  completed: 'bg-green-100',
  error: 'bg-red-100',
};

export const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const { label, agentType, status, progress = 0, metrics } = data;
  const Icon = agentIcons[agentType];
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const hasError = status === 'error';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`agent-node min-w-[200px] max-w-[280px] ${agentColors[agentType]} ${
        selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      } ${
        hasError ? 'border-red-500' : 'border-gray-200'
      } dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-800"
      />

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${statusBgColors[status]}`}>
              <Icon className={`w-5 h-5 ${statusColors[status]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {agentType.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center space-x-1">
            {isRunning && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
            {hasError && <XCircle className="w-4 h-4 text-red-500" />}
            {status === 'idle' && <Clock className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Processing</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="space-y-1">
            {Object.entries(metrics).slice(0, 2).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {key.replace('_', ' ')}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {typeof value === 'number' ? value.toFixed(1) : value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {hasError && metrics?.errorMessage && (
          <div className="flex items-start space-x-1 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300 line-clamp-2">
              {metrics.errorMessage}
            </p>
          </div>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-800"
      />
    </motion.div>
  );
};

export default CustomNode;
