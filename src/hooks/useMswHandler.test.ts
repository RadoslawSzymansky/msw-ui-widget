/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from '@testing-library/react';
import { useMswHandler } from './useMswHandler';
import { useWidgetStore } from '../store/widgetStore';
import { MswHandlerManager } from '../utils/mswHandlerManager';
import { Endpoint, MockResponse } from '../utils/types';
import * as mswHandlerUtils from '../utils/mswHandlerUtils';

// Mock dependencies
vi.mock('../utils/mswHandlerManager');
vi.mock('../utils/mswHandlerUtils', () => ({
  setGlobalManager: vi.fn(),
  getGlobalManager: vi.fn(() => null),
  removeAllHandlers: vi.fn(),
  removeHandler: vi.fn(),
}));

describe('useMswHandler', () => {
  let mockWorker: any;
  let mockManager: any;
  let endpoint: Endpoint;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset store
    useWidgetStore.getState().reset();

    // Reset global manager
    const { __resetGlobalManager } = await import('./useMswHandler');
    __resetGlobalManager();

    // Setup mocks
    mockWorker = { use: vi.fn(), resetHandlers: vi.fn() };
    mockManager = {
      addHandler: vi.fn(),
      addHandlerFromQueue: vi.fn(),
      removeHandler: vi.fn(),
      setHandlerEnabled: vi.fn(),
      getOriginalHandlerResponse: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(MswHandlerManager).mockImplementation(() => mockManager);

    endpoint = {
      id: 'GET:/users',
      path: '/users',
      method: 'GET',
    };

    // Set worker in store - this will trigger manager creation
    useWidgetStore.getState().setWorker(mockWorker);

    // Setup getGlobalManager to return null initially
    vi.mocked(mswHandlerUtils.getGlobalManager).mockReturnValue(null);
  });

  describe('manager initialization', () => {
    it('should initialize manager when worker is available', () => {
      renderHook(() => useMswHandler(endpoint));

      expect(MswHandlerManager).toHaveBeenCalledWith(
        mockWorker,
        expect.any(Function)
      );
      expect(mswHandlerUtils.setGlobalManager).toHaveBeenCalled();
    });

    it('should not initialize manager when worker is not available', () => {
      useWidgetStore.getState().setWorker(null);
      vi.clearAllMocks();

      renderHook(() => useMswHandler(endpoint));

      expect(MswHandlerManager).not.toHaveBeenCalled();
    });

    it('should initialize manager only once', () => {
      const { rerender } = renderHook(() => useMswHandler(endpoint));
      vi.clearAllMocks();

      rerender();
      rerender();

      expect(MswHandlerManager).not.toHaveBeenCalled();
    });
  });

  describe('getActiveMock', () => {
    it('should return null when endpoint is null', () => {
      const { result } = renderHook(() => useMswHandler(null));

      expect(result.current.getActiveMock('GET')).toBeNull();
    });

    it('should return null when no mock exists', () => {
      const { result } = renderHook(() => useMswHandler(endpoint));

      expect(result.current.getActiveMock('GET')).toBeNull();
    });

    it('should return null when mock is disabled', () => {
      useWidgetStore
        .getState()
        .addMock(endpoint.id, 'GET', { status: 200, body: {} });
      useWidgetStore.getState().setMockEnabled(endpoint.id, 'GET', false);

      const { result } = renderHook(() => useMswHandler(endpoint));

      expect(result.current.getActiveMock('GET')).toBeNull();
    });

    it('should return mock without queue', () => {
      const mockResponse: MockResponse = { status: 200, body: { id: 1 } };
      useWidgetStore.getState().addMock(endpoint.id, 'GET', mockResponse);

      const { result } = renderHook(() => useMswHandler(endpoint));

      const activeMock = result.current.getActiveMock('GET');
      expect(activeMock).not.toBeNull();
      expect(activeMock?.isQueue).toBe(false);
      expect(activeMock?.mock.response).toEqual(mockResponse);
    });

    it('should return mock with queue', () => {
      const mockResponse: MockResponse = { status: 200, body: { id: 1 } };
      useWidgetStore
        .getState()
        .addMock(endpoint.id, 'GET', mockResponse, 'queue-1');
      useWidgetStore.getState().addToQueue(endpoint.id, {
        id: 'item-1',
        method: 'GET',
        response: mockResponse,
      });

      const { result } = renderHook(() => useMswHandler(endpoint));

      const activeMock = result.current.getActiveMock('GET');
      expect(activeMock).not.toBeNull();
      expect(activeMock?.isQueue).toBe(true);
    });

    it('should return null when queue is empty', () => {
      useWidgetStore
        .getState()
        .addMock(endpoint.id, 'GET', { status: 200, body: {} }, 'queue-1');

      const { result } = renderHook(() => useMswHandler(endpoint));

      expect(result.current.getActiveMock('GET')).toBeNull();
    });
  });

  describe('setMock', () => {
    it('should add mock to store and manager', async () => {
      const mockResponse: MockResponse = { status: 200, body: { id: 1 } };
      const { result } = renderHook(() => useMswHandler(endpoint));

      // Wait for manager to be initialized
      await waitFor(() => {
        expect(result.current.setMock).toBeDefined();
      });

      // Wait a bit more for manager to be ready
      await new Promise((resolve) => setTimeout(resolve, 10));

      result.current.setMock('GET', mockResponse);

      await waitFor(() => {
        expect(mockManager.addHandler).toHaveBeenCalled();
      });

      expect(mockManager.addHandler).toHaveBeenCalledWith(
        endpoint,
        mockResponse,
        'GET',
        undefined,
        undefined,
        undefined,
        0 // delay defaults to 0
      );
    });

    it('should handle queue when queue exists', async () => {
      const mockResponse: MockResponse = { status: 200, body: { id: 1 } };
      useWidgetStore.getState().addToQueue(endpoint.id, {
        id: 'item-1',
        method: 'GET',
        response: mockResponse,
      });

      const { result } = renderHook(() => useMswHandler(endpoint));

      await waitFor(() => {
        expect(result.current.setMock).toBeDefined();
      });

      // Wait a bit more for manager to be ready
      await new Promise((resolve) => setTimeout(resolve, 10));

      result.current.setMock('GET', mockResponse);

      await waitFor(() => {
        expect(mockManager.addHandlerFromQueue).toHaveBeenCalled();
      });
    });

    it('should use custom URL and delay', async () => {
      const mockResponse: MockResponse = { status: 200, body: {} };
      const { result } = renderHook(() => useMswHandler(endpoint));

      await waitFor(() => {
        expect(result.current.setMock).toBeDefined();
      });

      // Wait a bit more for manager to be ready
      await new Promise((resolve) => setTimeout(resolve, 10));

      result.current.setMock('GET', mockResponse, undefined, '/custom', 500);

      await waitFor(() => {
        expect(mockManager.addHandler).toHaveBeenCalledWith(
          endpoint,
          mockResponse,
          'GET',
          undefined,
          undefined,
          '/custom',
          500
        );
      });
    });

    it('should warn when manager is not initialized', async () => {
      const { __resetGlobalManager } = await import('./useMswHandler');
      __resetGlobalManager();
      useWidgetStore.getState().setWorker(null);
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useMswHandler(endpoint));

      result.current.setMock('GET', { status: 200, body: {} });

      expect(spy).toHaveBeenCalledWith(
        'MSW Widget: Cannot set mock - manager not initialized'
      );
    });
  });

  describe('removeMock', () => {
    it('should remove mock from store and manager', async () => {
      useWidgetStore
        .getState()
        .addMock(endpoint.id, 'GET', { status: 200, body: {} });
      const { result } = renderHook(() => useMswHandler(endpoint));

      await waitFor(() => {
        expect(result.current.removeMock).toBeDefined();
      });

      // Wait a bit more for manager to be ready
      await new Promise((resolve) => setTimeout(resolve, 10));

      result.current.removeMock('GET');

      await waitFor(() => {
        expect(mockManager.removeHandler).toHaveBeenCalled();
      });

      const mock = useWidgetStore
        .getState()
        .activeMocks.get(`${endpoint.id}:GET`);
      expect(mock).toBeUndefined();
      expect(mockManager.removeHandler).toHaveBeenCalledWith(endpoint, 'GET');
    });

    it('should not throw when manager is not initialized', () => {
      useWidgetStore.getState().setWorker(null);
      const { result } = renderHook(() => useMswHandler(endpoint));

      expect(() => result.current.removeMock('GET')).not.toThrow();
    });
  });

  describe('setMockEnabled', () => {
    it('should enable/disable mock', async () => {
      useWidgetStore
        .getState()
        .addMock(endpoint.id, 'GET', { status: 200, body: {} });
      const { result } = renderHook(() => useMswHandler(endpoint));

      await waitFor(() => {
        expect(result.current.setMockEnabled).toBeDefined();
      });

      // Wait a bit more for manager to be ready
      await new Promise((resolve) => setTimeout(resolve, 10));

      result.current.setMockEnabled('GET', false);
      await waitFor(() => {
        expect(mockManager.setHandlerEnabled).toHaveBeenCalledWith(
          endpoint,
          'GET',
          false
        );
      });

      result.current.setMockEnabled('GET', true);
      await waitFor(() => {
        expect(mockManager.setHandlerEnabled).toHaveBeenCalledWith(
          endpoint,
          'GET',
          true
        );
      });
    });
  });

  describe('applyMock', () => {
    it('should apply mock with queue', async () => {
      const mockResponse: MockResponse = { status: 200, body: {} };
      useWidgetStore
        .getState()
        .addMock(endpoint.id, 'GET', mockResponse, 'queue-1');
      useWidgetStore.getState().addToQueue(endpoint.id, {
        id: 'item-1',
        method: 'GET',
        response: mockResponse,
      });

      const { result } = renderHook(() => useMswHandler(endpoint));

      await waitFor(() => {
        expect(result.current.applyMock).toBeDefined();
      });

      // Wait a bit more for manager to be ready
      await new Promise((resolve) => setTimeout(resolve, 10));

      result.current.applyMock('GET');

      await waitFor(() => {
        expect(mockManager.addHandlerFromQueue).toHaveBeenCalled();
      });
    });

    it('should apply mock without queue', async () => {
      const mockResponse: MockResponse = { status: 200, body: {} };
      useWidgetStore.getState().addMock(endpoint.id, 'GET', mockResponse);

      const { result } = renderHook(() => useMswHandler(endpoint));

      await waitFor(() => {
        expect(result.current.applyMock).toBeDefined();
      });

      // Wait a bit more for manager to be ready
      await new Promise((resolve) => setTimeout(resolve, 10));

      result.current.applyMock('GET');

      await waitFor(() => {
        expect(mockManager.addHandler).toHaveBeenCalled();
      });
    });
  });

  describe('trackCall', () => {
    it('should increment call count and add history', () => {
      const { result } = renderHook(() => useMswHandler(endpoint));
      const request = new Request('http://localhost/users');
      const response = new Response(JSON.stringify({ id: 1 }), { status: 200 });

      result.current.trackCall('GET', request, response);

      const callCount = useWidgetStore.getState().callCounts.get(endpoint.id);
      expect(callCount?.count).toBe(1);

      const history = useWidgetStore.getState().callHistory;
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('getOriginalResponse', () => {
    it('should call manager getOriginalHandlerResponse', async () => {
      const mockResponse: MockResponse = { status: 200, body: { id: 1 } };
      mockManager.getOriginalHandlerResponse.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMswHandler(endpoint));

      await waitFor(() => {
        expect(result.current.getOriginalResponse).toBeDefined();
      });

      // Wait a bit more for manager to be ready
      await new Promise((resolve) => setTimeout(resolve, 10));

      const request = new Request('http://localhost/users');
      const response = await result.current.getOriginalResponse('GET', request);

      expect(mockManager.getOriginalHandlerResponse).toHaveBeenCalledWith(
        endpoint,
        request
      );
      expect(response).toEqual(mockResponse);
    });

    it('should return null when manager is not initialized', async () => {
      useWidgetStore.getState().setWorker(null);
      const { result } = renderHook(() => useMswHandler(endpoint));
      const request = new Request('http://localhost/users');

      const response = await result.current.getOriginalResponse('GET', request);

      expect(response).toBeNull();
    });
  });
});
