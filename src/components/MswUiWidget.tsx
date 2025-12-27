import React, { useEffect } from 'react';
import { MswUiWidgetProps } from '../utils/types';
import { useOpenApiParser } from '../hooks/useOpenApiParser';
import { useWidgetStore } from '../store/widgetStore';
import { FloatingButton } from './FloatingButton';
import { WidgetPanel } from './WidgetPanel';
import '../styles/widget.css';
import '../styles/widget-base.css';

export const MswUiWidget: React.FC<MswUiWidgetProps> = ({
  worker,
  openapiUrl,
  visible = true,
  children,
}) => {
  const { endpoints, baseUrl, loading, error } = useOpenApiParser(
    visible ? openapiUrl : null
  );
  const { setEndpoints, setBaseUrl, setPanelOpen, setWorker } =
    useWidgetStore();

  // Store worker in global store
  useEffect(() => {
    if (worker) {
      setWorker(worker);
    }
  }, [worker, setWorker]);

  // Update endpoints and baseUrl in store when parsed
  useEffect(() => {
    if (endpoints.length > 0) {
      setEndpoints(endpoints);
    }
    if (baseUrl) {
      setBaseUrl(baseUrl);
    }
  }, [endpoints, baseUrl, setEndpoints, setBaseUrl]);

  // Show error if parsing failed
  useEffect(() => {
    if (error) {
      console.error('MSW Widget: Failed to parse OpenAPI spec:', error);
    }
  }, [error]);

  // Early return if not visible or no worker - prevents any useEffect from running
  if (!visible || !worker) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div className="msw-widget-root">
        <div className="msw-widget-container">
          <FloatingButton onClick={() => setPanelOpen(true)} />
          <WidgetPanel />
          {loading && (
            <div className="msw-loading-indicator">Loading OpenAPI spec...</div>
          )}
          {error && (
            <div className="msw-error-indicator">Error: {error.message}</div>
          )}
        </div>
      </div>
    </>
  );
};
