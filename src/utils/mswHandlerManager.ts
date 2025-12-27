/* eslint-disable @typescript-eslint/no-explicit-any */
import { http, HttpResponse, RequestHandler } from 'msw';
import { Endpoint, HttpMethod, MockResponse, QueueItem } from './types';

/**
 * Manager for MSW handlers
 * Handles reading, adding, and overriding MSW handlers at runtime
 */
export class MswHandlerManager {
  private worker: any;
  private handlers: Map<string, RequestHandler> = new Map();
  private onCallCallback?: (
    endpointId: string,
    method: HttpMethod,
    path: string,
    handlerId?: string,
    fullUrl?: string,
    requestBody?: any,
    responseBody?: any,
    responseStatus?: number
  ) => void;

  constructor(
    worker: any,
    onCall?: (
      endpointId: string,
      method: HttpMethod,
      path: string,
      handlerId?: string,
      fullUrl?: string,
      requestBody?: any,
      responseBody?: any,
      responseStatus?: number
    ) => void
  ) {
    this.worker = worker;
    this.onCallCallback = onCall;
    this.loadOriginalHandlers();
  }

  /**
   * Loads existing handlers from MSW worker
   * Note: MSW doesn't expose a public API for this, so we need to work with what's available
   */
  private loadOriginalHandlers(): void {
    // MSW worker stores handlers internally, but doesn't expose them directly
    // We'll track handlers we add ourselves and work with those
    // For existing handlers, we'll need to intercept requests before they reach them
  }

  /**
   * Gets the original handler response for an endpoint (if it exists)
   * This is used to populate the textarea with default values
   * Note: MSW doesn't expose handlers directly, so we return null and let user fill manually
   */
  async getOriginalHandlerResponse(
    _endpoint: Endpoint,
    _request: Request
  ): Promise<MockResponse | null> {
    // MSW doesn't provide a public API to read existing handlers
    // Return null - user will need to fill manually or we can try to intercept
    // For MVP, we'll return null and let the textarea start empty
    return null;
  }

