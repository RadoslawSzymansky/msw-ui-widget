/* eslint-disable @typescript-eslint/no-explicit-any */
import { parse as parseYaml } from 'yaml';
import { Endpoint, HttpMethod, EndpointParameter } from './types';

/**
 * Parsed OpenAPI specification result
 * Used as return type for parseOpenApiSpec function (line 16)
 * @knip-ignore - Used as function return type, knip doesn't detect this
 */
export interface ParsedOpenApiSpec {
  endpoints: Endpoint[];
  baseUrl?: string;
}

export async function parseOpenApiSpec(
  url: string
): Promise<ParsedOpenApiSpec> {
  try {
    // Fetch the OpenAPI spec file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
    }

    const text = await response.text();

    // Determine if it's YAML or JSON
    let api: any;
    if (
      url.endsWith('.yaml') ||
      url.endsWith('.yml') ||
      text.trim().startsWith('openapi:') ||
      text.trim().startsWith('swagger:')
    ) {
      // Parse YAML
      api = parseYaml(text);
    } else {
      // Parse JSON
      api = JSON.parse(text);
    }

    // Basic validation
    if (!api || typeof api !== 'object') {
      throw new Error('Invalid OpenAPI spec format');
    }

    if (!api.openapi && !api.swagger) {
      throw new Error('Not a valid OpenAPI or Swagger spec');
    }

    // Only support OpenAPI 3.0
    if (api.openapi && !api.openapi.startsWith('3.0')) {
      throw new Error(
        `OpenAPI version ${api.openapi} is not supported. Only 3.0 is supported.`
      );
    }

    // Extract base URL from servers
    let baseUrl: string | undefined;
    if (api.servers && Array.isArray(api.servers) && api.servers.length > 0) {
      baseUrl = api.servers[0].url;
    }

    const endpoints: Endpoint[] = [];

    if (!api.paths) {
      throw new Error('OpenAPI spec does not contain paths');
    }

    // Iterate through all paths
    for (const [path, pathItem] of Object.entries(api.paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue;

      // Iterate through HTTP methods
      const methods: HttpMethod[] = [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'HEAD',
        'OPTIONS',
      ];

      for (const method of methods) {
        const operation = pathItem[
          method.toLowerCase() as keyof typeof pathItem
        ] as any;

        if (operation && typeof operation === 'object') {
          // Extract parameters
          const parameters: EndpointParameter[] = [];
          if (Array.isArray(operation.parameters)) {
            for (const param of operation.parameters) {
              parameters.push({
                name: param.name,
                in: param.in,
                required: param.required,
                schema: param.schema,
              });
            }
          }

          // Extract path parameters from the path string
          const pathParams = path.match(/\{([^}]+)\}/g) || [];
          for (const param of pathParams) {
            const paramName = param.slice(1, -1);
            if (
              !parameters.find((p) => p.name === paramName && p.in === 'path')
            ) {
              parameters.push({
                name: paramName,
                in: 'path',
                required: true,
              });
            }
          }

          // Create endpoint ID
          const endpointId = `${method}:${path}`;

          endpoints.push({
            id: endpointId,
            path: path,
            method: method as HttpMethod,
            parameters,
            originalPath: path,
          });
        }
      }
    }

    return { endpoints, baseUrl };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse OpenAPI spec: ${error.message}`);
    }
    throw new Error('Failed to parse OpenAPI spec: Unknown error');
  }
}

/**
 * Converts OpenAPI path with parameters to a readable format
 * Example: /api/users/{id} -> /api/users/:id
 */
export function formatPathForDisplay(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}
