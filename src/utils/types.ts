/**
 * Type definitions for MSW UI Widget
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'ALL';

export interface Endpoint {
  id: string;
  path: string;
  method: HttpMethod;
  parameters?: EndpointParameter[];
  originalPath?: string; // Original path from OpenAPI with {param} syntax
}

export interface EndpointParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema?: {
    type?: string;
    format?: string;
  };
}

export interface MockResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

export interface QueueItem {
  id: string;
  response: MockResponse;
  method: HttpMethod;
  name?: string; // Optional name for the queue item
  delay?: number; // Delay in milliseconds before responding (default: 0)
}

export interface EndpointQueue {
  endpointId: string;
  items: QueueItem[];
  currentIndex: number;
}

export interface CallHistoryEntry {
  id: string;
  endpointId: string;
  timestamp: number;
  method: HttpMethod;
  path: string;
  fullUrl: string; // Full URL with actual parameter values
  request?: {
    headers?: Record<string, string>;
    body?: any;
  };
  response?: {
    status: number;
    body?: any;
  };
}

/**
 * Call count information for an endpoint
 * Used in WidgetState.callCounts: Map<string, EndpointCallCount>
 * @knip-ignore - Used in Map generic type, knip doesn't detect this
 */
export interface EndpointCallCount {
  endpointId: string;
  count: number;
  lastCalled?: number;
  handlerCalls?: Map<string, number>; // Map of handlerId -> call count
}

/**
 * Active mock configuration
 * Used in WidgetState.activeMocks: Map<string, ActiveMock>
 * @knip-ignore - Used in Map generic type, knip doesn't detect this
 */
export interface ActiveMock {
  endpointId: string;
  method: HttpMethod;
  queueId?: string; // If using queue
  response?: MockResponse; // If not using queue
  enabled: boolean;
  name?: string; // Optional name for the mock/handler
  customUrl?: string; // Custom URL for the handler (overrides endpoint path)
  delay?: number; // Delay in milliseconds before responding (default: 0)
}

export interface WidgetState {
  endpoints: Endpoint[];
  activeMocks: Map<string, ActiveMock>;
  queues: Map<string, EndpointQueue>;
  callCounts: Map<string, EndpointCallCount>;
  callHistory: CallHistoryEntry[];
  searchQuery: string;
  filterMethod?: HttpMethod;
  isPanelOpen: boolean;
  isHistorySidebarOpen: boolean;
  globalCallOrder: number; // Global counter for call order
}

export interface MswUiWidgetProps {
  worker: any; // MSW worker instance
  openapiUrl: string;
  visible?: boolean;
}
