import React, { useState } from 'react';
import { EndpointGroup as EndpointGroupType } from '../utils/endpointGrouper';
import { EndpointItem } from './EndpointItem';

interface EndpointGroupProps {
  group: EndpointGroupType;
}

export const EndpointGroup: React.FC<EndpointGroupProps> = ({ group }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            {group.name}
          </span>
          <span className="text-xs text-gray-500">
            ({group.endpoints.length})
          </span>
        </div>
        <span className="text-gray-500 text-sm">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div>
          {group.endpoints.map((endpoint) => (
            <EndpointItem key={endpoint.id} endpoint={endpoint} />
          ))}
        </div>
      )}
    </div>
  );
};
