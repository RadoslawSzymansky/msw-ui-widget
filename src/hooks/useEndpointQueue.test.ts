import { renderHook } from '@testing-library/react';
import { useEndpointQueue } from './useEndpointQueue';
import { useWidgetStore } from '../store/widgetStore';
import { MockResponse } from '../utils/types';

describe('useEndpointQueue', () => {
  const endpointId = 'GET:/users';

  beforeEach(() => {
    useWidgetStore.getState().reset();
  });

  it('should return default queue when empty', () => {
    const { result } = renderHook(() => useEndpointQueue(endpointId));

    expect(result.current.queue.endpointId).toBe(endpointId);
    expect(result.current.queue.items).toEqual([]);
    expect(result.current.queue.currentIndex).toBe(0);
  });

  it('should add item to queue', () => {
    const { result, rerender } = renderHook(() => useEndpointQueue(endpointId));
    const mockResponse: MockResponse = { status: 200, body: { id: 1 } };

    const itemId = result.current.addItem('GET', mockResponse);
    rerender();

    expect(itemId).toBeDefined();
    expect(result.current.queue.items).toHaveLength(1);
    expect(result.current.queue.items[0].response).toEqual(mockResponse);
  });

  it('should remove item from queue', () => {
    const { result } = renderHook(() => useEndpointQueue(endpointId));
    const mockResponse: MockResponse = { status: 200, body: {} };

    const itemId = result.current.addItem('GET', mockResponse);
    result.current.removeItem(itemId);

    expect(result.current.queue.items).toHaveLength(0);
  });

  it('should get next queue item', () => {
    const { result } = renderHook(() => useEndpointQueue(endpointId));
    const item1: MockResponse = { status: 200, body: { id: 1 } };
    const item2: MockResponse = { status: 200, body: { id: 2 } };

    result.current.addItem('GET', item1);
    result.current.addItem('GET', item2);

    const next1 = result.current.getNext();
    expect(next1?.response).toEqual(item1);

    const next2 = result.current.getNext();
    expect(next2?.response).toEqual(item2);
  });

  it('should return null when queue is empty', () => {
    const { result } = renderHook(() => useEndpointQueue(endpointId));

    expect(result.current.getNext()).toBeNull();
  });

  it('should reset queue index', () => {
    const { result } = renderHook(() => useEndpointQueue(endpointId));
    result.current.addItem('GET', { status: 200, body: {} });
    result.current.getNext();

    result.current.reset();

    const queue = useWidgetStore.getState().queues.get(endpointId);
    expect(queue?.currentIndex).toBe(0);
  });

  it('should clear queue', () => {
    const { result } = renderHook(() => useEndpointQueue(endpointId));
    result.current.addItem('GET', { status: 200, body: {} });

    result.current.clear();

    const queue = useWidgetStore.getState().queues.get(endpointId);
    expect(queue).toBeUndefined();
  });
});
