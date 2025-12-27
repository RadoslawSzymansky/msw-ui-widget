/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { useWidgetStore } from '../store/widgetStore';

// Helper to render components with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => render(ui, { wrapper: AllTheProviders, ...options });

// Helper to reset store state
// @knip-ignore - Test utility, may be used in future tests
export const resetStore = () => {
  useWidgetStore.getState().reset();
};

// Helper to create a mock MSW worker
// @knip-ignore - Test utility, may be used in future tests
export const createMockWorker = () => {
  const handlers: any[] = [];
  return {
    use: (...newHandlers: any[]) => {
      handlers.push(...newHandlers);
    },
    resetHandlers: vi.fn(() => {
      handlers.length = 0;
    }),
    handlers,
  };
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
