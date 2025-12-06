import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType
} from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkflowStore } from '@/stores/workflowStore';
import { AgentType, WorkflowStatus } from '@/types';
import { workflowService } from '@/services/apiService';
import CustomNode from './CustomNode';
import WorkflowStartForm from './WorkflowStartForm';
import 'reactflow/dist/style.css';

const nodeTypes = {
  custom: CustomNode,
};

const generateWorkflowLayout = (workflowState: any): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const horizontalSpacing = 350;
  const startX = 100;
  const startY = 50;
  const verticalSpacing = 200;

  // Content Generator Node
  nodes.push({
    id: 'content-generator',
    type: 'custom',
    position: { x: startX, y: startY },
    data: {
      label: 'Content Generator',
      agentType: AgentType.CONTENT_GENERATOR,
      status: workflowState.agentStatus?.[AgentType.CONTENT_GENERATOR]?.status || 'idle',
      progress: 0,
      metrics: {
        executionTime: workflowState.agentStatus?.[AgentType.CONTENT_GENERATOR]?.executionTime,
      },
    },
  });

  // Web Search Critic Node
  nodes.push({
    id: 'web-search-critic',
    type: 'custom',
    position: { x: startX + horizontalSpacing, y: startY },
    data: {
      label: 'Web Search Critic',
      agentType: AgentType.WEB_SEARCH_CRITIC,
      status: workflowState.agentStatus?.[AgentType.WEB_SEARCH_CRITIC]?.status || 'idle',
      progress: 0,
      metrics: {
        executionTime: workflowState.agentStatus?.[AgentType.WEB_SEARCH_CRITIC]?.executionTime,
        searchResults: workflowState.currentAccuracyCritique?.sources?.length || 0,
      },
    },
  });

  // Quality Critic Node
  nodes.push({
    id: 'quality-critic',
    type: 'custom',
    position: { x: startX + horizontalSpacing * 2, y: startY },
    data: {
      label: 'Quality Critic',
      agentType: AgentType.QUALITY_CRITIC,
      status: workflowState.agentStatus?.[AgentType.QUALITY_CRITIC]?.status || 'idle',
      progress: 0,
      metrics: {
        executionTime: workflowState.agentStatus?.[AgentType.QUALITY_CRITIC]?.executionTime,
        qualityScore: workflowState.currentQualityCritique?.overallScore || 0,
      },
    },
  });

  // Human Review Node (only show if required)
  if (workflowState.humanReviewRequired) {
    nodes.push({
      id: 'human-review',
      type: 'custom',
      position: { x: startX + horizontalSpacing * 3, y: startY },
      data: {
        label: 'Human Review',
        agentType: AgentType.WORKFLOW_MANAGER,
        status: workflowState.humanReviewProvided ? 'completed' : 'idle',
        progress: 0,
      },
    });
  }

  // Add edges
  const edgeId = (source: string, target: string) => `${source}-${target}`;
  edges.push({
    id: edgeId('content-generator', 'web-search-critic'),
    source: 'content-generator',
    target: 'web-search-critic',
    animated: workflowState.status === WorkflowStatus.WEB_SEARCH_CRITIC,
    style: {
      stroke: '#a855f7',
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.Arrow,
      color: '#a855f7',
    },
  });

  edges.push({
    id: edgeId('web-search-critic', 'quality-critic'),
    source: 'web-search-critic',
    target: 'quality-critic',
    animated: workflowState.status === WorkflowStatus.QUALITY_CRITIC,
    style: {
      stroke: '#a855f7',
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.Arrow,
      color: '#a855f7',
    },
  });

  // Add human review edge if required
  if (workflowState.humanReviewRequired) {
    edges.push({
      id: edgeId('quality-critic', 'human-review'),
      source: 'quality-critic',
      target: 'human-review',
      animated: workflowState.status === WorkflowStatus.HUMAN_REVIEW,
      style: {
        stroke: '#a855f7',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.Arrow,
        color: '#a855f7',
      },
    });
  }

  // Add cycle feedback edges if in improvement cycles
  if (workflowState.currentCycle > 1) {
    const feedbackY = startY + verticalSpacing;
    nodes.push({
      id: 'cycle-feedback',
      type: 'custom',
      position: { x: startX + horizontalSpacing, y: feedbackY },
      data: {
        label: `Cycle ${workflowState.currentCycle - 1} Feedback`,
        agentType: AgentType.WORKFLOW_MANAGER,
        status: 'completed',
        progress: 100,
      },
    });

    edges.push({
      id: edgeId('quality-critic', 'cycle-feedback'),
      source: 'quality-critic',
      target: 'cycle-feedback',
      animated: false,
      style: {
        stroke: '#ec4899',
        strokeWidth: 2,
        strokeDasharray: '5 5',
      },
    });

    edges.push({
      id: edgeId('cycle-feedback', 'content-generator'),
      source: 'cycle-feedback',
      target: 'content-generator',
      animated: workflowState.status === WorkflowStatus.CONTENT_GENERATION,
      style: {
        stroke: '#ec4899',
        strokeWidth: 2,
        strokeDasharray: '5 5',
      },
    });
  }

  return { nodes, edges };
};