  /**
   * Creates an MSW handler from a mock response
   * If getNextQueueItem is provided, it will use queue for cycling through responses
   */
  private createHandler(
    endpoint: Endpoint,
    response: MockResponse,
    method: HttpMethod,
    getNextQueueItem?: () => QueueItem | MockResponse | null,
    getCurrentHandlerId?: () => string | null,
    customUrl?: string,
    delay?: number
  ): RequestHandler {
    const httpMethod =
      method === 'ALL'
        ? http.all
        : http[method.toLowerCase() as keyof typeof http];

    if (!httpMethod) {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Use custom URL if provided, otherwise use endpoint path
    const pathToUse = customUrl || endpoint.path;

    // Convert OpenAPI path format {param} to MSW format :param
    const mswPath = pathToUse.replace(/\{([^}]+)\}/g, ':$1');

    // MSW v2 uses wildcard pattern for matching any origin
    // Pattern: *path or full URL
    // We'll use wildcard to match any origin with this path
    const pathPattern = `*${mswPath}`;

    return httpMethod(pathPattern, async ({ request }) => {
      // If queue is available, get next item from queue
      let responseToUse = response;
      let delayToUse = delay || 0;
      if (getNextQueueItem) {
        const nextItem = getNextQueueItem();
        if (nextItem) {
          // Check if it's a QueueItem (has response property) or just MockResponse
          if ('response' in nextItem && nextItem.response) {
            // It's a QueueItem - use its response and delay
            responseToUse = nextItem.response;
            delayToUse =
              nextItem.delay !== undefined ? nextItem.delay : delayToUse;
          } else if ('status' in nextItem && 'body' in nextItem) {
            // It's just a MockResponse (backward compatibility)
            responseToUse = nextItem as MockResponse;
          }
        }
      }

      console.log(`MSW Widget: Mocking ${method} ${endpoint.path}`, {
        requestUrl: request.url,
        response: responseToUse,
        fromQueue: !!getNextQueueItem,
        delay: delayToUse,
      });

      // Apply delay if specified
      if (delayToUse > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayToUse));
      }

      // Extract request body
      let requestBody: any = undefined;
      try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          requestBody = await request.clone().json();
        } else if (contentType.includes('text/')) {
          requestBody = await request.clone().text();
        } else if (request.body) {
          requestBody = await request.clone().text();
        }
      } catch {
        // Ignore errors when reading body
      }

      // Extract response body and status
      const responseBody = responseToUse.body;
      const responseStatus = responseToUse.status;

      // Track call with full URL and request/response details
      if (this.onCallCallback) {
        const handlerId = getCurrentHandlerId
          ? getCurrentHandlerId()
          : undefined;
        // Pass full URL from request
        const fullUrl = request.url;
        this.onCallCallback(
          endpoint.id,
          method,
          endpoint.path,
          handlerId || undefined,
          fullUrl,
          requestBody,
          responseBody,
          responseStatus
        );
      }

      // Store full history entry with request/response details
      // This will be done in the callback, but we need to pass the data
      // For now, the callback will handle it, but we could enhance it to pass request/response

      return HttpResponse.json(responseBody, {
        status: responseToUse.status,
        headers: {
          ...responseToUse.headers,
          'x-msw-widget': 'true',
        },
      });
    });
  }

  /**
   * Adds or overrides a handler for an endpoint
   * If getNextQueueItem is provided, handler will cycle through queue
   */
  addHandler(
    endpoint: Endpoint,
    response: MockResponse,
    method: HttpMethod,
    getNextQueueItem?: () => QueueItem | MockResponse | null,
    getCurrentHandlerId?: () => string | null,
    customUrl?: string,
    delay?: number
  ): void {
    const pathToUse = customUrl || endpoint.path;
    const handlerId = `${method}:${pathToUse}`;
    const handler = this.createHandler(
      endpoint,
      response,
      method,
      getNextQueueItem,
      getCurrentHandlerId,
      customUrl,
      delay
    );

    // Store handler
    this.handlers.set(handlerId, handler);

    // Update MSW worker with new handlers
    this.updateWorkerHandlers();
  }

  /**
   * Adds a handler from queue item with queue cycling
   */
  addHandlerFromQueue(
    endpoint: Endpoint,
    queueItem: QueueItem,
    getNextQueueItem: () => QueueItem | null,
    getCurrentHandlerId: () => string | null,
    customUrl?: string,
    delay?: number
  ): void {
    this.addHandler(
      endpoint,
      queueItem.response,
      queueItem.method,
      getNextQueueItem,
      getCurrentHandlerId,
      customUrl,
      delay
    );
  }

  /**
   * Removes a handler for an endpoint
   */
  removeHandler(endpoint: Endpoint, method: HttpMethod): void {
    const handlerId = `${method}:${endpoint.path}`;
    this.handlers.delete(handlerId);
    this.updateWorkerHandlers();
  }

  /**
   * Removes all handlers added by this manager
   */
  removeAllHandlers(): void {
    this.handlers.clear();
    this.updateWorkerHandlers();
  }

  /**
   * Updates MSW worker with current handlers
   * MSW v2+ supports runtime handler updates using worker.use()
   * Handlers added via use() take precedence over initial handlers
   *
   * Note: To properly remove handlers, we need to reset and re-add only the ones we want
   */
  private updateWorkerHandlers(): void {
    if (!this.worker) {
      console.warn('MSW worker not available');
      return;
    }

    const handlersArray = Array.from(this.handlers.values());

    // MSW v2+ worker.use() adds handlers that take precedence
    // To remove handlers, we need to reset handlers added by us and re-add only current ones
    // We'll use worker.resetHandlers() if available, or work around it
    try {
      // If no handlers, try to reset handlers added by us
      // MSW doesn't have a direct way to remove specific handlers, so we reset all and re-add
      if (handlersArray.length === 0) {
        // Try to reset handlers - MSW v2 may have resetHandlers method
        if (typeof this.worker.resetHandlers === 'function') {
          this.worker.resetHandlers();
        } else {
          // Fallback: MSW v2+ handlers added via use() can be reset by calling use() with empty array
          // But this might not work - we'll need to track original handlers
          console.warn(
            'MSW Widget: Cannot reset handlers - worker.resetHandlers not available'
          );
        }
        return;
      }

      // Re-add all current handlers
      // Note: This will add handlers on top of existing ones, but our handlers take precedence
      this.worker.use(...handlersArray);
      console.log(`MSW Widget: Updated ${handlersArray.length} handler(s)`);
    } catch (error) {
      console.error('MSW Widget: Failed to update handlers:', error);
    }
  }

  /**
   * Enables or disables a handler
   * For now, we'll remove and re-add handlers to enable/disable
   */
  setHandlerEnabled(
    endpoint: Endpoint,
    method: HttpMethod,
    enabled: boolean
  ): void {
    if (enabled) {
      // Handler should already be added, just ensure it's active
      this.updateWorkerHandlers();
    } else {
      this.removeHandler(endpoint, method);
    }
  }
}
