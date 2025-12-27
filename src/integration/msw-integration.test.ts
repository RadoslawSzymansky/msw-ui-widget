/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWidgetStore } from '../store/widgetStore';
import { MswHandlerManager } from '../utils/mswHandlerManager';
import { Endpoint, MockResponse } from '../utils/types';

// Mock MSW
vi.mock('msw', () => ({
  http: {
    get: vi.fn((_path: string, handler: any) => handler),
    post: vi.fn((_path: string, handler: any) => handler),
  },
  HttpResponse: {
    json: vi.fn((body: any, options?: any) => ({
      body,
      status: options?.status || 200,
    })),
  },
}));

describe('MSW Integration', () => {
  let mockWorker: any;
  let manager: MswHandlerManager;
  const endpoint: Endpoint = {
    id: 'GET:/users',
    path: '/users',
    method: 'GET',
  };

  beforeEach(() => {
    useWidgetStore.getState().reset();
    mockWorker = {
      use: vi.fn(),
      resetHandlers: vi.fn(),
    };
    manager = new MswHandlerManager(mockWorker);
  });

  it('should add mock and track calls', async () => {
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1, name: 'John' },
    };

    useWidgetStore
      .getState()
      .addMock(endpoint.id, endpoint.method, mockResponse);
    manager.addHandler(endpoint, mockResponse, endpoint.method);

    expect(mockWorker.use).toHaveBeenCalled();
  });

  it('should cycle through queue', () => {
    const response1: MockResponse = { status: 200, body: { id: 1 } };
    const response2: MockResponse = { status: 200, body: { id: 2 } };

    useWidgetStore.getState().addToQueue(endpoint.id, {
      id: 'item-1',
      method: 'GET',
      response: response1,
    });
    useWidgetStore.getState().addToQueue(endpoint.id, {
      id: 'item-2',
      method: 'GET',
      response: response2,
    });

    const item1 = useWidgetStore.getState().getNextQueueItem(endpoint.id);
    expect(item1?.response).toEqual(response1);

    const item2 = useWidgetStore.getState().getNextQueueItem(endpoint.id);
    expect(item2?.response).toEqual(response2);
  });

  it('should track call history', () => {
    useWidgetStore.getState().incrementCallCount(endpoint.id);
    useWidgetStore.getState().addCallHistory({
      endpointId: endpoint.id,
      method: 'GET',
      path: '/users',
      fullUrl: 'http://localhost/users',
    });

    const history = useWidgetStore.getState().callHistory;
    expect(history.length).toBe(1);
    expect(history[0].endpointId).toBe(endpoint.id);
  });
});
