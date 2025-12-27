import React from 'react';
import { HttpMethod } from '../utils/types';
import { useWidgetStore } from '../store/widgetStore';

export const SearchFilter: React.FC = () => {
  const {
    searchQuery,
    filterMethods,
    toggleFilterMethod,
    setSearchQuery,
    showPinnedOnly,
    setShowPinnedOnly,
    pinnedEndpoints,
    showMockedOnly,
    setShowMockedOnly,
    activeMocks,
  } = useWidgetStore();

  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  // Animate input when filters change
  React.useEffect(() => {
    if (searchQuery) {
      setShouldAnimate(true);
      const timer = setTimeout(() => setShouldAnimate(false), 500);
      return () => clearTimeout(timer);
    }
  }, [filterMethods, showPinnedOnly, showMockedOnly, searchQuery]);

  const mockedCount = Array.from(activeMocks.values()).filter(
    (m) => m.enabled
  ).length;

  const methods: HttpMethod[] = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'HEAD',
    'OPTIONS',
    'ALL',
  ];

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Search endpoints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
            shouldAnimate
              ? 'border-blue-500 ring-2 ring-blue-400 animate-input-outline'
              : 'border-gray-300'
          }`}
        />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {methods.map((method) => (
          <button
            key={method}
            onClick={() => toggleFilterMethod(method)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              filterMethods.has(method)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {method}
          </button>
        ))}
        {mockedCount > 0 && (
          <button
            onClick={() => setShowMockedOnly(!showMockedOnly)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              showMockedOnly
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Show only mocked endpoints"
          >
            Mocked ({mockedCount})
          </button>
        )}
        {pinnedEndpoints.size > 0 && (
          <button
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
              showPinnedOnly
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Show only pinned endpoints"
          >
            📌 Pinned ({pinnedEndpoints.size})
          </button>
        )}
      </div>
    </div>
  );
};
