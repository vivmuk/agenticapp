import React from 'react';
import { motion } from 'framer-motion';
import { Handle, Position, NodeProps } from 'reactflow';
import { AgentType, CustomNodeData } from '@/types';

const agentIcons: Record<AgentType, React.ReactNode> = {
  [AgentType.CONTENT_GENERATOR]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  [AgentType.WEB_SEARCH_CRITIC]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  [AgentType.QUALITY_CRITIC]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  [AgentType.WORKFLOW_MANAGER]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const agentGradients: Record<AgentType, string> = {
  [AgentType.CONTENT_GENERATOR]: 'from-purple-500 to-violet-600',
  [AgentType.WEB_SEARCH_CRITIC]: 'from-blue-500 to-cyan-600',
  [AgentType.QUALITY_CRITIC]: 'from-emerald-500 to-teal-600',
  [AgentType.WORKFLOW_MANAGER]: 'from-pink-500 to-rose-600',
};

const statusStyles = {
  idle: {
    border: 'border-slate-600',
    bg: 'bg-slate-800',
    text: 'text-slate-400',
    icon: 'text-slate-500',
  },
  running: {
    border: 'border-purple-500',
    bg: 'bg-purple-900/30',
    text: 'text-purple-300',
    icon: 'text-purple-400',
  },
  completed: {
    border: 'border-green-500',
    bg: 'bg-green-900/30',
    text: 'text-green-300',
    icon: 'text-green-400',
  },
  error: {
    border: 'border-red-500',
    bg: 'bg-red-900/30',
    text: 'text-red-300',
    icon: 'text-red-400',
  },
};

export const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const { label, agentType, status, progress = 0, metrics } = data;
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const hasError = status === 'error';
  const style = statusStyles[status] || statusStyles.idle;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative min-w-[220px] max-w-[280px] rounded-xl border-2 ${style.border} ${style.bg} backdrop-blur-sm shadow-xl ${
        selected ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900' : ''
      } ${isRunning ? 'shadow-purple-500/20' : ''}`}
    >
      {/* Glow effect for running nodes */}
      {isRunning && (
        <div className="absolute inset-0 rounded-xl bg-purple-500/10 animate-pulse" />
      )}

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-900"
      />

      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${agentGradients[agentType]} shadow-lg`}>
            <div className="text-white">
              {agentIcons[agentType]}
            </div>
          </div>
          
          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {label}
            </h3>
            <p className={`text-xs ${style.text} capitalize`}>
              {status}
            </p>
          </div>

          {/* Status Icon */}
          <div className={style.icon}>
            {isRunning && (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isCompleted && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {hasError && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {status === 'idle' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-purple-300">Processing</span>
              <span className="text-purple-300 font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progress, 10)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="pt-2 border-t border-slate-700/50 space-y-1">
            {Object.entries(metrics).slice(0, 2).map(([key, value]) => (
              value !== undefined && (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-slate-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace('_', ' ').trim()}
                  </span>
                  <span className="font-medium text-slate-200">
                    {typeof value === 'number' ? value.toFixed(1) : String(value)}
                  </span>
                </div>
              )
            ))}
          </div>
        )}

        {/* Error message */}
        {hasError && metrics?.errorMessage && (
          <div className="flex items-start gap-2 p-2 bg-red-900/30 rounded-lg border border-red-500/50">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-300 line-clamp-2">
              {String(metrics.errorMessage)}
            </p>
          </div>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-900"
      />
    </motion.div>
  );
};

export default CustomNode;
