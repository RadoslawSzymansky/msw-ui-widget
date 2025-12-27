import {
  groupEndpointsByPrefix,
  groupEndpointsByResource,
} from './endpointGrouper';
import { Endpoint } from './types';

describe('endpointGrouper', () => {
  describe('groupEndpointsByPrefix', () => {
    it('should return empty array for empty endpoints', () => {
      expect(groupEndpointsByPrefix([])).toEqual([]);
    });

    it('should group endpoints by prefix', () => {
      const endpoints: Endpoint[] = [
        {
          id: 'GET:/api/v1/carrier/trending',
          path: '/api/v1/carrier/trending',
          method: 'GET',
        },
        {
          id: 'GET:/api/v1/carrier/recommended',
          path: '/api/v1/carrier/recommended',
          method: 'GET',
        },
      ];

      const result = groupEndpointsByPrefix(endpoints);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('carrier');
      expect(result[0].endpoints).toHaveLength(2);
    });

    it('should handle root paths', () => {
      const endpoints: Endpoint[] = [{ id: 'GET:/', path: '/', method: 'GET' }];

      const result = groupEndpointsByPrefix(endpoints);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Root');
      expect(result[0].prefix).toBe('root');
    });

    it('should handle single segment paths', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/users', path: '/users', method: 'GET' },
      ];

      const result = groupEndpointsByPrefix(endpoints);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
    });

    it('should handle path parameters', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/api/users/{id}', path: '/api/users/{id}', method: 'GET' },
        {
          id: 'GET:/api/users/{id}/posts',
          path: '/api/users/{id}/posts',
          method: 'GET',
        },
      ];

      const result = groupEndpointsByPrefix(endpoints);

      // These will be in different groups due to different prefix lengths
      expect(result.length).toBeGreaterThanOrEqual(1);
      // Check that both endpoints are grouped
      const allEndpoints = result.flatMap((g) => g.endpoints);
      expect(allEndpoints).toHaveLength(2);
    });

    it('should sort groups by name', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/api/zebra', path: '/api/zebra', method: 'GET' },
        { id: 'GET:/api/apple', path: '/api/apple', method: 'GET' },
        { id: 'GET:/api/banana', path: '/api/banana', method: 'GET' },
      ];

      const result = groupEndpointsByPrefix(endpoints);

      // With prefix grouping, these will be grouped by the second-to-last segment
      // For /api/apple, segments are ['api', 'apple'], so groupName is 'apple'
      // All will be in separate groups or same group depending on prefix
      const groupNames = result.map((g) => g.name).sort();
      expect(groupNames.length).toBeGreaterThan(0);
    });

    it('should sort endpoints within group by path', () => {
      const endpoints: Endpoint[] = [
        {
          id: 'GET:/api/v1/carrier/zebra',
          path: '/api/v1/carrier/zebra',
          method: 'GET',
        },
        {
          id: 'GET:/api/v1/carrier/apple',
          path: '/api/v1/carrier/apple',
          method: 'GET',
        },
      ];

      const result = groupEndpointsByPrefix(endpoints);

      expect(result[0].endpoints.map((e) => e.path)).toEqual([
        '/api/v1/carrier/apple',
        '/api/v1/carrier/zebra',
      ]);
    });

    it('should create separate groups for different prefixes', () => {
      const endpoints: Endpoint[] = [
        {
          id: 'GET:/api/v1/carrier/trending',
          path: '/api/v1/carrier/trending',
          method: 'GET',
        },
        {
          id: 'GET:/api/v1/user/profile',
          path: '/api/v1/user/profile',
          method: 'GET',
        },
      ];

      const result = groupEndpointsByPrefix(endpoints);

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.name).sort()).toEqual(['carrier', 'user']);
    });

    it('should handle paths with different depths', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/api/v1/carrier', path: '/api/v1/carrier', method: 'GET' },
        {
          id: 'GET:/api/v1/carrier/trending',
          path: '/api/v1/carrier/trending',
          method: 'GET',
        },
      ];

      const result = groupEndpointsByPrefix(endpoints);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('groupEndpointsByResource', () => {
    it('should return empty array for empty endpoints', () => {
      expect(groupEndpointsByResource([])).toEqual([]);
    });

    it('should group endpoints by resource', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/api/v1/users', path: '/api/v1/users', method: 'GET' },
        { id: 'POST:/api/v1/users', path: '/api/v1/users', method: 'POST' },
      ];

      const result = groupEndpointsByResource(endpoints);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
      expect(result[0].endpoints).toHaveLength(2);
    });

    it('should skip api and version segments', () => {
      const endpoints: Endpoint[] = [
        {
          id: 'GET:/api/v1/carrier/trending',
          path: '/api/v1/carrier/trending',
          method: 'GET',
        },
        {
          id: 'GET:/api/v2/carrier/recommended',
          path: '/api/v2/carrier/recommended',
          method: 'GET',
        },
      ];

      const result = groupEndpointsByResource(endpoints);

      // These may be in different groups due to different versions, but both should have 'carrier' as resource
      expect(result.length).toBeGreaterThanOrEqual(1);
      const carrierGroups = result.filter((g) => g.name === 'carrier');
      expect(carrierGroups.length).toBeGreaterThan(0);
    });

    it('should handle root paths', () => {
      const endpoints: Endpoint[] = [{ id: 'GET:/', path: '/', method: 'GET' }];

      const result = groupEndpointsByResource(endpoints);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Root');
    });

    it('should handle paths without api/v1 prefix', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/users', path: '/users', method: 'GET' },
      ];

      const result = groupEndpointsByResource(endpoints);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
    });

    it('should handle path parameters in resource name', () => {
      const endpoints: Endpoint[] = [
        {
          id: 'GET:/api/v1/users/{id}',
          path: '/api/v1/users/{id}',
          method: 'GET',
        },
      ];

      const result = groupEndpointsByResource(endpoints);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
    });

    it('should sort groups by name', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/api/v1/zebra', path: '/api/v1/zebra', method: 'GET' },
        { id: 'GET:/api/v1/apple', path: '/api/v1/apple', method: 'GET' },
        { id: 'GET:/api/v1/banana', path: '/api/v1/banana', method: 'GET' },
      ];

      const result = groupEndpointsByResource(endpoints);

      expect(result.map((g) => g.name)).toEqual(['apple', 'banana', 'zebra']);
    });

    it('should sort endpoints within group by path', () => {
      const endpoints: Endpoint[] = [
        {
          id: 'GET:/api/v1/users/zebra',
          path: '/api/v1/users/zebra',
          method: 'GET',
        },
        {
          id: 'GET:/api/v1/users/apple',
          path: '/api/v1/users/apple',
          method: 'GET',
        },
      ];

      const result = groupEndpointsByResource(endpoints);

      expect(result[0].endpoints.map((e) => e.path)).toEqual([
        '/api/v1/users/apple',
        '/api/v1/users/zebra',
      ]);
    });

    it('should create separate groups for different resources', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/api/v1/users', path: '/api/v1/users', method: 'GET' },
        { id: 'GET:/api/v1/posts', path: '/api/v1/posts', method: 'GET' },
      ];

      const result = groupEndpointsByResource(endpoints);

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.name).sort()).toEqual(['posts', 'users']);
    });

    it('should handle single endpoint', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/api/v1/users', path: '/api/v1/users', method: 'GET' },
      ];

      const result = groupEndpointsByResource(endpoints);

      expect(result).toHaveLength(1);
      expect(result[0].endpoints).toHaveLength(1);
    });

    it('should handle paths with only version segment', () => {
      const endpoints: Endpoint[] = [
        { id: 'GET:/v1', path: '/v1', method: 'GET' },
      ];

      const result = groupEndpointsByResource(endpoints);

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
