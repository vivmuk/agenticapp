import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, WorkflowState, AgentActivity } from '@/types';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect(): void {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection', { connected: false });
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('error', error);
      this.handleReconnect();
    });

    // Workflow events
    this.socket.on('workflow_update', (data: WebSocketMessage) => {
      this.emit('workflow_update', data);
    });

    this.socket.on('agent_status', (data: WebSocketMessage) => {
      this.emit('agent_status', data);
    });

    this.socket.on('content_update', (data: WebSocketMessage) => {
      this.emit('content_update', data);
    });

    this.socket.on('error', (data: WebSocketMessage) => {
      this.emit('error', data);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('connection', {
        connected: false,
        error: 'Max reconnection attempts reached'
      });
    }
  }

  // Subscribe to workflow updates
  subscribeToWorkflow(workflowId: string): void {
    if (this.socket) {
      this.socket.emit('subscribe_workflow', { workflowId });
    }
  }

  // Unsubscribe from workflow updates
  unsubscribeFromWorkflow(workflowId: string): void {
    if (this.socket) {
      this.socket.emit('unsubscribe_workflow', { workflowId });
    }
  }

  // Event listener methods
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data: any): void {
    if (!this.listeners.has(event)) return;

    this.listeners.get(event)!.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket event handler for ${event}:`, error);
      }
    });
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Disconnect manually
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Reconnect manually
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
