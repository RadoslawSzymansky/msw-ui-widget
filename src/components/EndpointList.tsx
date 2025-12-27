import React, { useMemo } from 'react';
import { Endpoint } from '../utils/types';
import { useWidgetStore } from '../store/widgetStore';
import { groupEndpointsByResource } from '../utils/endpointGrouper';
import { EndpointGroup as EndpointGroupComponent } from './EndpointGroup';

interface EndpointListProps {
  endpoints: Endpoint[];
}

export const EndpointList: React.FC<EndpointListProps> = ({ endpoints }) => {
  const {
    searchQuery,
    filterMethods,
    pinnedEndpoints,
    showPinnedOnly,
    showMockedOnly,
    activeMocks,
  } = useWidgetStore();
  const listRef = React.useRef<HTMLDivElement>(null);

  // Scroll to top when filters change
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [filterMethods, showPinnedOnly, showMockedOnly, searchQuery]);

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((endpoint) => {
      // Search filter - improved to handle path parameters
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        if (!query) {
          // Empty query, show all
        } else {
          // Check if query matches path (with or without parameters)
          const pathLower = endpoint.path.toLowerCase();
          const originalPathLower =
            endpoint.originalPath?.toLowerCase() || pathLower;

          // Normalize path for comparison - replace {param} and :param with *
          const normalizedPath = pathLower
            .replace(/\{[^}]+\}/g, '*')
            .replace(/:[^/]+/g, '*');
          const normalizedOriginalPath = originalPathLower
            .replace(/\{[^}]+\}/g, '*')
            .replace(/:[^/]+/g, '*');

          // Also create a version without parameters for better matching
          const pathWithoutParams = pathLower
            .replace(/\{[^}]+\}/g, '')
            .replace(/:[^/]+/g, '');
          const originalPathWithoutParams = originalPathLower
            .replace(/\{[^}]+\}/g, '')
            .replace(/:[^/]+/g, '');

          const matchesPath =
            pathLower.includes(query) ||
            originalPathLower.includes(query) ||
            normalizedPath.includes(query) ||
            normalizedOriginalPath.includes(query) ||
            pathWithoutParams.includes(query) ||
            originalPathWithoutParams.includes(query);

          const matchesMethod = endpoint.method.toLowerCase().includes(query);

          if (!matchesPath && !matchesMethod) {
            return false;
          }
        }
      }

      // Method filter - if filterMethods is empty, show all (treat as all selected)
      // Otherwise, check if endpoint method is in selected methods
      if (filterMethods.size > 0 && !filterMethods.has(endpoint.method)) {
        return false;
      }

      // Pinned filter
      if (showPinnedOnly && !pinnedEndpoints.has(endpoint.id)) {
        return false;
      }

      // Mocked filter
      if (showMockedOnly) {
        const mockKey = `${endpoint.id}:${endpoint.method}`;
        const mock = activeMocks.get(mockKey);
        if (!mock || !mock.enabled) {
          return false;
        }
      }

      return true;
    });
  }, [
    endpoints,
    searchQuery,
    filterMethods,
    pinnedEndpoints,
    showPinnedOnly,
    showMockedOnly,
    activeMocks,
  ]);

  // Sort endpoints: mocked first, then pinned, then by path
  const sortedEndpoints = useMemo(() => {
    return [...filteredEndpoints].sort((a, b) => {
      const aMockKey = `${a.id}:${a.method}`;
      const bMockKey = `${b.id}:${b.method}`;
      const aMocked = activeMocks.get(aMockKey)?.enabled || false;
      const bMocked = activeMocks.get(bMockKey)?.enabled || false;
      const aPinned = pinnedEndpoints.has(a.id);
      const bPinned = pinnedEndpoints.has(b.id);

      // Mocked first
      if (aMocked && !bMocked) return -1;
      if (!aMocked && bMocked) return 1;

      // Then pinned
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      return a.path.localeCompare(b.path);
    });
  }, [filteredEndpoints, pinnedEndpoints, activeMocks]);

  // Group sorted endpoints - separate mocked from non-mocked
  const groupedEndpoints = useMemo(() => {
    if (sortedEndpoints.length === 0) {
      return [];
    }

    // Separate mocked and non-mocked endpoints
    const mockedEndpoints: Endpoint[] = [];
    const nonMockedEndpoints: Endpoint[] = [];

    sortedEndpoints.forEach((endpoint) => {
      const mockKey = `${endpoint.id}:${endpoint.method}`;
      const mock = activeMocks.get(mockKey);
      if (mock && mock.enabled) {
        mockedEndpoints.push(endpoint);
      } else {
        nonMockedEndpoints.push(endpoint);
      }
    });

    const groups: Array<{
      name: string;
      prefix: string;
      endpoints: Endpoint[];
    }> = [];

    // Add mocked group first if there are mocked endpoints
    if (mockedEndpoints.length > 0) {
      groups.push({
        name: 'Mocked',
        prefix: 'mocked',
        endpoints: mockedEndpoints,
      });
    }

    // Add other groups
    if (nonMockedEndpoints.length > 0) {
      const otherGroups = groupEndpointsByResource(nonMockedEndpoints);
      groups.push(...otherGroups);
    }

    return groups;
  }, [sortedEndpoints, activeMocks]);

  if (filteredEndpoints.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        {endpoints.length === 0
          ? 'No endpoints found in OpenAPI spec'
          : 'No endpoints match your filters'}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="overflow-y-auto flex-1"
      style={{ minHeight: 0 }}
    >
      {groupedEndpoints.map((group) => (
        <EndpointGroupComponent key={group.prefix} group={group} />
      ))}
    </div>
  );
};
