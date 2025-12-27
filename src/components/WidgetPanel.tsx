import React from 'react';
import { useWidgetStore } from '../store/widgetStore';
import { SearchFilter } from './SearchFilter';
import { EndpointList } from './EndpointList';
import { useResize } from '../hooks/useResize';
import { useCallHistory } from '../hooks/useCallHistory';
import { formatPathForDisplay } from '../utils/openApiParser';

export const WidgetPanel: React.FC = () => {
  const {
    isPanelOpen,
    endpoints,
    setPanelOpen,
    removeAllMocks,
    viewMode,
    setViewMode,
  } = useWidgetStore();

  const { callHistory, clearCallHistory } = useCallHistory();
  const [expandedEntries, setExpandedEntries] = React.useState<Set<string>>(
    new Set()
  );

  const toggleEntry = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const { dimensions, isResizing, containerRef, handleMouseDown } = useResize({
    minWidth: 400,
    maxWidth: 90, // 90% of viewport width
    minHeight: 300,
    maxHeight: 90, // 90% of viewport height
    storageKey: 'msw-widget-panel-size',
    defaultWidth: 800,
    defaultHeight: 600,
  });

  if (!isPanelOpen) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="msw-panel bg-white rounded-lg shadow-xl flex flex-col"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '90vw',
          maxHeight: '90vh',
          position: 'fixed',
          ...(dimensions.left !== undefined && dimensions.top !== undefined
            ? { left: `${dimensions.left}px`, top: `${dimensions.top}px` }
            : { bottom: '96px', right: '24px' }),
        }}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold">MSW Widget</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('mocks')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'mocks'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              title="Show mocks"
            >
              Mocks
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              title="Show call history"
            >
              History
            </button>
            <button
              onClick={removeAllMocks}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove all mocks"
            >
              Reset
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
        </div>
        {viewMode === 'mocks' ? (
          <>
            <SearchFilter />
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <EndpointList endpoints={endpoints} />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <h3 className="text-md font-semibold">Call History</h3>
              <button
                onClick={clearCallHistory}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {callHistory.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  No calls recorded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {callHistory
                    .slice()
                    .reverse()
                    .map((entry) => {
                      const endpoint = endpoints.find(
                        (e) => e.id === entry.endpointId
                      );
                      const displayPath =
                        entry.fullUrl ||
                        (endpoint
                          ? formatPathForDisplay(endpoint.path)
                          : entry.endpointId);
                      const isExpanded = expandedEntries.has(entry.id);
                      return (
                        <div
                          key={entry.id}
                          className="border border-gray-200 rounded-md overflow-hidden"
                        >
                          <div
                            onClick={() => toggleEntry(entry.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleEntry(entry.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="text-xs font-mono text-gray-600 truncate flex-1"
                                title={entry.fullUrl || displayPath}
                              >
                                {displayPath}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    entry.timestamp
                                  ).toLocaleTimeString()}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                {entry.method}
                              </span>
                              {entry.response && (
                                <span
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    entry.response.status >= 400
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {entry.response.status}
                                </span>
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                              {/* Request Section */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  Request
                                </h4>
                                <div className="bg-white rounded-md p-3 border border-gray-200">
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-600">
                                      URL:
                                    </span>
                                    <div className="text-xs font-mono text-gray-800 mt-1 break-all">
                                      {entry.fullUrl || entry.path}
                                    </div>
                                  </div>
                                  {entry.request?.headers && (
                                    <div className="mb-2">
                                      <span className="text-xs font-semibold text-gray-600">
                                        Headers:
                                      </span>
                                      <pre className="text-xs font-mono text-gray-800 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                                        {JSON.stringify(
                                          entry.request.headers,
                                          null,
                                          2
                                        )}
                                      </pre>
                                    </div>
                                  )}
                                  {entry.request?.body && (
                                    <div>
                                      <span className="text-xs font-semibold text-gray-600">
                                        Body:
                                      </span>
                                      <pre className="text-xs font-mono text-gray-800 mt-1 bg-gray-50 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                                        {typeof entry.request.body === 'string'
                                          ? entry.request.body
                                          : JSON.stringify(
                                              entry.request.body,
                                              null,
                                              2
                                            )}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Response Section */}
                              {entry.response && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                    Response
                                  </h4>
                                  <div className="bg-white rounded-md p-3 border border-gray-200">
                                    <div className="mb-2">
                                      <span className="text-xs font-semibold text-gray-600">
                                        Status:
                                      </span>
                                      <span
                                        className={`ml-2 px-2 py-0.5 text-xs rounded ${
                                          entry.response.status >= 400
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-green-100 text-green-800'
                                        }`}
                                      >
                                        {entry.response.status}
                                      </span>
                                    </div>
                                    {entry.response.body && (
                                      <div>
                                        <span className="text-xs font-semibold text-gray-600">
                                          Body:
                                        </span>
                                        <pre className="text-xs font-mono text-gray-800 mt-1 bg-gray-50 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                                          {typeof entry.response.body ===
                                          'string'
                                            ? entry.response.body
                                            : JSON.stringify(
                                                entry.response.body,
                                                null,
                                                2
                                              )}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Resize handle - top-left corner */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'both')}
          role="button"
          tabIndex={-1}
          aria-label="Resize panel"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '9px',
            height: '9px',
            zIndex: 11,
            cursor: 'nwse-resize',
            background: isResizing
              ? 'rgba(59, 130, 246, 0.6)'
              : 'rgba(59, 130, 246, 0.3)',
            borderBottomRightRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.5)';
              e.currentTarget.style.cursor = 'nwse-resize';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
            }
          }}
          title="Resize widget"
        >
          <svg
            width="7"
            height="7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.9 }}
          >
            <path d="M3 3l6 6M3 3v6h6M21 21l-6-6M21 21v-6h-6" />
          </svg>
        </div>
      </div>
    </>
  );
};
