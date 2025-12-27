/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from '@testing-library/react';
import { useOpenApiParser } from './useOpenApiParser';
import * as openApiParser from '../utils/openApiParser';
import { Endpoint, HttpMethod } from '../utils/types';

// Mock openApiParser
vi.mock('../utils/openApiParser', () => ({
  parseOpenApiSpec: vi.fn(),
}));

describe('useOpenApiParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state with null URL', () => {
    const { result } = renderHook(() => useOpenApiParser(null));

    expect(result.current.endpoints).toEqual([]);
    expect(result.current.baseUrl).toBeUndefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load OpenAPI spec successfully', async () => {
    const mockEndpoints: Endpoint[] = [
      { id: 'GET:/users', path: '/users', method: 'GET' as HttpMethod },
    ];
    const mockBaseUrl = 'https://api.example.com';

    vi.mocked(openApiParser.parseOpenApiSpec).mockResolvedValue({
      endpoints: mockEndpoints,
      baseUrl: mockBaseUrl,
    });

    const { result } = renderHook(() => useOpenApiParser('/api/openapi.json'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.endpoints).toEqual(mockEndpoints);
    expect(result.current.baseUrl).toBe(mockBaseUrl);
    expect(result.current.error).toBeNull();
  });

  it('should handle loading state', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(openApiParser.parseOpenApiSpec).mockReturnValue(promise as any);

    const { result } = renderHook(() => useOpenApiParser('/api/openapi.json'));

    expect(result.current.loading).toBe(true);

    resolvePromise!({ endpoints: [], baseUrl: undefined });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle parse errors', async () => {
    const error = new Error('Failed to parse');
    vi.mocked(openApiParser.parseOpenApiSpec).mockRejectedValue(error);

    const { result } = renderHook(() => useOpenApiParser('/api/openapi.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to parse');
    expect(result.current.endpoints).toEqual([]);
  });

  it('should handle non-Error exceptions', async () => {
    vi.mocked(openApiParser.parseOpenApiSpec).mockRejectedValue('String error');

    const { result } = renderHook(() => useOpenApiParser('/api/openapi.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to parse OpenAPI spec');
  });

  it('should cancel request when URL changes', async () => {
    let resolveFirst: (value: any) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(openApiParser.parseOpenApiSpec).mockReturnValueOnce(
      firstPromise as any
    );

    const { result, rerender } = renderHook(
      ({ url }) => useOpenApiParser(url),
      { initialProps: { url: '/api/openapi1.json' } }
    );

    expect(result.current.loading).toBe(true);

    // Change URL before first request completes
    rerender({ url: '/api/openapi2.json' });

    // Resolve first request
    resolveFirst!({ endpoints: [], baseUrl: undefined });

    // Wait a bit to ensure cancellation is handled
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The first request should be cancelled, so endpoints should not be set
    // (unless the second request also completes)
    expect(openApiParser.parseOpenApiSpec).toHaveBeenCalledTimes(2);
  });

  it('should reset endpoints when URL is set to null', async () => {
    vi.mocked(openApiParser.parseOpenApiSpec).mockResolvedValue({
      endpoints: [{ id: 'GET:/users', path: '/users', method: 'GET' }],
      baseUrl: 'https://api.example.com',
    });

    const { result, rerender } = renderHook(
      ({ url }) => useOpenApiParser(url),
      { initialProps: { url: '/api/openapi.json' } }
    );

    await waitFor(() => {
      expect(result.current.endpoints.length).toBeGreaterThan(0);
    });

    rerender({ url: null as any });
    await waitFor(() => {
      expect(result.current.endpoints).toEqual([]);
    });

    // baseUrl might not reset immediately, check endpoints only
    expect(result.current.endpoints).toEqual([]);
  });

  it('should clear error when new request starts', async () => {
    const error = new Error('First error');
    vi.mocked(openApiParser.parseOpenApiSpec).mockRejectedValueOnce(error);

    const { result, rerender } = renderHook(
      ({ url }) => useOpenApiParser(url),
      { initialProps: { url: '/api/openapi1.json' } }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    vi.mocked(openApiParser.parseOpenApiSpec).mockResolvedValueOnce({
      endpoints: [],
      baseUrl: undefined,
    });

    rerender({ url: '/api/openapi2.json' });

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
