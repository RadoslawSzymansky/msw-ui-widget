/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
  WidgetState,
  Endpoint,
  CallHistoryEntry,
  HttpMethod,
  QueueItem,
  MockResponse,
} from '../utils/types';
import { removeAllHandlers } from '../utils/mswHandlerUtils';

interface WidgetStore extends WidgetState {
  // Worker
  worker: any | null;
  setWorker: (worker: any) => void;

  // Actions
  setEndpoints: (endpoints: Endpoint[]) => void;
  setBaseUrl: (baseUrl: string | undefined) => void;
  baseUrl: string | undefined;
  addMock: (
    endpointId: string,
    method: HttpMethod,
    response: MockResponse,
    queueId?: string,
    name?: string,
    customUrl?: string,
    delay?: number
  ) => void;
  updateMock: (
    endpointId: string,
    method: HttpMethod,
    response: MockResponse,
    queueId?: string,
    name?: string,
    customUrl?: string,
    delay?: number
  ) => void;
  setMockName: (endpointId: string, method: HttpMethod, name: string) => void;
  removeMock: (endpointId: string, method: HttpMethod) => void;
  removeAllMocks: () => void;
  setMockEnabled: (
    endpointId: string,
    method: HttpMethod,
    enabled: boolean
  ) => void;

  // Queue management
  addToQueue: (endpointId: string, item: QueueItem) => void;
  removeFromQueue: (endpointId: string, queueItemId: string) => void;
  getNextQueueItem: (endpointId: string) => QueueItem | null;
  resetQueue: (endpointId: string) => void;
  clearQueue: (endpointId: string) => void;

  // Call tracking
  incrementCallCount: (endpointId: string) => void;
  incrementHandlerCallCount: (endpointId: string, handlerId: string) => void;
  setCallCount: (endpointId: string, count: number) => void;
  addCallHistory: (entry: Omit<CallHistoryEntry, 'id' | 'timestamp'>) => void;
  clearCallHistory: () => void;
  getHandlerCallCount: (endpointId: string, handlerId: string) => number;

  // UI state
  setSearchQuery: (query: string) => void;
  filterMethods: Set<HttpMethod>;
  toggleFilterMethod: (method: HttpMethod) => void;
  setPanelOpen: (open: boolean) => void;
  setHistorySidebarOpen: (open: boolean) => void;

  // Pinned endpoints
  pinnedEndpoints: Set<string>;
  togglePinEndpoint: (endpointId: string) => void;
  showPinnedOnly: boolean;
  setShowPinnedOnly: (show: boolean) => void;

  // Mocked filter
  showMockedOnly: boolean;
  setShowMockedOnly: (show: boolean) => void;

  // View mode
  viewMode: 'mocks' | 'history';
  setViewMode: (mode: 'mocks' | 'history') => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Reset
  reset: () => void;
}

const initialState: Omit<WidgetState, 'activeMocks' | 'queues' | 'callCounts'> =
  {
    endpoints: [],
    callHistory: [],
    searchQuery: '',
    filterMethod: 'GET', // Default to GET filter (kept for backward compatibility)
    isPanelOpen: false,
    isHistorySidebarOpen: false,
    globalCallOrder: 0,
  };

// Load theme from localStorage on initialization
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('msw-widget-theme');
  return (stored === 'light' || stored === 'dark' ? stored : 'dark') as
    | 'light'
    | 'dark';
};

