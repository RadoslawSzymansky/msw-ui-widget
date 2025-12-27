import React, { useState, useEffect, useRef } from 'react';
import { Endpoint, HttpMethod } from '../utils/types';
import { useWidgetStore } from '../store/widgetStore';
import { useCallHistory } from '../hooks/useCallHistory';
import { useMswHandler } from '../hooks/useMswHandler';
import { formatPathForDisplay } from '../utils/openApiParser';
import { MockEditor } from './MockEditor';

interface EndpointItemProps {
  endpoint: Endpoint;
}

export const EndpointItem: React.FC<EndpointItemProps> = ({ endpoint }) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const {
    activeMocks,
    queues,
    getHandlerCallCount,
    pinnedEndpoints,
    togglePinEndpoint,
  } = useWidgetStore();
  const { getLastCalled } = useCallHistory();
  const { removeMock } = useMswHandler(endpoint);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const isPinned = pinnedEndpoints.has(endpoint.id);

  const lastCalled = getLastCalled(endpoint.id);
  const activeMock = activeMocks.get(`${endpoint.id}:${endpoint.method}`);
  const queue = queues.get(endpoint.id);

  // Animation trigger when endpoint is called and it's mocked
  useEffect(() => {
    if (lastCalled && activeMock && activeMock.enabled) {
      // Use requestAnimationFrame to defer setState outside of effect
      const rafId = requestAnimationFrame(() => {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 1500);
        return () => clearTimeout(timer);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [lastCalled, activeMock]);

  const methodColors: Record<HttpMethod, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
    PATCH: 'bg-purple-100 text-purple-800',
    HEAD: 'bg-gray-100 text-gray-800',
    OPTIONS: 'bg-gray-100 text-gray-800',
    ALL: 'bg-indigo-100 text-indigo-800',
  };

  return (
    <>
      <div
        ref={itemRef}
        data-endpoint-id={endpoint.id}
        className={`p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
          isAnimating ? 'endpoint-call-indicator' : ''
        } ${isPinned ? 'bg-yellow-50 border-yellow-200' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isPinned && (
                <span className="text-yellow-600" title="Pinned endpoint">
                  📌
                </span>
              )}
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  methodColors[endpoint.method] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {endpoint.method}
              </span>
              <span className="text-sm font-mono text-gray-700 truncate">
                {formatPathForDisplay(endpoint.path)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {activeMock && activeMock.enabled && (
                <span className="text-gray-400">Mocked:</span>
              )}
              {activeMock && queue && queue.items.length > 0 && (
                <>
                  {queue.items.map((item, index) => {
                    const handlerCalls = getHandlerCallCount(
                      endpoint.id,
                      item.id
                    );
                    return (
                      <span
                        key={item.id}
                        className={`px-2 py-0.5 rounded ${
                          activeMock.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.name || `Mock ${index + 1}`}{' '}
                        {handlerCalls > 0 ? `(${handlerCalls})` : ''}
                      </span>
                    );
                  })}
                </>
              )}
              {activeMock && (!queue || queue.items.length === 0) && (
                <span
                  className={`px-2 py-0.5 rounded ${
                    activeMock.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {activeMock.name || 'Mock'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinEndpoint(endpoint.id);
              }}
              className={`p-1 rounded transition-colors ${
                isPinned
                  ? 'text-yellow-600 hover:bg-yellow-100'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={isPinned ? 'Unpin endpoint' : 'Pin endpoint'}
            >
              📌
            </button>
            {activeMock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeMock(endpoint.method);
                }}
                className="p-1 rounded transition-colors text-gray-500 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"
                title="Remove mock"
                style={{ minWidth: '20px', minHeight: '20px' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsEditorOpen(true)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {activeMock ? 'Edit' : 'Mock'}
            </button>
          </div>
        </div>
      </div>
      {isEditorOpen && (
        <MockEditor
          endpoint={endpoint}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </>
  );
};
