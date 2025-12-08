import axios from 'axios';
import { 
  APIResponse, 
  WorkflowState, 
  WorkflowStartInput, 
  HumanReviewInput, 
  PaginatedResponse, 
  ContentVersion 
} from '@/types';

// Use VITE_API_URL or VITE_API_BASE_URL for backwards compatibility
// Prefer explicit env; fall back to backend domain if on frontend domain
const getApiBaseUrl = () => {
  // First, try explicit env var (set at build time)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback to VITE_API_BASE_URL
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Runtime fallback: if we're on the frontend domain, use backend domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If on frontend domain (agenticviv.up.railway.app), use backend domain
    if (hostname.includes('agenticviv.up.railway.app') || hostname.includes('railway.app')) {
      // Extract the project name and construct backend URL
      // For Railway, backend is typically at backend-<project>.up.railway.app
      return 'https://backend-agenticviv.up.railway.app';
    }
    // Otherwise fall back to same origin
    return window.location.origin;
  }
  
  return 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();

// Debug logging (remove in production)
if (typeof window !== 'undefined') {
  console.log('[API] Base URL:', API_BASE_URL);
  console.log('[API] VITE_API_URL env:', import.meta.env.VITE_API_URL);
  console.log('[API] Current hostname:', window.location.hostname);
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to log requests
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    const baseURL = config.baseURL || '';
    const fullUrl = baseURL && url ? `${baseURL}${url}` : url || baseURL;
    console.log('[API] Request:', method, url, '→', fullUrl);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Helper function for raw fetch calls that need the base URL
export const apiFetch = async (path: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return response;
};

export const workflowService = {
  // Start a new workflow
  startWorkflow: async (input: WorkflowStartInput): Promise<APIResponse<{ workflowId: string; status: string }>> => {
    const response = await api.post('/workflows/start', input);
    return response.data;
  },

  // Get workflow state by ID
  getWorkflow: async (workflowId: string): Promise<APIResponse<WorkflowState>> => {
    const response = await api.get(`/workflows/${workflowId}`);
    return response.data;
  },

  // List all workflows with pagination
  listWorkflows: async (page = 1, limit = 10, status?: string): Promise<APIResponse<PaginatedResponse<WorkflowState>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    const response = await api.get(`/workflows?${params}`);
    return response.data;
  },

  // Get workflow versions/version history
  getWorkflowVersions: async (workflowId: string): Promise<APIResponse<{ workflowId: string; versions: ContentVersion[]; totalCount: number }>> => {
    const response = await api.get(`/workflows/${workflowId}/versions`);
    return response.data;
  },

  // Submit human review
  submitHumanReview: async (workflowId: string, review: HumanReviewInput): Promise<APIResponse<WorkflowState>> => {
    const response = await api.post(`/workflows/${workflowId}/human-review`, review);
    return response.data;
  },

  // Delete/cancel workflow
  deleteWorkflow: async (workflowId: string): Promise<APIResponse<{ workflowId: string; deleted: boolean }>> => {
    const response = await api.delete(`/workflows/${workflowId}`);
    return response.data;
  },
};

export const humanReviewService = {
  // Get review queue
  getQueue: async () => {
    const response = await api.get('/human-review/queue');
    return response.data;
  },

  // Get review history for a workflow
  getHistory: async (workflowId: string) => {
    const response = await api.get(`/human-review/${workflowId}/history`);
    return response.data;
  },
};

export default api;
