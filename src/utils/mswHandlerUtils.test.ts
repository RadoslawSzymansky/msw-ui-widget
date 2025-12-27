import {
  setGlobalManager,
  getGlobalManager,
  removeAllHandlers,
  removeHandler,
} from './mswHandlerUtils';
import { MswHandlerManager } from './mswHandlerManager';
import { Endpoint, HttpMethod } from './types';

describe('mswHandlerUtils', () => {
  let mockManager: MswHandlerManager;

  beforeEach(() => {
    // Reset global manager before each test
    setGlobalManager(null);

    // Create mock manager
    mockManager = {
      removeAllHandlers: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as MswHandlerManager;
  });

  describe('setGlobalManager', () => {
    it('should set the global manager', () => {
      setGlobalManager(mockManager);
      expect(getGlobalManager()).toBe(mockManager);
    });

    it('should allow setting null', () => {
      setGlobalManager(mockManager);
      setGlobalManager(null);
      expect(getGlobalManager()).toBeNull();
    });
  });

  describe('getGlobalManager', () => {
    it('should return null when no manager is set', () => {
      expect(getGlobalManager()).toBeNull();
    });

    it('should return the set manager', () => {
      setGlobalManager(mockManager);
      expect(getGlobalManager()).toBe(mockManager);
    });
  });

  describe('removeAllHandlers', () => {
    it('should call removeAllHandlers on manager when manager is set', () => {
      setGlobalManager(mockManager);
      removeAllHandlers();
      expect(mockManager.removeAllHandlers).toHaveBeenCalledOnce();
    });

    it('should not throw when manager is null', () => {
      setGlobalManager(null);
      expect(() => removeAllHandlers()).not.toThrow();
    });

    it('should not call removeAllHandlers when manager is null', () => {
      setGlobalManager(null);
      removeAllHandlers();
      expect(mockManager.removeAllHandlers).not.toHaveBeenCalled();
    });
  });

  describe('removeHandler', () => {
    const endpoint: Endpoint = {
      id: 'GET:/users',
      path: '/users',
      method: 'GET',
    };
    const method: HttpMethod = 'GET';

    it('should call removeHandler on manager when manager is set', () => {
      setGlobalManager(mockManager);
      removeHandler(endpoint, method);
      expect(mockManager.removeHandler).toHaveBeenCalledWith(endpoint, method);
    });

    it('should not throw when manager is null', () => {
      setGlobalManager(null);
      expect(() => removeHandler(endpoint, method)).not.toThrow();
    });

    it('should not call removeHandler when manager is null', () => {
      setGlobalManager(null);
      removeHandler(endpoint, method);
      expect(mockManager.removeHandler).not.toHaveBeenCalled();
    });
  });
});
