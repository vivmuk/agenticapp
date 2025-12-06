 import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, { Node, Edge, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Connection, MarkerType } from 'reactflow';
import { motion } from 'framer-motion';
import { useWorkflowStore } from '@/stores/workflowStore';
import { AgentType, WorkflowStatus, WorkflowNode, WorkflowEdge } from '@/types';
import CustomNode from './CustomNode';
import 'reactflow/dist/style.css';

const nodeTypes = {
  custom: CustomNode,
};

const generateWorkflowLayout = (workflowState: any): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeWidth = 280;
  const nodeHeight = 150;
  const verticalSpacing = 200;
  const horizontalSpacing = 350;
  const startX = 100;
  const startY = 50;

  // Content Generator Node
  nodes.push({
    id: 'content-generator',
    type: 'custom',
    position: { x: startX, y: startY },
    data: {
      label: 'Content Generator',
      agentType: AgentType.CONTENT_GENERATOR,
      status: workflowState.agentStatus[AgentType.CONTENT_GENERATOR]?.status || 'idle',
      progress: 0,
      metrics: {
        executionTime: workflowState.agentStatus[AgentType.CONTENT_GENERATOR]?.executionTime,
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
      status: workflowState.agentStatus[AgentType.WEB_SEARCH_CRITIC]?.status || 'idle',
      progress: 0,
      metrics: {
        executionTime: workflowState.agentStatus[AgentType.WEB_SEARCH_CRITIC]?.executionTime,
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
      status: workflowState.agentStatus[AgentType.QUALITY_CRITIC]?.status || 'idle',
      progress: 0,
      metrics: {
        executionTime: workflowState.agentStatus[AgentType.QUALITY_CRITIC]?.executionTime,
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
      stroke: '#3b82f6',
      strokeWidth: 2,
    markerEnd: { type: MarkerType.arrow, color: '#3b82f6',
    },
    data: { flowType: 'data' as const },
  });

  // Add cycle feedback edges if in improvement cycles
  if (workflowState.currentCycle > 1) {
    const feedbackY = startY + verticalSpacing;
    nodes.push({
      id: `cycle-feedback`,
      type: 'custom',
      position: { x: startX + horizontalSpacing, y: feedbackY },
      data: {
        label: `Cycle ${workflowState.currentCycle - 1} Feedback`,
        agentType: AgentType.WORKFLOW_MANAGER,
        status: 'completed',
        progress: 100,
      },
    });
    
    // Add feedback edge from quality critic to back to content generator for cycle improvement
    edges.push({
      id: edgeId('quality-critic', 'cycle-feedback'),
      source: 'quality-critic',
      target: 'content-generator',
      animated: false,
      style: {
        stroke: '#8b5cf6',
        strokeWidth: 2,
        strokeDasharray: '5 5',
      },
    });
    edges.push({
      id: edgeId('cycle-feedback', 'content-generator'),
      source: 'quality-critic',
      target: 'content-generator',
      animated: workflowState.status === WorkflowStatus.CONTENT_GENERATION,
      style: {
        stroke: '#8b5cf6',
        strokeWidth: 2,
        strokeDasharray: '5 5',
      },
    });
  }

  return { nodes, edges };
};

export const WorkflowCanvas: React.FC = () => {
  const { currentWorkflow, updateNodeStatus, setSelectedNode } = useWorkflowStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes and edges when workflow changes
  useEffect(() => {
    if (currentWorkflow) {
      const { nodes: workflowNodes, edges: workflowEdges } = generateWorkflowLayout(currentWorkflow);
      setNodes(workflowNodes);
      setEdges(workflowEdges);
    }
  }, [currentWorkflow, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect]);

  // Update node statuses based on workflow state
  useEffect(() => {
    if (currentWorkflow) {
      Object.entries(currentWorkflow.agentStatus).forEach(([agentType, status]) => {
        const nodeId = agentType.toLowerCase().replace('_', '-');
        updateNodeStatus(nodeId, status.status);
      });
    }
  }, [currentWorkflow, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect);

  // Node click handler
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  // Connect handler
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Minimap style
  const minimapStyle = {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    border: '1px solid #d1d5db',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="workflow-canvas w-full h-full"
    >
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
        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg" />
        <MiniMap style={minimapStyle} className="bg-white dark:bg-gray-800 border-gray-700" zoomable pannable />
      />
      <Controls />
      <MiniMap style={minimapStyle} />
    </motion.div>
  );
};