export const useWidgetStore = create<WidgetStore>((set, get) => ({
  ...initialState,
  activeMocks: new Map(),
  queues: new Map(),
  callCounts: new Map(),
  worker: null,
  baseUrl: undefined,
  pinnedEndpoints: new Set<string>(),
  showPinnedOnly: false,
  showMockedOnly: false,
  filterMethods: new Set<HttpMethod>(), // Empty by default - shows all methods
  viewMode: 'mocks' as 'mocks' | 'history',
  theme: getInitialTheme(),

  setWorker: (worker) => set({ worker }),

  setEndpoints: (endpoints) => set({ endpoints }),
  setBaseUrl: (baseUrl) => set({ baseUrl }),

  addMock: (endpointId, method, response, queueId, name, customUrl, delay) => {
    const activeMocks = new Map(get().activeMocks);
    const defaultName = name || (queueId ? 'Handler' : 'Mock');
    activeMocks.set(`${endpointId}:${method}`, {
      endpointId,
      method,
      response: queueId ? undefined : response,
      queueId,
      enabled: true,
      name: defaultName,
      customUrl: customUrl || undefined,
      delay: delay !== undefined ? delay : 0,
    });
    set({ activeMocks });
  },

  updateMock: (
    endpointId,
    method,
    response,
    queueId,
    name,
    customUrl,
    delay
  ) => {
    const activeMocks = new Map(get().activeMocks);
    const key = `${endpointId}:${method}`;
    const existing = activeMocks.get(key);
    if (existing) {
      activeMocks.set(key, {
        ...existing,
        response: queueId ? undefined : response,
        queueId,
        name: name !== undefined ? name : existing.name,
        customUrl: customUrl !== undefined ? customUrl : existing.customUrl,
        delay: delay !== undefined ? delay : (existing.delay ?? 0),
      });
      set({ activeMocks });
    }
  },

  setMockName: (endpointId, method, name) => {
    const activeMocks = new Map(get().activeMocks);
    const key = `${endpointId}:${method}`;
    const existing = activeMocks.get(key);
    if (existing) {
      activeMocks.set(key, { ...existing, name });
      set({ activeMocks });
    }
  },

  removeMock: (endpointId, method) => {
    const activeMocks = new Map(get().activeMocks);
    activeMocks.delete(`${endpointId}:${method}`);

    // Also clear queue for this endpoint
    const queues = new Map(get().queues);
    queues.delete(endpointId);

    // If last mocked endpoint is removed and filter is active, disable filter
    const mockedCount = Array.from(activeMocks.values()).filter(
      (m) => m.enabled
    ).length;
    if (mockedCount === 0 && get().showMockedOnly) {
      set({ activeMocks, queues, showMockedOnly: false });
      return;
    }

    set({ activeMocks, queues });

    // Handler removal from MSW is handled by useMswHandler hook
  },

  removeAllMocks: () => {
    // Clear all mocks, queues, and call counts
    set({
      activeMocks: new Map(),
      queues: new Map(),
      callCounts: new Map(),
    });

    // Remove all handlers from MSW
    removeAllHandlers();
  },

  setMockEnabled: (endpointId, method, enabled) => {
    const activeMocks = new Map(get().activeMocks);
    const key = `${endpointId}:${method}`;
    const existing = activeMocks.get(key);
    if (existing) {
      activeMocks.set(key, { ...existing, enabled });
      set({ activeMocks });
    }
  },

  addToQueue: (endpointId, item) => {
    const queues = new Map(get().queues);
    const existing = queues.get(endpointId) || {
      endpointId,
      items: [],
      currentIndex: 0,
    };

    // Generate default name if not provided
    if (!item.name || item.name.trim() === '') {
      const itemNumber = existing.items.length + 1;
      item.name = `Mock ${itemNumber}`;
    }

    existing.items.push(item);
    queues.set(endpointId, existing);
    set({ queues });
  },

  removeFromQueue: (endpointId, queueItemId) => {
    const queues = new Map(get().queues);
    const existing = queues.get(endpointId);
    if (existing) {
      existing.items = existing.items.filter((item) => item.id !== queueItemId);
      if (existing.items.length === 0) {
        queues.delete(endpointId);
      } else {
        queues.set(endpointId, existing);
      }
      set({ queues });
    }
  },

  getNextQueueItem: (endpointId) => {
    const queues = get().queues;
    const queue = queues.get(endpointId);
    if (!queue || queue.items.length === 0) {
      return null;
    }

    const item = queue.items[queue.currentIndex];
    queue.currentIndex = (queue.currentIndex + 1) % queue.items.length;

    const newQueues = new Map(queues);
    newQueues.set(endpointId, queue);
    set({ queues: newQueues });

    return item;
  },

  resetQueue: (endpointId) => {
    const queues = new Map(get().queues);
    const existing = queues.get(endpointId);
    if (existing) {
      existing.currentIndex = 0;
      queues.set(endpointId, existing);
      set({ queues });
    }
  },

  clearQueue: (endpointId) => {
    const queues = new Map(get().queues);
    queues.delete(endpointId);
    set({ queues });
  },

  incrementCallCount: (endpointId) => {
    const callCounts = new Map(get().callCounts);
    const existing = callCounts.get(endpointId) || {
      endpointId,
      count: 0,
      lastCalled: undefined,
      handlerCalls: new Map(),
    };

    existing.count += 1;
    existing.lastCalled = Date.now();
    if (!existing.handlerCalls) {
      existing.handlerCalls = new Map();
    }
    callCounts.set(endpointId, existing);

    const globalCallOrder = get().globalCallOrder + 1;
    set({ callCounts, globalCallOrder });
  },

  incrementHandlerCallCount: (endpointId, handlerId) => {
    const callCounts = new Map(get().callCounts);
    const existing = callCounts.get(endpointId) || {
      endpointId,
      count: 0,
      lastCalled: undefined,
      handlerCalls: new Map(),
    };

    if (!existing.handlerCalls) {
      existing.handlerCalls = new Map();
    }

    const handlerCount = existing.handlerCalls.get(handlerId) || 0;
    existing.handlerCalls.set(handlerId, handlerCount + 1);
    existing.count += 1;
    existing.lastCalled = Date.now();
    callCounts.set(endpointId, existing);

    const globalCallOrder = get().globalCallOrder + 1;
    set({ callCounts, globalCallOrder });
  },

  getHandlerCallCount: (endpointId, handlerId) => {
    const callCounts = get().callCounts;
    const existing = callCounts.get(endpointId);
    if (!existing || !existing.handlerCalls) {
      return 0;
    }
    return existing.handlerCalls.get(handlerId) || 0;
  },

  setCallCount: (endpointId, count) => {
    const callCounts = new Map(get().callCounts);
    callCounts.set(endpointId, {
      endpointId,
      count,
      lastCalled: Date.now(),
    });
    set({ callCounts });
  },

  addCallHistory: (entry) => {
    const history = [...get().callHistory];
    history.push({
      ...entry,
      fullUrl: entry.fullUrl || entry.path,
      id: `call-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    set({ callHistory: history });
  },

  clearCallHistory: () => {
    set({ callHistory: [] });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleFilterMethod: (method) => {
    const methods = new Set(get().filterMethods);
    if (methods.has(method)) {
      methods.delete(method);
      // If all methods are deselected, treat as all selected (empty set means all)
      // Don't force any method to stay selected
    } else {
      methods.add(method);
    }
    set({ filterMethods: methods });
  },
  setPanelOpen: (open) => set({ isPanelOpen: open }),
  setHistorySidebarOpen: (open) => set({ isHistorySidebarOpen: open }),

  togglePinEndpoint: (endpointId) => {
    const pinned = new Set(get().pinnedEndpoints);
    if (pinned.has(endpointId)) {
      pinned.delete(endpointId);
      // If last pinned endpoint is removed and filter is active, disable filter
      if (pinned.size === 0 && get().showPinnedOnly) {
        set({ pinnedEndpoints: pinned, showPinnedOnly: false });
        return;
      }
    } else {
      pinned.add(endpointId);
    }
    set({ pinnedEndpoints: pinned });
  },

  setShowPinnedOnly: (show) => {
    // Only allow enabling if there are pinned endpoints
    if (show && get().pinnedEndpoints.size === 0) {
      return;
    }
    set({ showPinnedOnly: show });
  },

  setShowMockedOnly: (show) => {
    // Only allow enabling if there are mocked endpoints
    if (show) {
      const mockedCount = Array.from(get().activeMocks.values()).filter(
        (m) => m.enabled
      ).length;
      if (mockedCount === 0) {
        return;
      }
    }
    set({ showMockedOnly: show });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setTheme: (theme) => {
    set({ theme });
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('msw-widget-theme', theme);
    }
  },

  reset: () => {
    set({
      ...initialState,
      activeMocks: new Map(),
      queues: new Map(),
      callCounts: new Map(),
      pinnedEndpoints: new Set<string>(),
      filterMethods: new Set<HttpMethod>(),
      showPinnedOnly: false,
      showMockedOnly: false,
    });
  },
}));
