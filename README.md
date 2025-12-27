# MSW UI Widget

React widget for managing MSW (Mock Service Worker) mocks in real-time during development. Automatically discovers endpoints from OpenAPI 3.0 specification and allows you to override responses, manage response queues, and monitor API calls.

## Features

- 🎯 **OpenAPI Integration**: Automatically parses OpenAPI 3.0 specs and discovers all endpoints
- 🔄 **Real-time Mocking**: Override MSW handlers at runtime without restarting your app
- 📊 **Response Queues**: Set up multiple responses for the same endpoint that cycle through
- 📈 **Call Monitoring**: Track which endpoints were called and how many times
- 🎨 **Developer-Friendly UI**: Clean, intuitive interface with floating button and panel
- 🔍 **Search & Filter**: Quickly find endpoints by path or HTTP method
- 📝 **Call History**: View detailed history of API calls with timestamps

## Installation

```bash
npm install msw-ui-widget
```

Or clone this repository and use the source code directly.

## Requirements

- React 18+
- MSW 2.0+
- OpenAPI 3.0 specification file (JSON or YAML)

**Note**: Tailwind CSS is bundled with the widget - you don't need to configure it in your project!

## Usage

### Basic Setup

```tsx
import { MswUiWidget } from 'msw-ui-widget';
// Styles are automatically injected - no need to import CSS!
import { setupWorker } from 'msw/browser';

// Your MSW worker
const worker = setupWorker(...handlers);

// Start MSW
await worker.start();

function App() {
  return (
    <>
      {/* Your app components */}
      <YourApp />

      {/* MSW Widget - renders as a floating button */}
      <MswUiWidget
        worker={worker}
        openapiUrl="/path/to/openapi.json"
        visible={true}
      />
    </>
  );
}
```

### Props

| Prop         | Type         | Required | Description                                      |
| ------------ | ------------ | -------- | ------------------------------------------------ |
| `worker`     | `MSW Worker` | Yes      | MSW worker instance                              |
| `openapiUrl` | `string`     | Yes      | Path to OpenAPI 3.0 specification (JSON or YAML) |
| `visible`    | `boolean`    | No       | Control widget visibility (default: `true`)      |

### Example with Vite

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MswUiWidget } from 'msw-ui-widget';
// Styles are automatically injected - no need to import CSS!
import { setupWorker } from 'msw/browser';
import { handlers } from './mocks/handlers';
import App from './App';

const worker = setupWorker(...handlers);

async function startApp() {
  await worker.start({
    onUnhandledRequest: 'bypass',
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
      <MswUiWidget
        worker={worker}
        openapiUrl="/api/openapi.json"
        visible={process.env.NODE_ENV === 'development'}
      />
    </React.StrictMode>
  );
}

startApp();
```

## How It Works

1. **OpenAPI Parsing**: Widget loads and parses your OpenAPI 3.0 specification
2. **Endpoint Discovery**: All endpoints are extracted and displayed in the widget panel
3. **Mock Management**: Click on any endpoint to create or edit a mock response
4. **Runtime Override**: Mocks are injected into MSW at runtime, taking precedence over existing handlers
5. **Call Tracking**: Widget monitors all API calls and displays call counts and history

## Features in Detail

### Response Queues

Create multiple responses for the same endpoint. Responses will cycle through in order:

1. Click on an endpoint
2. Enable "Use response queue"
3. Add multiple responses
4. Each call will return the next response in the queue

### Call Monitoring

- **Visual Indicators**: Endpoints flash when called
- **Call Counters**: See how many times each endpoint was called
- **Call History**: Open the history sidebar to see detailed call logs

### Search & Filter

- **Search**: Type in the search box to filter endpoints by path
- **Method Filter**: Click on HTTP method buttons to filter by method (GET, POST, etc.)

## Limitations

- Currently supports OpenAPI 3.0 only (not 3.1 or Swagger 2.0)
- MSW runtime handler updates may have limitations depending on MSW version
- Widget is designed for desktop use (not responsive in MVP)
- State resets on page reload (no persistence in MVP)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check
```

## Project Structure

```
src/
├── components/       # React components
├── hooks/           # Custom React hooks
├── store/           # Zustand state management
├── utils/           # Utilities (parsers, managers)
└── styles/          # CSS styles
```

## Contributing

This is an MVP implementation. Future improvements may include:

- Persistence of mock configurations
- Export/import mock configurations
- Response presets
- Network delay simulation
- More detailed call history
- Support for OpenAPI 3.1 and Swagger 2.0

## License

MIT
