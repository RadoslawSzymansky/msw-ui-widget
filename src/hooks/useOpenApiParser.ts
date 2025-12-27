import { useState, useEffect } from 'react';
import { parseOpenApiSpec } from '../utils/openApiParser';
import { Endpoint } from '../utils/types';

interface UseOpenApiParserResult {
  endpoints: Endpoint[];
  baseUrl?: string;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for parsing OpenAPI specification
 */
export function useOpenApiParser(
  openapiUrl: string | null
): UseOpenApiParserResult {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!openapiUrl) {
      setEndpoints([]);
      return;
    }

    let cancelled = false;

    const loadSpec = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await parseOpenApiSpec(openapiUrl);
        if (!cancelled) {
          setEndpoints(result.endpoints);
          setBaseUrl(result.baseUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to parse OpenAPI spec')
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSpec();

    return () => {
      cancelled = true;
    };
  }, [openapiUrl]);

  return { endpoints, baseUrl, loading, error };
}
