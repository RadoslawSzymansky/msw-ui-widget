import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import MSW worker
import { worker } from './mocks/browser';

// Import MSW Widget (from parent directory)
// @ts-ignore - Local import from parent project
import { MswUiWidget } from '../../src/components/MswUiWidget';
// @ts-ignore

// Start MSW worker
async function startApp() {
  await worker.start({
    onUnhandledRequest: 'bypass',
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MswUiWidget worker={worker} openapiUrl="/openapi.yaml" visible={true} />
      <App />
    </React.StrictMode>
  );
}

startApp().catch(console.error);
