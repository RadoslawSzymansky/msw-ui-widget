/* eslint-disable @typescript-eslint/no-explicit-any */
import { MswHandlerManager } from './mswHandlerManager';
import { Endpoint, HttpMethod, MockResponse, QueueItem } from './types';
import * as msw from 'msw';

// Mock MSW
vi.mock('msw', async () => {
  const actual = await vi.importActual('msw');
  return {
    ...actual,
    http: {
      get: vi.fn((_path: string, handler: any) => handler),
      post: vi.fn((_path: string, handler: any) => handler),
      put: vi.fn((_path: string, handler: any) => handler),
      delete: vi.fn((_path: string, handler: any) => handler),
      patch: vi.fn((_path: string, handler: any) => handler),
      head: vi.fn((_path: string, handler: any) => handler),
      options: vi.fn((_path: string, handler: any) => handler),
      all: vi.fn((_path: string, handler: any) => handler),
    },
    HttpResponse: {
      json: vi.fn((body: any, options?: any) => ({
        body,
        status: options?.status || 200,
        headers: options?.headers || {},
      })),
    },
  };
});

describe('MswHandlerManager', () => {
  let mockWorker: any;
  let onCallCallback: any;
  let manager: MswHandlerManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    onCallCallback = vi.fn();
    mockWorker = {
      use: vi.fn(),
      resetHandlers: vi.fn(),
    };

    manager = new MswHandlerManager(mockWorker, onCallCallback);
  });

  describe('constructor', () => {
    it('should initialize with worker and callback', () => {
      expect(manager).toBeInstanceOf(MswHandlerManager);
    });

    it('should initialize without callback', () => {
      const managerWithoutCallback = new MswHandlerManager(mockWorker);
      expect(managerWithoutCallback).toBeInstanceOf(MswHandlerManager);
    });
  });

  describe('getOriginalHandlerResponse', () => {
    it('should return null', async () => {
      const endpoint: Endpoint = {
        id: 'GET:/users',
        path: '/users',
        method: 'GET',
      };
      const request = new Request('http://localhost/users');

      const result = await manager.getOriginalHandlerResponse(
        endpoint,
        request
      );

      expect(result).toBeNull();
    });
  });

  describe('addHandler', () => {
    const endpoint: Endpoint = {
      id: 'GET:/users',
      path: '/users',
      method: 'GET',
    };
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1, name: 'John' },
    };

    it('should create and add handler for GET method', () => {
      manager.addHandler(endpoint, mockResponse, 'GET');

      expect(msw.http.get).toHaveBeenCalled();
      expect(mockWorker.use).toHaveBeenCalled();
    });

    it('should create and add handler for POST method', () => {
      manager.addHandler({ ...endpoint, method: 'POST' }, mockResponse, 'POST');

      expect(msw.http.post).toHaveBeenCalled();
    });

    it('should create and add handler for PUT method', () => {
      manager.addHandler({ ...endpoint, method: 'PUT' }, mockResponse, 'PUT');

      expect(msw.http.put).toHaveBeenCalled();
    });

    it('should create and add handler for DELETE method', () => {
      manager.addHandler(
        { ...endpoint, method: 'DELETE' },
        mockResponse,
        'DELETE'
      );

      expect(msw.http.delete).toHaveBeenCalled();
    });

    it('should create and add handler for PATCH method', () => {
      manager.addHandler(
        { ...endpoint, method: 'PATCH' },
        mockResponse,
        'PATCH'
      );

      expect(msw.http.patch).toHaveBeenCalled();
    });

    it('should create and add handler for ALL method', () => {
      manager.addHandler({ ...endpoint, method: 'ALL' }, mockResponse, 'ALL');

      expect(msw.http.all).toHaveBeenCalled();
    });

    it('should convert OpenAPI path format to MSW format', () => {
      const endpointWithParams: Endpoint = {
        id: 'GET:/users/{id}',
        path: '/users/{id}',
        method: 'GET',
      };

      manager.addHandler(endpointWithParams, mockResponse, 'GET');

      const callArgs = (msw.http.get as any).mock.calls[0];
      expect(callArgs[0]).toContain('/users/:id');
    });

    it('should use custom URL when provided', () => {
      manager.addHandler(
        endpoint,
        mockResponse,
        'GET',
        undefined,
        undefined,
        '/custom/path'
      );

      const callArgs = (msw.http.get as any).mock.calls[0];
      expect(callArgs[0]).toContain('/custom/path');
    });

    it('should throw error for unsupported HTTP method', () => {
      expect(() => {
        manager.addHandler(endpoint, mockResponse, 'INVALID' as HttpMethod);
      }).toThrow('Unsupported HTTP method');
    });

    it('should apply delay when specified', async () => {
      vi.useFakeTimers();
      const delay = 100;

      manager.addHandler(
        endpoint,
        mockResponse,
        'GET',
        undefined,
        undefined,
        undefined,
        delay
      );

      const handler = (msw.http.get as any).mock.results[0].value;
      const request = new Request('http://localhost/users');
      const handlerPromise = handler({ request });

      // Fast-forward time
      vi.advanceTimersByTime(delay);

      await handlerPromise;

      vi.useRealTimers();
    });

    it('should call onCallCallback when handler is invoked', async () => {
      manager.addHandler(endpoint, mockResponse, 'GET');

      const handler = (msw.http.get as any).mock.results[0].value;
      const request = new Request('http://localhost/users');
      await handler({ request });

      expect(onCallCallback).toHaveBeenCalledWith(
        endpoint.id,
        'GET',
        endpoint.path,
        undefined,
        request.url,
        undefined,
        mockResponse.body,
        mockResponse.status
      );
    });

    it('should extract JSON request body', async () => {
      const postEndpoint: Endpoint = {
        ...endpoint,
        method: 'POST',
        id: 'POST:/users',
      };
      manager.addHandler(postEndpoint, mockResponse, 'POST');

      const handler = (msw.http.post as any).mock.results[0].value;
      const requestBody = { name: 'John' };
      const request = new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Mock request.clone().json()
      vi.spyOn(request, 'clone').mockReturnValue({
        json: vi.fn().mockResolvedValue(requestBody),
      } as any);

      await handler({ request });

      expect(onCallCallback).toHaveBeenCalledWith(
        postEndpoint.id,
        'POST',
        postEndpoint.path,
        undefined,
        request.url,
        requestBody,
        mockResponse.body,
        mockResponse.status
      );
    });

    it('should extract text request body', async () => {
      manager.addHandler(endpoint, mockResponse, 'POST');

      const handler = (msw.http.post as any).mock.results[0].value;
      const requestBody = 'plain text';
      const request = new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: requestBody,
      });

      vi.spyOn(request, 'clone').mockReturnValue({
        text: vi.fn().mockResolvedValue(requestBody),
      } as any);

      await handler({ request });

      expect(onCallCallback).toHaveBeenCalled();
    });

    it('should use queue item when getNextQueueItem is provided', async () => {
      const queueResponse: MockResponse = {
        status: 201,
        body: { id: 2, name: 'Jane' },
      };
      const getNextQueueItem = vi.fn().mockReturnValue(queueResponse);

      manager.addHandler(endpoint, mockResponse, 'GET', getNextQueueItem);

      const handler = (msw.http.get as any).mock.results[0].value;
      const request = new Request('http://localhost/users');
      await handler({ request });

      expect(getNextQueueItem).toHaveBeenCalled();
      expect(onCallCallback).toHaveBeenCalledWith(
        endpoint.id,
        'GET',
        endpoint.path,
        undefined,
        request.url,
        undefined,
        queueResponse.body,
        queueResponse.status
      );
    });

    it('should use original response when queue returns null', async () => {
      const getNextQueueItem = vi.fn().mockReturnValue(null);

      manager.addHandler(endpoint, mockResponse, 'GET', getNextQueueItem);

      const handler = (msw.http.get as any).mock.results[0].value;
      const request = new Request('http://localhost/users');
      await handler({ request });

      expect(onCallCallback).toHaveBeenCalledWith(
        endpoint.id,
        'GET',
        endpoint.path,
        undefined,
        request.url,
        undefined,
        mockResponse.body,
        mockResponse.status
      );
    });

    it('should include handlerId when getCurrentHandlerId is provided', async () => {
      const handlerId = 'handler-123';
      const getCurrentHandlerId = vi.fn().mockReturnValue(handlerId);

      manager.addHandler(
        endpoint,
        mockResponse,
        'GET',
        undefined,
        getCurrentHandlerId
      );

      const handler = (msw.http.get as any).mock.results[0].value;
      const request = new Request('http://localhost/users');
      await handler({ request });

      expect(getCurrentHandlerId).toHaveBeenCalled();
      expect(onCallCallback).toHaveBeenCalledWith(
        endpoint.id,
        'GET',
        endpoint.path,
        handlerId,
        request.url,
        undefined,
        mockResponse.body,
        mockResponse.status
      );
    });

    it('should include custom headers in response', async () => {
      const responseWithHeaders: MockResponse = {
        status: 200,
        body: { id: 1 },
        headers: { 'X-Custom': 'value' },
      };

      // Clear previous calls to get clean state
      vi.clearAllMocks();

      manager.addHandler(endpoint, responseWithHeaders, 'GET');

      // Get the handler that was just created (last call)
      const handlerCalls = (msw.http.get as any).mock.results;
      const handler = handlerCalls[handlerCalls.length - 1].value;
      const request = new Request('http://localhost/users');

      // Invoke the handler to trigger HttpResponse.json call
      await handler({ request });

      expect(msw.HttpResponse.json).toHaveBeenCalledWith(
        responseWithHeaders.body,
        expect.objectContaining({
          status: 200,
          headers: expect.objectContaining({
            'X-Custom': 'value',
            'x-msw-widget': 'true',
          }),
        })
      );
    });
  });

  describe('addHandlerFromQueue', () => {
    const endpoint: Endpoint = {
      id: 'GET:/users',
      path: '/users',
      method: 'GET',
    };
    const queueItem: QueueItem = {
      id: 'item-1',
      method: 'GET',
      response: {
        status: 200,
        body: { id: 1 },
      },
    };

    it('should add handler from queue item', () => {
      const getNextQueueItem = vi.fn();
      const getCurrentHandlerId = vi.fn();

      manager.addHandlerFromQueue(
        endpoint,
        queueItem,
        getNextQueueItem,
        getCurrentHandlerId
      );

      expect(msw.http.get).toHaveBeenCalled();
      expect(mockWorker.use).toHaveBeenCalled();
    });

    it('should pass custom URL and delay', () => {
      const getNextQueueItem = vi.fn();
      const getCurrentHandlerId = vi.fn();

      manager.addHandlerFromQueue(
        endpoint,
        queueItem,
        getNextQueueItem,
        getCurrentHandlerId,
        '/custom',
        500
      );

      expect(msw.http.get).toHaveBeenCalled();
    });
  });

  describe('removeHandler', () => {
    const endpoint: Endpoint = {
      id: 'GET:/users',
      path: '/users',
      method: 'GET',
    };

    it('should remove handler and update worker', () => {
      manager.addHandler(endpoint, { status: 200, body: {} }, 'GET');
      expect(mockWorker.use).toHaveBeenCalled();
      vi.clearAllMocks();

      manager.removeHandler(endpoint, 'GET');

      // When removing, updateWorkerHandlers is called which calls resetHandlers when no handlers remain
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });

    it('should call resetHandlers when no handlers remain', () => {
      manager.addHandler(endpoint, { status: 200, body: {} }, 'GET');
      manager.removeHandler(endpoint, 'GET');

      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });
  });

  describe('removeAllHandlers', () => {
    it('should remove all handlers and update worker', () => {
      const endpoint1: Endpoint = {
        id: 'GET:/users',
        path: '/users',
        method: 'GET',
      };
      const endpoint2: Endpoint = {
        id: 'POST:/posts',
        path: '/posts',
        method: 'POST',
      };

      manager.addHandler(endpoint1, { status: 200, body: {} }, 'GET');
      manager.addHandler(endpoint2, { status: 200, body: {} }, 'POST');
      vi.clearAllMocks();

      manager.removeAllHandlers();

      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });
  });

  describe('setHandlerEnabled', () => {
    const endpoint: Endpoint = {
      id: 'GET:/users',
      path: '/users',
      method: 'GET',
    };

    it('should update worker when enabling handler', () => {
      manager.addHandler(endpoint, { status: 200, body: {} }, 'GET');
      vi.clearAllMocks();

      manager.setHandlerEnabled(endpoint, 'GET', true);

      expect(mockWorker.use).toHaveBeenCalled();
    });

    it('should remove handler when disabling', () => {
      manager.addHandler(endpoint, { status: 200, body: {} }, 'GET');
      vi.clearAllMocks();

      manager.setHandlerEnabled(endpoint, 'GET', false);

      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });
  });

  describe('updateWorkerHandlers', () => {
    it('should warn when worker is not available', () => {
      const managerWithoutWorker = new MswHandlerManager(null);
      const endpoint: Endpoint = {
        id: 'GET:/users',
        path: '/users',
        method: 'GET',
      };

      managerWithoutWorker.addHandler(
        endpoint,
        { status: 200, body: {} },
        'GET'
      );

      expect(console.warn).toHaveBeenCalledWith('MSW worker not available');
    });

    it('should handle errors when updating handlers', () => {
      mockWorker.use.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const endpoint: Endpoint = {
        id: 'GET:/users',
        path: '/users',
        method: 'GET',
      };

      expect(() => {
        manager.addHandler(endpoint, { status: 200, body: {} }, 'GET');
      }).not.toThrow();

      expect(console.error).toHaveBeenCalled();
    });

    it('should warn when resetHandlers is not available', () => {
      delete mockWorker.resetHandlers;

      const endpoint: Endpoint = {
        id: 'GET:/users',
        path: '/users',
        method: 'GET',
      };

      manager.addHandler(endpoint, { status: 200, body: {} }, 'GET');
      manager.removeHandler(endpoint, 'GET');

      expect(console.warn).toHaveBeenCalledWith(
        'MSW Widget: Cannot reset handlers - worker.resetHandlers not available'
      );
    });
  });
});
