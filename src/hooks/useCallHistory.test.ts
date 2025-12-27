import { renderHook } from '@testing-library/react';
import { useCallHistory } from './useCallHistory';
import { useWidgetStore } from '../store/widgetStore';

describe('useCallHistory', () => {
  beforeEach(() => {
    useWidgetStore.getState().reset();
  });

  it('should return call history and counts', () => {
    const endpointId = 'GET:/users';
    useWidgetStore.getState().incrementCallCount(endpointId);
    useWidgetStore.getState().addCallHistory({
      endpointId,
      method: 'GET',
      path: '/users',
      fullUrl: '/users',
    });

    const { result } = renderHook(() => useCallHistory());

    expect(result.current.callHistory.length).toBeGreaterThan(0);
    expect(result.current.callCounts.length).toBeGreaterThan(0);
  });

  it('should get call count for endpoint', () => {
    const endpointId = 'GET:/users';
    useWidgetStore.getState().incrementCallCount(endpointId);
    useWidgetStore.getState().incrementCallCount(endpointId);

    const { result } = renderHook(() => useCallHistory());

    expect(result.current.getCallCount(endpointId)).toBe(2);
  });

  it('should return 0 for non-existent endpoint', () => {
    const { result } = renderHook(() => useCallHistory());

    expect(result.current.getCallCount('non-existent')).toBe(0);
  });

  it('should get last called timestamp', () => {
    const endpointId = 'GET:/users';
    useWidgetStore.getState().incrementCallCount(endpointId);

    const { result } = renderHook(() => useCallHistory());

    expect(result.current.getLastCalled(endpointId)).toBeDefined();
  });

  it('should get history for specific endpoint', () => {
    const endpointId = 'GET:/users';
    useWidgetStore.getState().addCallHistory({
      endpointId,
      method: 'GET',
      path: '/users',
      fullUrl: '/users',
    });
    useWidgetStore.getState().addCallHistory({
      endpointId: 'POST:/posts',
      method: 'POST',
      path: '/posts',
      fullUrl: '/posts',
    });

    const { result } = renderHook(() => useCallHistory());

    const history = result.current.getHistoryForEndpoint(endpointId);
    expect(history.length).toBe(1);
    expect(history[0].endpointId).toBe(endpointId);
  });

  it('should clear call history', () => {
    useWidgetStore.getState().addCallHistory({
      endpointId: 'GET:/users',
      method: 'GET',
      path: '/users',
      fullUrl: '/users',
    });

    const { result, rerender } = renderHook(() => useCallHistory());

    result.current.clearCallHistory();
    rerender();

    expect(result.current.callHistory).toHaveLength(0);
  });

  it('should increment call count', () => {
    const endpointId = 'GET:/users';
    const { result, rerender } = renderHook(() => useCallHistory());

    result.current.incrementCallCount(endpointId);
    rerender();

    expect(result.current.getCallCount(endpointId)).toBe(1);
  });
});
