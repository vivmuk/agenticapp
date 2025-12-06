 import { create } from 'zustand';
import { Workflow, WorkflowStatus, AgentType } from '@/types';

// React Flow types
export interface WorkflowNode {
  id: string;
  type: 'default';
  position: { x: number; y: number };
  data: {
    label: string;
    agentType: AgentType;
    status: 'idle' | 'running' | 'completed' | 'error';
    metrics?: Record<string, any>;
    errorMessage?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  data?: {
    label?: string;
  };
}

export interface VisualizationState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
}

interface WorkflowState extends VisualizationState {
  // Current workflow data
  currentWorkflow: Workflow | null;
  workflows: Workflow[];
  
  // UI state
  isRealTimeConnected: boolean;
  darkMode: boolean;
  viewMode: 'canvas' | 'list';
  
  // Actions
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  setWorkflows: (workflows: Workflow[]) => void;
  updateWorkflow: (workflow: Partial<Workflow>) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setVisualizationState: (state: Partial<VisualizationState>) => void;
  setRealTimeConnected: (connected: boolean) => void;
  setDarkMode: (darkMode: boolean) => void;
  setViewMode: (mode: 'canvas' | 'list') => void;
  
  // WebSocket actions
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  
  // Workflow actions
  startWorkflow: (workflowId: string) => void;
  pauseWorkflow: (workflowId: string) => void;
  resetWorkflow: (workflowId: string) => void;
  provideHumanReview: (workflowId: string, feedback: string) => void;
}

const generateNodes = (workflow: Workflow): WorkflowNode[] => {
  const nodes: WorkflowNode[] = [];
  const agentTypes = [
    AgentType.CONTENT_GENERATOR,
    AgentType.WEB_SEARCH_CRITIC,
    AgentType.QUALITY_CRITIC,
  ];

  // Add cycle nodes
  for (let cycle = 1; cycle <= workflow.maxCycles; cycle++) {
    const yOffset = (cycle - 1) * 200;
    
    agentTypes.forEach((agentType, index) => {
      const node: WorkflowNode = {
        id: `${agentType}-cycle-${cycle}`,
        type: 'default',
        position: { x: index * 250, y: yOffset },
        data: {
          label: `${getAgentTypeLabel(agentType)} - Cycle ${cycle}`,
          agentType,
          status: 'idle',
        },
      };

      // Set status based on workflow state
      if (workflow.currentCycle === cycle) {
        const agentStatus = workflow.agentStatus[agentType];
        if (agentStatus) {
          node.data.status = agentStatus.status;
          node.data.metrics = agentStatus.metrics;
          node.data.errorMessage = agentStatus.errorMessage;
        }
      } else if (cycle < workflow.currentCycle) {
        node.data.status = 'completed';
      }

      nodes.push(node);
    });

    // Add human review node if triggered
    if (workflow.humanReviewRequired && cycle === workflow.currentCycle) {
      nodes.push({
        id: `human-review-cycle-${cycle}`,
        type: 'default',
        position: { x: agentTypes.length * 250, y: yOffset },
        data: {
          label: 'Human Review - Cycle ' + cycle,
          agentType: AgentType.WORKFLOW_MANAGER,
          status: workflow.humanReviewProvided ? 'completed' : 'idle',
        },
      });
    }
  }

  return nodes;
};

const generateEdges = (workflow: Workflow): WorkflowEdge[] => {
  const edges: WorkflowEdge[] = [];
  const agentTypes = [
    AgentType.CONTENT_GENERATOR,
    AgentType.WEB_SEARCH_CRITIC,
    AgentType.QUALITY_CRITIC,
  ];

  for (let cycle = 1; cycle <= workflow.maxCycles; cycle++) {
    const cycleEdges = agentTypes.slice(0, -1).map((agentType, index) => ({
      id: `${agentType}-to-${agentTypes[index + 1]}-cycle-${cycle}`,
      source: `${agentType}-cycle-${cycle}`,
      target: `${agentTypes[index + 1]}-cycle-${cycle}`,
      animated: cycle === workflow.currentCycle && workflow.status === WorkflowStatus.RUNNING,
    }));

    edges.push(...cycleEdges);

    // Add feedback edge for improvement cycles
    if (cycle < workflow.maxCycles) {
      edges.push({
        id: `feedback-cycle-${cycle}-to-${cycle + 1}`,
        source: `${agentTypes[agentTypes.length - 1]}-cycle-${cycle}`,
        target: `${agentTypes[0]}-cycle-${cycle + 1}`,
        animated: cycle === workflow.currentCycle && workflow.status === WorkflowStatus.RUNNING,
      });
    }

    // Add human review edge if triggered
    if (workflow.humanReviewRequired && cycle === workflow.currentCycle) {
      edges.push({
        id: `quality-to-human-review-cycle-${cycle}`,
        source: `${agentTypes[agentTypes.length - 1]}-cycle-${cycle}`,
        target: `human-review-cycle-${cycle}`,
        animated: true,
      });
    }
  }

  return edges;
};

const getAgentTypeLabel = (agentType: AgentType): string => {
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

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  currentWorkflow: null,
  workflows: [],
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isRealTimeConnected: false,
  darkMode: false,
  viewMode: 'canvas',

  // Actions
  setCurrentWorkflow: (workflow) => {
    set({ currentWorkflow: workflow });
    if (workflow) {
      const nodes = generateNodes(workflow);
      const edges = generateEdges(workflow);
      set({ nodes, edges });
    } else {
      set({ nodes: [], edges: [] });
    }
  },

  setWorkflows: (workflows) => {
    set({ workflows });
  },

  updateWorkflow: (workflowUpdate) => {
    const currentWorkflow = get().currentWorkflow;
    if (currentWorkflow) {
      const updatedWorkflow = { ...currentWorkflow, ...workflowUpdate };
      set({ currentWorkflow: updatedWorkflow });
      
      // Regenerate visualization
      const nodes = generateNodes(updatedWorkflow);
      const edges = generateEdges(updatedWorkflow);
      set({ nodes, edges });
    }
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  setVisualizationState: (state) => {
    set(state);
  },

  setRealTimeConnected: (connected) => {
    set({ isRealTimeConnected: connected });
  },

  setDarkMode: (darkMode) => {
    set({ darkMode });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  connectWebSocket: () => {
    // WebSocket connection logic will be implemented
    console.log('WebSocket connection requested');
  },

  disconnectWebSocket: () => {
    // WebSocket disconnection logic will be implemented
    console.log('WebSocket disconnection requested');
  },

  startWorkflow: (workflowId) => {
    // API call to start workflow
    console.log('Starting workflow:', workflowId);
  },

  pauseWorkflow: (workflowId) => {
    // API call to pause workflow
    console.log('Pausing workflow:', workflowId);
  },

  resetWorkflow: (workflowId) => {
    // API call to reset workflow
    console.log('Resetting workflow:', workflowId);
  },

  provideHumanReview: (workflowId, feedback) => {
    // API call to provide human review
    console.log('Providing human review for workflow:', workflowId, feedback);
  },
}));