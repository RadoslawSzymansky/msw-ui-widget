import { Endpoint } from './types';

export interface EndpointGroup {
  name: string;
  prefix: string;
  endpoints: Endpoint[];
}

/**
 * Groups endpoints by their common path prefix
 * Example: /api/v1/carrier/trending, /api/v1/carrier/recommended -> group "carrier"
 */
export function groupEndpointsByPrefix(endpoints: Endpoint[]): EndpointGroup[] {
  if (endpoints.length === 0) {
    return [];
  }

  // Extract common prefixes from paths
  // We'll group by the segment before the last meaningful segment
  // e.g., /api/v1/carrier/trending -> group by "carrier"

  const groups = new Map<string, Endpoint[]>();
  const groupNames = new Map<string, string>(); // prefix -> display name

  for (const endpoint of endpoints) {
    const path = endpoint.path;

    // Split path into segments
    const segments = path.split('/').filter((s) => s.length > 0);

    if (segments.length === 0) {
      // Root path - put in "root" group
      const groupKey = 'root';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
        groupNames.set(groupKey, 'Root');
      }
      groups.get(groupKey)!.push(endpoint);
      continue;
    }

    // For paths like /api/v1/carrier/trending, group by "carrier"
    // For paths like /api/v1/carrier/:id, group by "carrier"
    // Strategy: use the second-to-last segment if available, otherwise last segment

    let groupKey: string;
    let groupName: string;

    if (segments.length >= 2) {
      // Use second-to-last segment as group (e.g., "carrier" from /api/v1/carrier/trending)
      const groupSegment = segments[segments.length - 2];
      groupKey = segments.slice(0, segments.length - 1).join('/');
      groupName = groupSegment;
    } else {
      // Single segment - use it as group
      groupKey = segments[0];
      groupName = segments[0];
    }

    // Normalize group key to handle path parameters
    groupKey = groupKey.replace(/:\w+/g, '*').replace(/\{[^}]+\}/g, '*');

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
      groupNames.set(groupKey, groupName);
    }
    groups.get(groupKey)!.push(endpoint);
  }

  // Convert to array and sort
  const result: EndpointGroup[] = Array.from(groups.entries()).map(
    ([prefix, endpoints]) => ({
      name: groupNames.get(prefix) || prefix,
      prefix,
      endpoints: endpoints.sort((a, b) => {
        // Sort endpoints within group by path
        return a.path.localeCompare(b.path);
      }),
    })
  );

  // Sort groups by name
  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

/**
 * Alternative grouping: group by first meaningful segment after /api/v1
 * This is more suitable for REST APIs with versioning
 */
export function groupEndpointsByResource(
  endpoints: Endpoint[]
): EndpointGroup[] {
  if (endpoints.length === 0) {
    return [];
  }

  const groups = new Map<string, Endpoint[]>();
  const groupNames = new Map<string, string>();

  for (const endpoint of endpoints) {
    const path = endpoint.path;
    const segments = path.split('/').filter((s) => s.length > 0);

    if (segments.length === 0) {
      const groupKey = 'root';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
        groupNames.set(groupKey, 'Root');
      }
      groups.get(groupKey)!.push(endpoint);
      continue;
    }

    // Find the resource name (usually after /api/v1 or similar)
    // Look for segments that are not version numbers or "api"
    let resourceIndex = -1;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      // Skip common API prefixes
      if (segment === 'api' || /^v\d+$/.test(segment)) {
        continue;
      }
      // Found resource segment
      resourceIndex = i;
      break;
    }

    let groupKey: string;
    let groupName: string;

    if (resourceIndex >= 0) {
      const resourceSegment = segments[resourceIndex];
      // Remove path parameters for grouping
      const cleanSegment = resourceSegment
        .replace(/^:/, '')
        .replace(/\{|\}/g, '');
      groupKey = segments.slice(0, resourceIndex + 1).join('/');
      groupName = cleanSegment;
    } else {
      // Fallback to first segment
      groupKey = segments[0];
      groupName = segments[0];
    }

    // Normalize group key
    groupKey = groupKey.replace(/:\w+/g, '*').replace(/\{[^}]+\}/g, '*');

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
      groupNames.set(groupKey, groupName);
    }
    groups.get(groupKey)!.push(endpoint);
  }

  const result: EndpointGroup[] = Array.from(groups.entries()).map(
    ([prefix, endpoints]) => ({
      name: groupNames.get(prefix) || prefix,
      prefix,
      endpoints: endpoints.sort((a, b) => a.path.localeCompare(b.path)),
    })
  );

  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}