interface WorkflowCanvasProps {
  workflowId?: string | null;
  allowInlineStart?: boolean;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ workflowId, allowInlineStart = true }) => {
  const { currentWorkflow, setCurrentWorkflow, setSelectedNode } = useWorkflowStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Connect handler
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Poll for workflow updates
  const pollWorkflowStatus = useCallback(async (workflowId: string) => {
    try {
      const response = await workflowService.getWorkflow(workflowId);
      if (response.success && response.data) {
        const workflow = {
          id: (response.data as any).workflowId || (response.data as any).id || workflowId,
          ...response.data,
        };
        setCurrentWorkflow(workflow as any);
        
        // Stop polling if workflow is completed or failed
        if (
          workflow.status === WorkflowStatus.COMPLETED ||
          workflow.status === WorkflowStatus.FAILED
        ) {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll workflow status:', error);
    }
  }, [setCurrentWorkflow, pollingInterval]);

  // Handle workflow started
  const handleWorkflowStarted = useCallback((workflowId: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    // Start polling for updates
    const interval = setInterval(() => {
      pollWorkflowStatus(workflowId);
    }, 2000);
    setPollingInterval(interval);
    
    // Initial poll
    pollWorkflowStatus(workflowId);
  }, [pollWorkflowStatus]);

  // Auto-start polling when parent provides a workflowId
  useEffect(() => {
    if (workflowId) {
      handleWorkflowStarted(workflowId);
    }
  }, [workflowId, handleWorkflowStarted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Update nodes and edges when workflow changes
  useEffect(() => {
    if (currentWorkflow) {
      const { nodes: workflowNodes, edges: workflowEdges } = generateWorkflowLayout(currentWorkflow);
      setNodes(workflowNodes);
      setEdges(workflowEdges);
    }
  }, [currentWorkflow, setNodes, setEdges]);

  // Node click handler
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  // Reset workflow
  const handleNewWorkflow = () => {
    setCurrentWorkflow(null);
    setNodes([]);
    setEdges([]);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // If no workflow, show the start form or an empty state
  if (!currentWorkflow) {
    if (!allowInlineStart) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white gap-3 px-8">
          <h3 className="text-lg font-semibold">No workflow running</h3>
          <p className="text-sm text-gray-300 text-center max-w-md">
            Start a new post from the Create tab to see live agent activity, content drafts, and images appear here.
          </p>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-8">
        <WorkflowStartForm onWorkflowStarted={handleWorkflowStarted} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Status Bar */}
      <div className="bg-slate-900/80 border-b border-purple-500/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                currentWorkflow.status === WorkflowStatus.COMPLETED ? 'bg-green-500' :
                currentWorkflow.status === WorkflowStatus.FAILED ? 'bg-red-500' :
                'bg-purple-500 animate-pulse'
              }`} />
              <span className="text-white font-medium">{currentWorkflow.topic}</span>
            </div>
            <span className="text-gray-400 text-sm">
              Cycle {currentWorkflow.currentCycle} / {currentWorkflow.maxCycles}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              currentWorkflow.status === WorkflowStatus.COMPLETED ? 'bg-green-500/20 text-green-300' :
              currentWorkflow.status === WorkflowStatus.FAILED ? 'bg-red-500/20 text-red-300' :
              'bg-purple-500/20 text-purple-300'
            }`}>
              {currentWorkflow.status}
            </span>
          </div>
          <button
            onClick={handleNewWorkflow}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workflow
          </button>
        </div>
      </div>

      {/* Content Display for completed workflows */}
      <AnimatePresence>
        {currentWorkflow.status === WorkflowStatus.COMPLETED && currentWorkflow.currentContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900/80 border-b border-purple-500/20 px-6 py-4 max-h-64 overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Generated Content</h3>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 whitespace-pre-wrap">{currentWorkflow.currentContent}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-transparent"
        >
          <Background color="#374151" gap={20} size={1} />
          <Controls className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl [&>button]:bg-slate-800 [&>button]:border-slate-700 [&>button]:text-gray-300 [&>button:hover]:bg-slate-700" />
          <MiniMap 
            style={{ backgroundColor: '#1e293b' }} 
            className="bg-slate-800 border border-slate-700 rounded-lg"
            nodeColor={(node) => {
              if (node.data?.status === 'completed') return '#22c55e';
              if (node.data?.status === 'running') return '#a855f7';
              if (node.data?.status === 'error') return '#ef4444';
              return '#64748b';
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default WorkflowCanvas;
