import { useWidgetStore } from '../store/widgetStore';
import { CallHistoryEntry } from '../utils/types';

/**
 * Hook for managing call history
 */
export function useCallHistory() {
  const {
    callHistory,
    callCounts,
    addCallHistory,
    clearCallHistory,
    incrementCallCount,
  } = useWidgetStore();

  const getCallCount = (endpointId: string): number => {
    return callCounts.get(endpointId)?.count || 0;
  };

  const getLastCalled = (endpointId: string): number | undefined => {
    return callCounts.get(endpointId)?.lastCalled;
  };

  const getHistoryForEndpoint = (endpointId: string): CallHistoryEntry[] => {
    return callHistory.filter((entry) => entry.endpointId === endpointId);
  };

  return {
    callHistory,
    callCounts: Array.from(callCounts.values()),
    getCallCount,
    getLastCalled,
    getHistoryForEndpoint,
    addCallHistory,
    clearCallHistory,
    incrementCallCount,
  };
}
