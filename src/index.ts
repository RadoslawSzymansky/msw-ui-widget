// CSS should be imported from the built package: import 'msw-ui-widget/style.css'
// This allows the CSS to be processed by Tailwind during build time

export { MswUiWidget } from './components/MswUiWidget';
export type { MswUiWidgetProps } from './utils/types';
export type {
  Endpoint,
  HttpMethod,
  MockResponse,
  QueueItem,
  EndpointQueue,
  CallHistoryEntry,
} from './utils/types';
