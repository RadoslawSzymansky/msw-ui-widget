import { useWidgetStore } from '../store/widgetStore';
import { QueueItem, HttpMethod, MockResponse } from '../utils/types';

// Simple UUID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for managing endpoint response queue
 */
export function useEndpointQueue(endpointId: string) {
  const {
    queues,
    addToQueue,
    removeFromQueue,
    getNextQueueItem,
    resetQueue,
    clearQueue,
  } = useWidgetStore();

  const queue = queues.get(endpointId);

  const addItem = (method: HttpMethod, response: MockResponse): string => {
    const item: QueueItem = {
      id: generateId(),
      method,
      response,
    };
    addToQueue(endpointId, item);
    return item.id;
  };

  const removeItem = (itemId: string) => {
    removeFromQueue(endpointId, itemId);
  };

  const getNext = (): QueueItem | null => {
    return getNextQueueItem(endpointId);
  };

  const reset = () => {
    resetQueue(endpointId);
  };

  const clear = () => {
    clearQueue(endpointId);
  };

  return {
    queue: queue || { endpointId, items: [], currentIndex: 0 },
    addItem,
    removeItem,
    getNext,
    reset,
    clear,
  };
}
