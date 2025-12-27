import React, { useEffect } from 'react';
import { MswUiWidgetProps } from '../utils/types';
import { useOpenApiParser } from '../hooks/useOpenApiParser';
import { useWidgetStore } from '../store/widgetStore';
import { FloatingButton } from './FloatingButton';
import { WidgetPanel } from './WidgetPanel';
import { injectStyles } from '../utils/injectStyles';
import widgetStyles from '../styles/inline';

export const MswUiWidget: React.FC<MswUiWidgetProps> = ({
  worker,
  openapiUrl,
  visible = true,
}) => {
  const { endpoints, baseUrl, loading, error } = useOpenApiParser(
    visible ? openapiUrl : null
  );
  const { setEndpoints, setBaseUrl, setPanelOpen, setWorker, theme } =
    useWidgetStore();

  // Inject styles into document head (only once)
  useEffect(() => {
    injectStyles(widgetStyles);
  }, []);

  // Apply theme class to root element
  useEffect(() => {
    const root = document.querySelector('.msw-widget-root');
    if (root) {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

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
    return null;
  }

  return (
    <>
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
