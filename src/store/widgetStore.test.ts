import { useWidgetStore } from './widgetStore';
import { Endpoint, HttpMethod, MockResponse, QueueItem } from '../utils/types';
import * as mswHandlerUtils from '../utils/mswHandlerUtils';

// Mock mswHandlerUtils
vi.mock('../utils/mswHandlerUtils', () => ({
  removeAllHandlers: vi.fn(),
}));

describe('widgetStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useWidgetStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useWidgetStore.getState();

      expect(state.endpoints).toEqual([]);
      expect(state.activeMocks.size).toBe(0);
      expect(state.queues.size).toBe(0);
      expect(state.callCounts.size).toBe(0);
      expect(state.callHistory).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.isPanelOpen).toBe(false);
      expect(state.isHistorySidebarOpen).toBe(false);
      expect(state.worker).toBeNull();
      expect(state.baseUrl).toBeUndefined();
      expect(state.pinnedEndpoints.size).toBe(0);
      expect(state.showPinnedOnly).toBe(false);
      expect(state.showMockedOnly).toBe(false);
      expect(state.viewMode).toBe('mocks');
      expect(state.filterMethods.size).toBe(0);
    });
  });

  describe('setWorker', () => {
    it('should set worker', () => {
      const mockWorker = { use: vi.fn() };
      useWidgetStore.getState().setWorker(mockWorker);

      expect(useWidgetStore.getState().worker).toBe(mockWorker);
    });
  });

  describe('setEndpoints', () => {
    it('should set endpoints', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/users', path: '/users', method: 'GET' },
        { id: 'POST:/posts', path: '/posts', method: 'POST' },
      ];

      useWidgetStore.getState().setEndpoints(endpoints);

      expect(useWidgetStore.getState().endpoints).toEqual(endpoints);
    });
  });

  describe('setBaseUrl', () => {
    it('should set baseUrl', () => {
      const baseUrl = 'https://api.example.com';
      useWidgetStore.getState().setBaseUrl(baseUrl);

      expect(useWidgetStore.getState().baseUrl).toBe(baseUrl);
    });

    it('should set baseUrl to undefined', () => {
      useWidgetStore.getState().setBaseUrl('https://api.example.com');
      useWidgetStore.getState().setBaseUrl(undefined);

      expect(useWidgetStore.getState().baseUrl).toBeUndefined();
    });
  });

  describe('mock management', () => {
    const endpointId = 'GET:/users';
    const method: HttpMethod = 'GET';
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1, name: 'John' },
    };

    describe('addMock', () => {
      it('should add mock without queue', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock).toBeDefined();
        expect(mock?.response).toEqual(mockResponse);
        expect(mock?.enabled).toBe(true);
        expect(mock?.queueId).toBeUndefined();
      });

      it('should add mock with queue', () => {
        const queueId = 'queue-1';
        useWidgetStore
          .getState()
          .addMock(endpointId, method, mockResponse, queueId);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.queueId).toBe(queueId);
        expect(mock?.response).toBeUndefined();
      });

      it('should add mock with custom name', () => {
        useWidgetStore
          .getState()
          .addMock(endpointId, method, mockResponse, undefined, 'Custom Mock');

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.name).toBe('Custom Mock');
      });

      it('should add mock with custom URL', () => {
        const customUrl = '/custom/path';
        useWidgetStore
          .getState()
          .addMock(
            endpointId,
            method,
            mockResponse,
            undefined,
            undefined,
            customUrl
          );

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.customUrl).toBe(customUrl);
      });

      it('should add mock with delay', () => {
        const delay = 500;
        useWidgetStore
          .getState()
          .addMock(
            endpointId,
            method,
            mockResponse,
            undefined,
            undefined,
            undefined,
            delay
          );

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.delay).toBe(delay);
      });

      it('should use default name when not provided', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.name).toBe('Mock');
      });

      it('should use default name for queue handler', () => {
        useWidgetStore
          .getState()
          .addMock(endpointId, method, mockResponse, 'queue-1');

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.name).toBe('Handler');
      });
    });

    describe('updateMock', () => {
      it('should update existing mock', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);
        const newResponse: MockResponse = { status: 201, body: { id: 2 } };

        useWidgetStore.getState().updateMock(endpointId, method, newResponse);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.response).toEqual(newResponse);
      });

      it('should not update non-existent mock', () => {
        const newResponse: MockResponse = { status: 201, body: { id: 2 } };

        useWidgetStore.getState().updateMock(endpointId, method, newResponse);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock).toBeUndefined();
      });

      it('should update mock name', () => {
        useWidgetStore
          .getState()
          .addMock(endpointId, method, mockResponse, undefined, 'Old Name');
        useWidgetStore
          .getState()
          .updateMock(endpointId, method, mockResponse, undefined, 'New Name');

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.name).toBe('New Name');
      });

      it('should preserve existing name when not provided', () => {
        useWidgetStore
          .getState()
          .addMock(
            endpointId,
            method,
            mockResponse,
            undefined,
            'Original Name'
          );
        useWidgetStore.getState().updateMock(endpointId, method, mockResponse);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.name).toBe('Original Name');
      });
    });

    describe('setMockName', () => {
      it('should set mock name', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);
        useWidgetStore.getState().setMockName(endpointId, method, 'New Name');

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.name).toBe('New Name');
      });
    });

    describe('removeMock', () => {
      it('should remove mock', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);
        useWidgetStore.getState().removeMock(endpointId, method);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock).toBeUndefined();
      });

      it('should clear queue when removing mock', () => {
        useWidgetStore
          .getState()
          .addMock(endpointId, method, mockResponse, 'queue-1');
        useWidgetStore.getState().addToQueue(endpointId, {
          id: 'item-1',
          method,
          response: mockResponse,
        });
        useWidgetStore.getState().removeMock(endpointId, method);

        const queue = useWidgetStore.getState().queues.get(endpointId);
        expect(queue).toBeUndefined();
      });

      it('should disable showMockedOnly filter when last mock is removed', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);
        useWidgetStore.getState().setShowMockedOnly(true);
        useWidgetStore.getState().removeMock(endpointId, method);

        expect(useWidgetStore.getState().showMockedOnly).toBe(false);
      });
    });

    describe('removeAllMocks', () => {
      it('should remove all mocks, queues, and call counts', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);
        useWidgetStore.getState().addMock('POST:/posts', 'POST', mockResponse);
        useWidgetStore.getState().incrementCallCount(endpointId);

        useWidgetStore.getState().removeAllMocks();

        expect(useWidgetStore.getState().activeMocks.size).toBe(0);
        expect(useWidgetStore.getState().queues.size).toBe(0);
        expect(useWidgetStore.getState().callCounts.size).toBe(0);
        expect(mswHandlerUtils.removeAllHandlers).toHaveBeenCalled();
      });
    });

    describe('setMockEnabled', () => {
      it('should enable mock', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);
        useWidgetStore.getState().setMockEnabled(endpointId, method, false);
        useWidgetStore.getState().setMockEnabled(endpointId, method, true);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.enabled).toBe(true);
      });

      it('should disable mock', () => {
        useWidgetStore.getState().addMock(endpointId, method, mockResponse);
        useWidgetStore.getState().setMockEnabled(endpointId, method, false);

        const mock = useWidgetStore
          .getState()
          .activeMocks.get(`${endpointId}:${method}`);
        expect(mock?.enabled).toBe(false);
      });
    });
  });

  describe('queue management', () => {
    const endpointId = 'GET:/users';
    const queueItem: QueueItem = {
      id: 'item-1',
      method: 'GET',
      response: { status: 200, body: { id: 1 } },
    };

    describe('addToQueue', () => {
      it('should add item to queue', () => {
        useWidgetStore.getState().addToQueue(endpointId, queueItem);

        const queue = useWidgetStore.getState().queues.get(endpointId);
        expect(queue).toBeDefined();
        expect(queue?.items).toHaveLength(1);
        expect(queue?.items[0]).toEqual(queueItem);
      });

      it('should generate default name when not provided', () => {
        const itemWithoutName: QueueItem = {
          id: 'item-1',
          method: 'GET',
          response: { status: 200, body: {} },
        };
        useWidgetStore.getState().addToQueue(endpointId, itemWithoutName);

        const queue = useWidgetStore.getState().queues.get(endpointId);
        expect(queue?.items[0].name).toBe('Mock 1');
      });

      it('should increment name number for subsequent items', () => {
        useWidgetStore.getState().addToQueue(endpointId, queueItem);
        const item2: QueueItem = {
          id: 'item-2',
          method: 'GET',
          response: { status: 200, body: {} },
        };
        useWidgetStore.getState().addToQueue(endpointId, item2);

        const queue = useWidgetStore.getState().queues.get(endpointId);
        expect(queue?.items[1].name).toBe('Mock 2');
      });
    });

    describe('removeFromQueue', () => {
      it('should remove item from queue', () => {
        useWidgetStore.getState().addToQueue(endpointId, queueItem);
        expect(
          useWidgetStore.getState().queues.get(endpointId)?.items
        ).toHaveLength(1);

        useWidgetStore.getState().removeFromQueue(endpointId, queueItem.id);

        const queue = useWidgetStore.getState().queues.get(endpointId);
        expect(queue).toBeUndefined(); // Queue should be deleted when empty
      });

      it('should delete queue when last item is removed', () => {
        useWidgetStore.getState().addToQueue(endpointId, queueItem);
        useWidgetStore.getState().removeFromQueue(endpointId, 'item-1');

        const queue = useWidgetStore.getState().queues.get(endpointId);
        expect(queue).toBeUndefined();
      });
    });

    describe('getNextQueueItem', () => {
      it('should return next item and cycle', () => {
        const item1: QueueItem = {
          id: 'item-1',
          method: 'GET',
          response: { status: 200, body: { id: 1 } },
        };
        const item2: QueueItem = {
          id: 'item-2',
          method: 'GET',
          response: { status: 200, body: { id: 2 } },
        };
        useWidgetStore.getState().addToQueue(endpointId, item1);
        useWidgetStore.getState().addToQueue(endpointId, item2);

        const first = useWidgetStore.getState().getNextQueueItem(endpointId);
        expect(first).toEqual(item1);

        const second = useWidgetStore.getState().getNextQueueItem(endpointId);
        expect(second).toEqual(item2);

        const third = useWidgetStore.getState().getNextQueueItem(endpointId);
        expect(third).toEqual(item1); // Should cycle back
      });

      it('should return null for empty queue', () => {
        const result = useWidgetStore.getState().getNextQueueItem(endpointId);
        expect(result).toBeNull();
      });

      it('should return null for non-existent queue', () => {
        const result = useWidgetStore
          .getState()
          .getNextQueueItem('non-existent');
        expect(result).toBeNull();
      });
    });

    describe('resetQueue', () => {
      it('should reset queue index to 0', () => {
        const item1: QueueItem = {
          id: 'item-1',
          method: 'GET',
          response: { status: 200, body: {} },
        };
        const item2: QueueItem = {
          id: 'item-2',
          method: 'GET',
          response: { status: 200, body: {} },
        };
        useWidgetStore.getState().addToQueue(endpointId, item1);
        useWidgetStore.getState().addToQueue(endpointId, item2);
        useWidgetStore.getState().getNextQueueItem(endpointId);

        useWidgetStore.getState().resetQueue(endpointId);

        const queue = useWidgetStore.getState().queues.get(endpointId);
        expect(queue?.currentIndex).toBe(0);
      });
    });

    describe('clearQueue', () => {
      it('should clear queue', () => {
        useWidgetStore.getState().addToQueue(endpointId, queueItem);
        useWidgetStore.getState().clearQueue(endpointId);

        const queue = useWidgetStore.getState().queues.get(endpointId);
        expect(queue).toBeUndefined();
      });
    });
  });

  describe('call tracking', () => {
    const endpointId = 'GET:/users';

    describe('incrementCallCount', () => {
      it('should increment call count', () => {
        useWidgetStore.getState().incrementCallCount(endpointId);
        useWidgetStore.getState().incrementCallCount(endpointId);

        const callCount = useWidgetStore.getState().callCounts.get(endpointId);
        expect(callCount?.count).toBe(2);
        expect(callCount?.lastCalled).toBeDefined();
      });

      it('should increment globalCallOrder', () => {
        const initialOrder = useWidgetStore.getState().globalCallOrder;
        useWidgetStore.getState().incrementCallCount(endpointId);

        expect(useWidgetStore.getState().globalCallOrder).toBe(
          initialOrder + 1
        );
      });
    });

    describe('incrementHandlerCallCount', () => {
      it('should increment handler call count', () => {
        const handlerId = 'handler-1';
        useWidgetStore
          .getState()
          .incrementHandlerCallCount(endpointId, handlerId);

        const count = useWidgetStore
          .getState()
          .getHandlerCallCount(endpointId, handlerId);
        expect(count).toBe(1);
      });

      it('should also increment endpoint call count', () => {
        const handlerId = 'handler-1';
        useWidgetStore
          .getState()
          .incrementHandlerCallCount(endpointId, handlerId);

        const callCount = useWidgetStore.getState().callCounts.get(endpointId);
        expect(callCount?.count).toBe(1);
      });
    });

    describe('setCallCount', () => {
      it('should set call count', () => {
        useWidgetStore.getState().setCallCount(endpointId, 5);

        const callCount = useWidgetStore.getState().callCounts.get(endpointId);
        expect(callCount?.count).toBe(5);
      });
    });

    describe('getHandlerCallCount', () => {
      it('should return handler call count', () => {
        const handlerId = 'handler-1';
        useWidgetStore
          .getState()
          .incrementHandlerCallCount(endpointId, handlerId);
        useWidgetStore
          .getState()
          .incrementHandlerCallCount(endpointId, handlerId);

        const count = useWidgetStore
          .getState()
          .getHandlerCallCount(endpointId, handlerId);
        expect(count).toBe(2);
      });

      it('should return 0 for non-existent handler', () => {
        const count = useWidgetStore
          .getState()
          .getHandlerCallCount(endpointId, 'non-existent');
        expect(count).toBe(0);
      });
    });

    describe('addCallHistory', () => {
      it('should add call history entry', () => {
        useWidgetStore.getState().addCallHistory({
          endpointId,
          method: 'GET',
          path: '/users',
          fullUrl: 'http://localhost/users',
        });

        const history = useWidgetStore.getState().callHistory;
        expect(history).toHaveLength(1);
        expect(history[0].endpointId).toBe(endpointId);
        expect(history[0].id).toBeDefined();
        expect(history[0].timestamp).toBeDefined();
      });

      it('should limit history to 100 entries', () => {
        for (let i = 0; i < 150; i++) {
          useWidgetStore.getState().addCallHistory({
            endpointId,
            method: 'GET',
            path: '/users',
            fullUrl: '/users',
          });
        }

        const history = useWidgetStore.getState().callHistory;
        expect(history).toHaveLength(100);
      });
    });

    describe('clearCallHistory', () => {
      it('should clear call history', () => {
        useWidgetStore.getState().addCallHistory({
          endpointId,
          method: 'GET',
          path: '/users',
          fullUrl: '/users',
        });
        useWidgetStore.getState().clearCallHistory();

        expect(useWidgetStore.getState().callHistory).toHaveLength(0);
      });
    });
  });

  describe('UI state', () => {
    describe('setSearchQuery', () => {
      it('should set search query', () => {
        useWidgetStore.getState().setSearchQuery('test query');
        expect(useWidgetStore.getState().searchQuery).toBe('test query');
      });
    });

    describe('toggleFilterMethod', () => {
      it('should add method to filter', () => {
        useWidgetStore.getState().toggleFilterMethod('GET');
        expect(useWidgetStore.getState().filterMethods.has('GET')).toBe(true);
      });

      it('should remove method from filter', () => {
        // Start with empty filterMethods
        expect(useWidgetStore.getState().filterMethods.has('GET')).toBe(false);

        // Add GET
        useWidgetStore.getState().toggleFilterMethod('GET');
        expect(useWidgetStore.getState().filterMethods.has('GET')).toBe(true);

        // Remove GET
        useWidgetStore.getState().toggleFilterMethod('GET');
        expect(useWidgetStore.getState().filterMethods.has('GET')).toBe(false);
      });
    });

    describe('setPanelOpen', () => {
      it('should set panel open state', () => {
        useWidgetStore.getState().setPanelOpen(true);
        expect(useWidgetStore.getState().isPanelOpen).toBe(true);
      });
    });

    describe('setHistorySidebarOpen', () => {
      it('should set history sidebar open state', () => {
        useWidgetStore.getState().setHistorySidebarOpen(true);
        expect(useWidgetStore.getState().isHistorySidebarOpen).toBe(true);
      });
    });

    describe('togglePinEndpoint', () => {
      it('should pin endpoint', () => {
        useWidgetStore.getState().togglePinEndpoint('endpoint-1');
        expect(
          useWidgetStore.getState().pinnedEndpoints.has('endpoint-1')
        ).toBe(true);
      });

      it('should unpin endpoint', () => {
        // Start with empty pinnedEndpoints
        expect(
          useWidgetStore.getState().pinnedEndpoints.has('endpoint-1')
        ).toBe(false);

        // Pin endpoint
        useWidgetStore.getState().togglePinEndpoint('endpoint-1');
        expect(
          useWidgetStore.getState().pinnedEndpoints.has('endpoint-1')
        ).toBe(true);

        // Unpin endpoint
        useWidgetStore.getState().togglePinEndpoint('endpoint-1');
        expect(
          useWidgetStore.getState().pinnedEndpoints.has('endpoint-1')
        ).toBe(false);
      });

      it('should disable showPinnedOnly when last pinned is removed', () => {
        useWidgetStore.getState().togglePinEndpoint('endpoint-1');
        useWidgetStore.getState().setShowPinnedOnly(true);
        useWidgetStore.getState().togglePinEndpoint('endpoint-1');

        expect(useWidgetStore.getState().showPinnedOnly).toBe(false);
      });
    });

    describe('setShowPinnedOnly', () => {
      it('should enable filter when endpoints are pinned', () => {
        const endpointId = 'GET:/users';
        useWidgetStore.getState().togglePinEndpoint(endpointId);
        expect(useWidgetStore.getState().pinnedEndpoints.size).toBeGreaterThan(
          0
        );

        useWidgetStore.getState().setShowPinnedOnly(true);

        expect(useWidgetStore.getState().showPinnedOnly).toBe(true);
      });

      it('should not enable filter when no endpoints are pinned', () => {
        // Ensure no endpoints are pinned
        expect(useWidgetStore.getState().pinnedEndpoints.size).toBe(0);

        // Try to enable filter
        useWidgetStore.getState().setShowPinnedOnly(true);

        // Should remain false because no endpoints are pinned
        expect(useWidgetStore.getState().showPinnedOnly).toBe(false);
      });
    });

    describe('setShowMockedOnly', () => {
      it('should enable filter when mocks exist', () => {
        useWidgetStore
          .getState()
          .addMock('GET:/users', 'GET', { status: 200, body: {} });
        useWidgetStore.getState().setShowMockedOnly(true);

        expect(useWidgetStore.getState().showMockedOnly).toBe(true);
      });

      it('should not enable filter when no mocks exist', () => {
        // Ensure no mocks exist and filter is disabled
        useWidgetStore.getState().removeAllMocks();
        useWidgetStore.getState().setShowMockedOnly(false);
        expect(useWidgetStore.getState().activeMocks.size).toBe(0);
        expect(useWidgetStore.getState().showMockedOnly).toBe(false);

        // Try to enable filter
        useWidgetStore.getState().setShowMockedOnly(true);

        // Should remain false because no mocks exist
        expect(useWidgetStore.getState().showMockedOnly).toBe(false);
      });
    });

    describe('setViewMode', () => {
      it('should set view mode', () => {
        useWidgetStore.getState().setViewMode('history');
        expect(useWidgetStore.getState().viewMode).toBe('history');
      });
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      useWidgetStore
        .getState()
        .setEndpoints([{ id: '1', path: '/test', method: 'GET' }]);
      useWidgetStore.getState().setBaseUrl('https://api.example.com');
      useWidgetStore
        .getState()
        .addMock('GET:/users', 'GET', { status: 200, body: {} });
      useWidgetStore.getState().setSearchQuery('test');
      useWidgetStore.getState().setPanelOpen(true);

      useWidgetStore.getState().reset();

      const state = useWidgetStore.getState();
      expect(state.endpoints).toEqual([]);
      expect(state.activeMocks.size).toBe(0);
      expect(state.queues.size).toBe(0);
      expect(state.callCounts.size).toBe(0);
      expect(state.callHistory).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.isPanelOpen).toBe(false);
    });
  });
});
