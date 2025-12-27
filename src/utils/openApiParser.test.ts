/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseOpenApiSpec, formatPathForDisplay } from './openApiParser';

// Mock fetch globally
global.fetch = vi.fn();

describe('openApiParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseOpenApiSpec', () => {
    it('should parse OpenAPI JSON spec successfully', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {},
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0]).toMatchObject({
        id: 'GET:/users',
        path: '/users',
        method: 'GET',
      });
      expect(result.baseUrl).toBe('https://api.example.com');
    });

    it('should parse OpenAPI YAML spec successfully', async () => {
      const yamlSpec = `openapi: 3.0.0
servers:
  - url: https://api.example.com
paths:
  /users:
    get:
      summary: Get users
      responses: {}`;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => yamlSpec,
      });

      const result = await parseOpenApiSpec('/api/openapi.yaml');

      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0].path).toBe('/users');
      expect(result.baseUrl).toBe('https://api.example.com');
    });

    it('should detect YAML by content when URL does not have extension', async () => {
      const yamlSpec = `openapi: 3.0.0
paths:
  /users:
    get:
      responses: {}`;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => yamlSpec,
      });

      const result = await parseOpenApiSpec('/api/spec');

      expect(result.endpoints).toHaveLength(1);
    });

    it('should extract multiple endpoints with different HTTP methods', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: { responses: {} },
            post: { responses: {} },
            put: { responses: {} },
            delete: { responses: {} },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      expect(result.endpoints).toHaveLength(4);
      expect(result.endpoints.map((e) => e.method)).toEqual([
        'GET',
        'POST',
        'PUT',
        'DELETE',
      ]);
    });

    it('should extract path parameters from path string', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        paths: {
          '/users/{id}': {
            get: { responses: {} },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      expect(result.endpoints[0].parameters).toContainEqual({
        name: 'id',
        in: 'path',
        required: true,
      });
    });

    it('should extract operation parameters', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              parameters: [
                {
                  name: 'page',
                  in: 'query',
                  required: false,
                  schema: { type: 'integer' },
                },
                {
                  name: 'limit',
                  in: 'query',
                  required: true,
                  schema: { type: 'integer' },
                },
              ],
              responses: {},
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      expect(result.endpoints[0].parameters).toHaveLength(2);
      expect(result.endpoints[0].parameters).toContainEqual({
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
      });
    });

    it('should not duplicate path parameters if already in operation parameters', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        paths: {
          '/users/{id}': {
            get: {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                },
              ],
              responses: {},
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      const idParams = result.endpoints[0]?.parameters?.filter(
        (p) => p.name === 'id' && p.in === 'path'
      );
      expect(idParams).toHaveLength(1);
    });

    it('should handle endpoints without baseUrl', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: { responses: {} },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      expect(result.baseUrl).toBeUndefined();
    });

    it('should handle empty paths object', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        paths: {},
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      expect(result.endpoints).toHaveLength(0);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(parseOpenApiSpec('/api/openapi.json')).rejects.toThrow(
        'Failed to parse OpenAPI spec: Failed to fetch OpenAPI spec: Not Found'
      );
    });

    it('should throw error when response is not valid JSON or YAML', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'invalid content',
      });

      await expect(parseOpenApiSpec('/api/openapi.json')).rejects.toThrow();
    });

    it('should throw error when spec is not an object', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'null',
      });

      await expect(parseOpenApiSpec('/api/openapi.json')).rejects.toThrow(
        'Invalid OpenAPI spec format'
      );
    });

    it('should throw error when spec does not have openapi or swagger field', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ paths: {} }),
      });

      await expect(parseOpenApiSpec('/api/openapi.json')).rejects.toThrow(
        'Not a valid OpenAPI or Swagger spec'
      );
    });

    it('should throw error for unsupported OpenAPI version', async () => {
      const mockSpec = {
        openapi: '3.1.0',
        paths: {},
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      await expect(parseOpenApiSpec('/api/openapi.json')).rejects.toThrow(
        'OpenAPI version 3.1.0 is not supported'
      );
    });

    it('should throw error when paths field is missing', async () => {
      const mockSpec = {
        openapi: '3.0.0',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      await expect(parseOpenApiSpec('/api/openapi.json')).rejects.toThrow(
        'OpenAPI spec does not contain paths'
      );
    });

    it('should skip non-object path items', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: { responses: {} },
          },
          '/invalid': null,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      expect(result.endpoints).toHaveLength(1);
    });

    it('should handle all HTTP methods', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        paths: {
          '/test': {
            get: { responses: {} },
            post: { responses: {} },
            put: { responses: {} },
            delete: { responses: {} },
            patch: { responses: {} },
            head: { responses: {} },
            options: { responses: {} },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockSpec),
      });

      const result = await parseOpenApiSpec('/api/openapi.json');

      expect(result.endpoints).toHaveLength(7);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(parseOpenApiSpec('/api/openapi.json')).rejects.toThrow(
        'Failed to parse OpenAPI spec: Network error'
      );
    });

    it('should handle unknown errors', async () => {
      (global.fetch as any).mockRejectedValueOnce('Unknown error');

      await expect(parseOpenApiSpec('/api/openapi.json')).rejects.toThrow(
        'Failed to parse OpenAPI spec: Unknown error'
      );
    });
  });

  describe('formatPathForDisplay', () => {
    it('should convert OpenAPI path format to display format', () => {
      expect(formatPathForDisplay('/api/users/{id}')).toBe('/api/users/:id');
    });

    it('should handle multiple parameters', () => {
      expect(formatPathForDisplay('/api/users/{userId}/posts/{postId}')).toBe(
        '/api/users/:userId/posts/:postId'
      );
    });

    it('should handle paths without parameters', () => {
      expect(formatPathForDisplay('/api/users')).toBe('/api/users');
    });

    it('should handle empty path', () => {
      expect(formatPathForDisplay('')).toBe('');
    });

    it('should handle root path', () => {
      expect(formatPathForDisplay('/')).toBe('/');
    });
  });
});
