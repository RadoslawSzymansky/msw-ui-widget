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
    theme,
    setTheme,
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

  // Apply theme class to root element
  React.useEffect(() => {
    const root = document.querySelector('.msw-widget-root');
    if (root) {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  if (!isPanelOpen) return null;

  return (
    <>
      <div
        ref={containerRef}
        className={`msw-panel bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col ${
          theme === 'dark' ? 'dark' : ''
        }`}
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
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            MSW Widget
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('mocks')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'mocks'
                  ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Show mocks"
            >
              Mocks
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'history'
                  ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Show call history"
            >
              History
            </button>
            <button
              onClick={removeAllMocks}
              className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Remove all mocks"
            >
              Reset
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-1 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                Call History
              </h3>
              <button
                onClick={clearCallHistory}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
              {callHistory.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
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
                          className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
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
                            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate flex-1"
                                title={entry.fullUrl || displayPath}
                              >
                                {displayPath}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(
                                    entry.timestamp
                                  ).toLocaleTimeString()}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                {entry.method}
                              </span>
                              {entry.response && (
                                <span
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    entry.response.status >= 400
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                      : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  }`}
                                >
                                  {entry.response.status}
                                </span>
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 space-y-4">
                              {/* Request Section */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Request
                                </h4>
                                <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                      URL:
                                    </span>
                                    <div className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-1 break-all">
                                      {entry.fullUrl || entry.path}
                                    </div>
                                  </div>
                                  {entry.request?.headers && (
                                    <div className="mb-2">
                                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        Headers:
                                      </span>
                                      <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-1 bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
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
                                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        Body:
                                      </span>
                                      <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-1 bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
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
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Response
                                  </h4>
                                  <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="mb-2">
                                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        Status:
                                      </span>
                                      <span
                                        className={`ml-2 px-2 py-0.5 text-xs rounded ${
                                          entry.response.status >= 400
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                        }`}
                                      >
                                        {entry.response.status}
                                      </span>
                                    </div>
                                    {entry.response.body && (
                                      <div>
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                          Body:
                                        </span>
                                        <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-1 bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
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
            width: '12px',
            height: '12px',
            zIndex: 11,
            cursor: 'nwse-resize',
            background: isResizing
              ? theme === 'dark'
                ? 'rgba(96, 165, 250, 0.8)'
                : 'rgba(59, 130, 246, 0.6)'
              : theme === 'dark'
                ? 'rgba(96, 165, 250, 0.5)'
                : 'rgba(59, 130, 246, 0.3)',
            borderBottomRightRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background =
                theme === 'dark'
                  ? 'rgba(96, 165, 250, 0.7)'
                  : 'rgba(59, 130, 246, 0.5)';
              e.currentTarget.style.cursor = 'nwse-resize';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background =
                theme === 'dark'
                  ? 'rgba(96, 165, 250, 0.5)'
                  : 'rgba(59, 130, 246, 0.3)';
            }
          }}
          title="Resize widget"
        >
          <svg
            width="9"
            height="9"
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
