/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { MswHandlerManager } from '../utils/mswHandlerManager';
import { Endpoint, HttpMethod, MockResponse } from '../utils/types';
import { useWidgetStore } from '../store/widgetStore';
import { setGlobalManager, getGlobalManager } from '../utils/mswHandlerUtils';

// Export function to reset global manager (for testing only)
export function __resetGlobalManager() {
  setGlobalManager(null);
}

/**
 * Hook for managing MSW handlers for a specific endpoint
 */
export function useMswHandler(endpoint: Endpoint | null) {
  const {
    activeMocks,
    queues,
    getNextQueueItem,
    incrementCallCount,
    addCallHistory,
    worker,
  } = useWidgetStore();

  // Initialize global manager once with call tracking
  const manager = useMemo(() => {
    if (worker) {
      const existingManager = getGlobalManager();
      if (existingManager) {
        return existingManager;
      }

      // Create callback for tracking calls using store functions directly
      const onCall = (
        endpointId: string,
        method: HttpMethod,
        path: string,
        handlerId?: string,
        fullUrl?: string,
        requestBody?: any,
        responseBody?: any,
        responseStatus?: number
      ) => {
        const store = useWidgetStore.getState();
        if (handlerId) {
          store.incrementHandlerCallCount(endpointId, handlerId);
        } else {
          store.incrementCallCount(endpointId);
        }
        store.addCallHistory({
          endpointId,
          method,
          path,
          fullUrl: fullUrl || path,
          request: {
            body: requestBody,
          },
          response: {
            status: responseStatus || 200,
            body: responseBody,
          },
        });
      };

      const newManager = new MswHandlerManager(worker, onCall);
      setGlobalManager(newManager);
      console.log('MSW Widget: Initialized handler manager');
      return newManager;
    }
    return null;
  }, [worker]);

  // Get active mock for this endpoint
  const getActiveMock = (
    method: HttpMethod
  ): { mock: any; isQueue: boolean } | null => {
    if (!endpoint) return null;

    const mockKey = `${endpoint.id}:${method}`;
    const mock = activeMocks.get(mockKey);

    if (!mock || !mock.enabled) return null;

    // Check if using queue
    if (mock.queueId) {
      const queue = queues.get(endpoint.id);
      if (queue && queue.items.length > 0) {
        return { mock, isQueue: true };
      }
    }

    if (mock.response) {
      return { mock, isQueue: false };
    }

    return null;
  };

  // Apply mock to MSW handler
  const applyMock = (method: HttpMethod) => {
    if (!endpoint || !manager) return;

    const activeMock = getActiveMock(method);
    if (!activeMock) return;

    if (activeMock.isQueue) {
      const queue = queues.get(endpoint.id);
      if (queue && queue.items.length > 0) {
        const firstItem = queue.items[0];
        // Use delay from queue item if available, otherwise from activeMock
        const itemDelay =
          firstItem.delay !== undefined
            ? firstItem.delay
            : (activeMock.mock.delay ?? 0);
        const getNextFromQueue = () => {
          const nextItem = getNextQueueItem(endpoint.id);
          return nextItem; // Return full QueueItem, not just response
        };
        const getCurrentHandlerId = () => {
          const store = useWidgetStore.getState();
          const currentQueue = store.queues.get(endpoint.id);
          if (currentQueue && currentQueue.items.length > 0) {
            // currentIndex points to the NEXT item, so current is one before
            const currentIndex =
              currentQueue.currentIndex === 0
                ? currentQueue.items.length - 1
                : currentQueue.currentIndex - 1;
            return currentQueue.items[currentIndex]?.id || null;
          }
          return null;
        };
        const customUrl = activeMock.mock.customUrl;
        manager.addHandlerFromQueue(
          endpoint,
          firstItem,
          getNextFromQueue,
          getCurrentHandlerId,
          customUrl,
          itemDelay
        );
      }
    } else if (activeMock.mock.response) {
      manager.addHandler(endpoint, activeMock.mock.response, method);
    }
  };

  // Add or update mock
  const setMock = (
    method: HttpMethod,
    response: MockResponse,
    queueId?: string,
    customUrl?: string,
    delay?: number
  ) => {
    if (!endpoint || !manager) {
      console.warn('MSW Widget: Cannot set mock - manager not initialized');
      return;
    }

    useWidgetStore
      .getState()
      .addMock(
        endpoint.id,
        method,
        response,
        queueId,
        undefined,
        customUrl,
        delay
      );

    // Get custom URL and delay from active mock if not provided
    const activeMock = useWidgetStore
      .getState()
      .activeMocks.get(`${endpoint.id}:${method}`);
    const urlToUse = customUrl || activeMock?.customUrl;
    const delayToUse = delay !== undefined ? delay : (activeMock?.delay ?? 0);

    // Apply immediately
    const queue = queues.get(endpoint.id);
    if (queue && queue.items.length > 0) {
      // Use queue - get first item and create handler with queue cycling
      const firstItem = queue.items[0];
      // Use delay from queue item if available, otherwise from activeMock or parameter
      const itemDelay =
        firstItem.delay !== undefined ? firstItem.delay : delayToUse;
      const getNextFromQueue = () => {
        const nextItem = getNextQueueItem(endpoint.id);
        return nextItem; // Return full QueueItem, not just response
      };
      const getCurrentHandlerId = () => {
        const store = useWidgetStore.getState();
        const currentQueue = store.queues.get(endpoint.id);
        if (currentQueue && currentQueue.items.length > 0) {
          // currentIndex points to the NEXT item, so current is one before
          const currentIndex =
            currentQueue.currentIndex === 0
              ? currentQueue.items.length - 1
              : currentQueue.currentIndex - 1;
          return currentQueue.items[currentIndex]?.id || null;
        }
        return null;
      };
      manager.addHandlerFromQueue(
        endpoint,
        firstItem,
        getNextFromQueue,
        getCurrentHandlerId,
        urlToUse,
        itemDelay
      );
    } else {
      // No queue, use single response
      manager.addHandler(
        endpoint,
        response,
        method,
        undefined,
        undefined,
        urlToUse,
        delayToUse
      );
    }
  };

  // Remove mock
  const removeMock = (method: HttpMethod) => {
    if (!endpoint || !manager) return;

    useWidgetStore.getState().removeMock(endpoint.id, method);
    manager.removeHandler(endpoint, method);
  };

  // Enable/disable mock
  const setMockEnabled = (method: HttpMethod, enabled: boolean) => {
    if (!endpoint || !manager) return;

    useWidgetStore.getState().setMockEnabled(endpoint.id, method, enabled);
    manager.setHandlerEnabled(endpoint, method, enabled);
  };

  // Track call
  const trackCall = (
    method: HttpMethod,
    request?: Request,
    response?: Response
  ) => {
    if (!endpoint) return;

    incrementCallCount(endpoint.id);

    addCallHistory({
      endpointId: endpoint.id,
      method,
      path: endpoint.path,
      fullUrl: request?.url || endpoint.path,
      request: request
        ? {
            headers: Object.fromEntries(request.headers.entries()),
          }
        : undefined,
      response: response
        ? {
            status: response.status,
          }
        : undefined,
    });
  };

  // Get original handler response (for default textarea value)
  const getOriginalResponse = async (
    _method: HttpMethod,
    request: Request
  ): Promise<MockResponse | null> => {
    if (!endpoint || !manager) return null;
    return manager.getOriginalHandlerResponse(endpoint, request);
  };

  return {
    setMock,
    removeMock,
    setMockEnabled,
    applyMock,
    trackCall,
    getOriginalResponse,
    getActiveMock,
  };
}
