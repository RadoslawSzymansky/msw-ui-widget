import React, { useState, useEffect } from 'react';
import { Endpoint, HttpMethod, MockResponse, QueueItem } from '../utils/types';
import { useWidgetStore } from '../store/widgetStore';
import { useMswHandler } from '../hooks/useMswHandler';
import { useEndpointQueue } from '../hooks/useEndpointQueue';
import { formatPathForDisplay } from '../utils/openApiParser';

interface MockEditorProps {
  endpoint: Endpoint;
  onClose: () => void;
}

const HTTP_STATUS_CODES = [
  { value: 200, label: '200 OK' },
  { value: 201, label: '201 Created' },
  { value: 204, label: '204 No Content' },
  { value: 400, label: '400 Bad Request' },
  { value: 401, label: '401 Unauthorized' },
  { value: 403, label: '403 Forbidden' },
  { value: 404, label: '404 Not Found' },
  { value: 500, label: '500 Internal Server Error' },
  { value: 502, label: '502 Bad Gateway' },
  { value: 503, label: '503 Service Unavailable' },
];

const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
  'ALL',
];

export const MockEditor: React.FC<MockEditorProps> = ({
  endpoint,
  onClose,
}) => {
  const { activeMocks, setCallCount, baseUrl } = useWidgetStore();
  const { setMock, removeMock, setMockEnabled } = useMswHandler(endpoint);
  const { queue, removeItem, reset, clear } = useEndpointQueue(endpoint.id);

  const activeMock = activeMocks.get(`${endpoint.id}:${endpoint.method}`);
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod>(
    endpoint.method
  );
  const [statusCode, setStatusCode] = useState<number>(200);
  const [responseBody, setResponseBody] = useState<string>('{}');
  const [isEnabled, setIsEnabled] = useState(activeMock?.enabled ?? true);
  const [mockName, setMockName] = useState<string>(activeMock?.name || '');
  const [queueItemName, setQueueItemName] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>(
    activeMock?.customUrl || ''
  );
  const [delay, setDelay] = useState<number>(activeMock?.delay ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [editingQueueItem, setEditingQueueItem] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(queue.items.length === 0);

  // Load original handler response as default (if mock exists) - only on mount or when endpoint/method changes
  useEffect(() => {
    const currentMock = activeMocks.get(`${endpoint.id}:${selectedMethod}`);

    // If editing a queue item, don't reset
    if (editingQueueItem) {
      return;
    }

    // If form is visible (showAddForm is true), don't reset - user might be typing or we just set values
    if (showAddForm) {
      return;
    }

    // Reset queue index when opening editor - this ensures we start from the beginning
    if (queue.items.length > 0) {
      reset();
    }

    // Always use queue - if mock exists without queue, create queue with one item
    const currentQueue = useWidgetStore.getState().queues.get(endpoint.id);

    if (
      currentMock?.response &&
      (!currentQueue || currentQueue.items.length === 0)
    ) {
      // Mock exists but no queue - create queue with one item from mock
      const queueItem: QueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        method: selectedMethod,
        response: currentMock.response,
        name: currentMock.name || 'Mock 1',
        delay: currentMock.delay, // Preserve delay from mock
      };
      useWidgetStore.getState().addToQueue(endpoint.id, queueItem);
      // Update mock to use queue
      useWidgetStore
        .getState()
        .updateMock(
          endpoint.id,
          selectedMethod,
          currentMock.response,
          queueItem.id,
          currentMock.name
        );
    }

    // Load from queue if exists, otherwise from mock
    const queueToLoad = useWidgetStore.getState().queues.get(endpoint.id);
    if (queueToLoad && queueToLoad.items.length > 0) {
      // Load first item from queue
      const firstItem = queueToLoad.items[0];
      setResponseBody(JSON.stringify(firstItem.response.body, null, 2));
      setStatusCode(firstItem.response.status);
      setQueueItemName(firstItem.name || 'Mock 1');
      setMockName(firstItem.name || '');
    } else if (currentMock?.response) {
      // Fallback to mock response if no queue
      setResponseBody(JSON.stringify(currentMock.response.body, null, 2));
      setStatusCode(currentMock.response.status);
      setMockName(currentMock.name || '');
      setQueueItemName(currentMock.name || 'Mock 1');
    } else {
      // Start with empty object for new mock
      setResponseBody('{}');
      setStatusCode(200);
      setMockName('');
      setQueueItemName('Mock 1');
    }

    setIsEnabled(currentMock?.enabled ?? true);
    // Delay is always loaded from activeMock, not from queue items
    setDelay(currentMock?.delay ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint.id, selectedMethod, showAddForm, editingQueueItem]); // Run when endpoint, method, or editing item changes

  // Sync delay with activeMock when it changes (e.g., after saving)
  useEffect(() => {
    if (editingQueueItem) {
      return; // Don't update delay when editing queue item
    }
    const currentMock = activeMocks.get(`${endpoint.id}:${selectedMethod}`);
    if (currentMock?.delay !== undefined) {
      setDelay(currentMock.delay);
    }
  }, [activeMocks, endpoint.id, selectedMethod, editingQueueItem]);

  const handleAddToQueue = () => {
    try {
      // Validate JSON first
      if (!responseBody.trim()) {
        setJsonError('Response body is required');
        return;
      }

      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        setJsonError('Invalid JSON format');
        return;
      }

      // Validate name is required
      const nameToUse =
        queueItemName.trim() || `Mock ${queue.items.length + 1}`;

      const mockResponse: MockResponse = {
        status: statusCode,
        body: parsedBody,
      };

      // Create item with name and delay
      const item: QueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        method: selectedMethod,
        response: mockResponse,
        name: nameToUse,
        delay: delay, // Save delay to queue item
      };

      // Add to queue using store directly to ensure name is set
      useWidgetStore.getState().addToQueue(endpoint.id, item);

      setError(null);
      setJsonError(null);
      // Hide form after adding to queue
      setShowAddForm(false);
      // Clear form for next time
      setResponseBody('{}');
      setStatusCode(200);
      setSelectedMethod(endpoint.method);
      // Set default name for next item
      const updatedQueue = useWidgetStore.getState().queues.get(endpoint.id);
      setQueueItemName(
        updatedQueue ? `Mock ${updatedQueue.items.length + 1}` : 'Mock 1'
      );
    } catch {
      setJsonError('Invalid JSON in response body');
    }
  };

  const handleAddNext = () => {
    // Get fresh queue from store
    const storeState = useWidgetStore.getState();
    const currentQueue = storeState.queues.get(endpoint.id);

    // Use queue from hook if it has items, otherwise try store
    const queueToUse = queue?.items?.length > 0 ? queue : currentQueue;

    // Fill form with data from last queue item BEFORE showing form
    // This prevents useEffect from resetting the form
    if (queueToUse && queueToUse.items && queueToUse.items.length > 0) {
      const lastItem = queueToUse.items[queueToUse.items.length - 1];
      setResponseBody(JSON.stringify(lastItem.response.body, null, 2));
      setStatusCode(lastItem.response.status);
      setSelectedMethod(lastItem.method);
      // Set default name based on next item number
      setQueueItemName(`Mock ${queueToUse.items.length + 1}`);
    } else {
      // If no queue, use defaults
      setResponseBody('{}');
      setStatusCode(200);
      setSelectedMethod(endpoint.method);
      setQueueItemName('Mock 1');
    }

    // Show form after setting values
    setShowAddForm(true);
  };

  const handleEditQueueItem = (item: QueueItem) => {
    setEditingQueueItem(item.id);
    setResponseBody(JSON.stringify(item.response.body, null, 2));
    setStatusCode(item.response.status);
    setSelectedMethod(item.method);
    setQueueItemName(item.name || '');
    // Load delay from queue item, fallback to activeMock if not set
    const itemDelay =
      item.delay !== undefined
        ? item.delay
        : (activeMocks.get(`${endpoint.id}:${item.method}`)?.delay ?? 0);
    setDelay(itemDelay);
    setError(null);
  };

  const handleUpdateQueueItem = (itemId: string) => {
    try {
      // Validate JSON first
      if (!responseBody.trim()) {
        setJsonError('Response body is required');
        return;
      }

      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        setJsonError('Invalid JSON format');
        return;
      }

      const mockResponse: MockResponse = {
        status: statusCode,
        body: parsedBody,
      };

      // Validate name is required
      const nameToUse =
        queueItemName.trim() ||
        `Mock ${queue.items.findIndex((i) => i.id === itemId) + 1}`;

      // Update queue item directly
      const queues = new Map(useWidgetStore.getState().queues);
      const currentQueue = queues.get(endpoint.id);
      if (currentQueue) {
        const item = currentQueue.items.find((i) => i.id === itemId);
        if (item) {
          item.response = mockResponse;
          item.method = selectedMethod;
          item.name = nameToUse;
          item.delay = delay; // Save delay to queue item
          queues.set(endpoint.id, currentQueue);
          useWidgetStore.setState({ queues });
        }
      }

      setEditingQueueItem(null);
      setQueueItemName('');
      setResponseBody('{}');
      setStatusCode(200);
      setError(null);
      setJsonError(null);
      // Hide form after updating
      setShowAddForm(false);
    } catch {
      setJsonError('Invalid JSON in response body');
    }
  };

  const handleSave = () => {
    try {
      // Validate JSON if editing queue item
      if (editingQueueItem) {
        handleUpdateQueueItem(editingQueueItem);
        return;
      }

      // Always use queue - if no queue exists, create one with current form data
      let queueToUse = queue;
      if (!queueToUse || queueToUse.items.length === 0) {
        // Validate JSON first
        if (!responseBody.trim()) {
          setJsonError('Response body is required');
          return;
        }

        let parsedBody;
        try {
          parsedBody = JSON.parse(responseBody);
        } catch {
          setJsonError('Invalid JSON format');
          return;
        }
        const mockResponse: MockResponse = {
          status: statusCode,
          body: parsedBody,
        };
        const nameToUse = queueItemName.trim() || mockName.trim() || 'Mock 1';

        const queueItem: QueueItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          method: selectedMethod,
          response: mockResponse,
          name: nameToUse,
          delay: delay, // Save delay to queue item
        };
        useWidgetStore.getState().addToQueue(endpoint.id, queueItem);
        const updatedQueue = useWidgetStore.getState().queues.get(endpoint.id);
        if (updatedQueue) {
          queueToUse = updatedQueue;
        }
      }

      // Reset queue index to start from beginning
      if (queueToUse && queueToUse.items.length > 0) {
        reset();
        // Use first item from queue as the active mock
        const firstItem = queueToUse.items[0];
        setMock(
          selectedMethod,
          firstItem.response,
          firstItem.id,
          customUrl.trim() || undefined,
          delay
        );
        // Update mock name from first item
        if (firstItem.name) {
          useWidgetStore
            .getState()
            .setMockName(endpoint.id, selectedMethod, firstItem.name);
        }
      }

      setMockEnabled(selectedMethod, isEnabled);

      // Reset call count for this endpoint
      setCallCount(endpoint.id, 0);

      // Hide form
      setShowAddForm(false);

      // Scroll to endpoint after closing
      setTimeout(() => {
        const endpointElement = document.querySelector(
          `[data-endpoint-id="${endpoint.id}"]`
        );
        if (endpointElement) {
          endpointElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }, 100);

      onClose();
    } catch {
      setError('Invalid JSON in response body');
    }
  };

  const handleDelete = () => {
    // Remove mock handler
    removeMock(selectedMethod);
    // Clear queue for this endpoint
    clear();
    // Reset call count
    setCallCount(endpoint.id, 0);
    onClose();
  };

  const handleToggleEnabled = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    setMockEnabled(selectedMethod, newEnabled);
  };

  const handleLoadFromOriginal = async () => {
    setLoadingOriginal(true);
    setJsonError(null);
    try {
      // Temporarily disable our mock to get original response
      const wasEnabled = isEnabled;
      if (wasEnabled) {
        setMockEnabled(selectedMethod, false);
        // Wait a bit for handler to update
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Build URL - use current origin and endpoint path
      // Replace path parameters with example values
      let path = endpoint.path;
      if (endpoint.parameters) {
        endpoint.parameters.forEach((param) => {
          if (param.in === 'path') {
            // Use example value or default based on type
            const exampleValue =
              param.schema?.type === 'number' ? '1' : 'example';
            path = path.replace(`{${param.name}}`, exampleValue);
          }
        });
      }

      // Use base URL from OpenAPI spec, fallback to current origin
      const baseUrlToUse = baseUrl || window.location.origin;
      // Remove trailing slash from baseUrl if present
      const cleanBaseUrl = baseUrlToUse.replace(/\/$/, '');
      const url = `${cleanBaseUrl}${path}`;

      // Make request
      const response = await fetch(url, {
        method: selectedMethod === 'ALL' ? 'GET' : selectedMethod,
        headers: {
          Accept: 'application/json',
        },
      });

      // Re-enable mock if it was enabled
      if (wasEnabled) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setMockEnabled(selectedMethod, true);
      }

      if (!response.ok) {
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Fill form with response
      setResponseBody(JSON.stringify(data, null, 2));
      setStatusCode(response.status);
      setJsonError(null);
    } catch (err) {
      const error = err as Error;
      setJsonError(error.message || 'Failed to load original response');
      console.error('Failed to load original handler response:', error);
    } finally {
      setLoadingOriginal(false);
    }
  };

  const { theme } = useWidgetStore();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${theme === 'dark' ? 'dark' : ''}`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Edit Mock
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
            {selectedMethod} {formatPathForDisplay(endpoint.path)}
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Queue section - at the top - always show */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Response Queue ({queue.items.length} item
                  {queue.items.length !== 1 ? 's' : ''})
                </label>
                {editingQueueItem && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingQueueItem(null);
                        setResponseBody('{}');
                        setStatusCode(200);
                        setSelectedMethod(endpoint.method);
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      Cancel Edit
                    </button>
                    <button
                      onClick={() => handleUpdateQueueItem(editingQueueItem)}
                      className="px-3 py-1 text-sm bg-blue-600 dark:bg-indigo-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-indigo-500"
                    >
                      Update Item
                    </button>
                  </div>
                )}
              </div>

              {queue.items.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {queue.items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-md border ${
                        editingQueueItem === item.id
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/50'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.name || `Mock ${index + 1}`}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.method} - {item.response.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
                          {JSON.stringify(item.response.body).substring(0, 50)}
                          {JSON.stringify(item.response.body).length > 50
                            ? '...'
                            : ''}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2">
                        {editingQueueItem !== item.id && (
                          <>
                            <button
                              onClick={() => handleEditQueueItem(item)}
                              className="px-2 py-1 text-xs bg-blue-600 dark:bg-indigo-600 text-white rounded hover:bg-blue-700 dark:hover:bg-indigo-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="px-2 py-1 text-xs bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
                  No items in queue. Add responses below to create a queue.
                </div>
              )}
            </div>

            {/* Form section - at the bottom - show if showAddForm is true or editing queue item */}
            {(showAddForm || editingQueueItem) && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {editingQueueItem
                    ? 'Edit Queue Item'
                    : queue.items.length === 0
                      ? 'Add Mock Response'
                      : 'Add New Response'}
                </h4>

                {/* Name field - always show when form is visible */}
                <div>
                  <label
                    htmlFor="queue-item-name-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Name (Queue Item)
                  </label>
                  <input
                    id="queue-item-name-input"
                    type="text"
                    value={
                      editingQueueItem || showAddForm ? queueItemName : mockName
                    }
                    onChange={(e) => {
                      if (editingQueueItem || showAddForm) {
                        setQueueItemName(e.target.value);
                      } else {
                        setMockName(e.target.value);
                      }
                    }}
                    placeholder={
                      editingQueueItem || showAddForm
                        ? 'e.g., Mock 1'
                        : 'e.g., Handler'
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="http-method-select"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    HTTP Method
                  </label>
                  <select
                    id="http-method-select"
                    value={selectedMethod}
                    onChange={(e) =>
                      setSelectedMethod(e.target.value as HttpMethod)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  >
                    {HTTP_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="custom-url-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Custom URL (optional)
                  </label>
                  <input
                    id="custom-url-input"
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder={endpoint.path}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Leave empty to use endpoint path:{' '}
                    {formatPathForDisplay(endpoint.path)}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="status-code-select"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Status Code
                  </label>
                  <select
                    id="status-code-select"
                    value={statusCode}
                    onChange={(e) => setStatusCode(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  >
                    {HTTP_STATUS_CODES.map((code) => (
                      <option key={code.value} value={code.value}>
                        {code.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="delay-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Delay (ms)
                  </label>
                  <input
                    id="delay-input"
                    type="number"
                    min="0"
                    step="100"
                    value={delay === 0 ? '' : delay}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '0') {
                        setDelay(0);
                      } else {
                        const numValue = Number(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          setDelay(numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        setDelay(0);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Delay before sending response (empty or 0 = no delay)
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="response-body-input"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Response Body (JSON)
                    </label>
                    {queue.items.length === 0 && (
                      <button
                        type="button"
                        onClick={handleLoadFromOriginal}
                        disabled={loadingOriginal}
                        className="px-3 py-1 text-xs bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingOriginal ? 'Loading...' : 'Load from original'}
                      </button>
                    )}
                  </div>
                  <textarea
                    id="response-body-input"
                    value={responseBody}
                    onChange={(e) => {
                      const value = e.target.value;
                      setResponseBody(value);
                      setError(null);
                      // Validate JSON in real-time
                      if (value.trim()) {
                        try {
                          JSON.parse(value);
                          setJsonError(null);
                        } catch {
                          setJsonError('Invalid JSON format');
                        }
                      } else {
                        setJsonError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                      jsonError
                        ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
                    }`}
                    rows={10}
                    placeholder='{"key": "value"}'
                  />
                  {jsonError && (
                    <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {jsonError}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={handleToggleEnabled}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Enabled
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
          <div className="flex gap-2">
            {activeMock && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                Delete Mock
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            {!editingQueueItem && (
              <>
                {/* Show "Add Next" only when queue has items and form is hidden */}
                {queue.items.length > 0 && !showAddForm && (
                  <button
                    onClick={handleAddNext}
                    className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                  >
                    Add Next
                  </button>
                )}
                {/* Show "Add to Queue" when form is visible (either empty queue or after Add Next) */}
                {showAddForm && (
                  <button
                    onClick={handleAddToQueue}
                    className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                  >
                    Add to Queue
                  </button>
                )}
                {/* Show "Save" only when form is visible and queue is empty, or when queue has items and form is hidden */}
                {(!showAddForm || queue.items.length === 0) && (
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-indigo-500 transition-colors"
                  >
                    Save
                  </button>
                )}
              </>
            )}
            {editingQueueItem && (
              <>
                <button
                  onClick={() => {
                    setEditingQueueItem(null);
                    setResponseBody('{}');
                    setStatusCode(200);
                    setSelectedMethod(endpoint.method);
                    setShowAddForm(false);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Cancel Edit
                </button>
                <button
                  onClick={() => handleUpdateQueueItem(editingQueueItem)}
                  className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-indigo-500 transition-colors"
                >
                  Update Item
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
