/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock MSW worker for testing
 */
export const createMockWorker = () => {
  const handlers: any[] = [];

  return {
    use: vi.fn((...newHandlers: any[]) => {
      handlers.push(...newHandlers);
    }),
    resetHandlers: vi.fn(() => {
      handlers.length = 0;
    }),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    handlers,
  };
};
