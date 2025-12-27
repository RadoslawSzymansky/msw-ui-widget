// Import CSS to ensure Vite generates dist/style.css for inline styles generation
// Styles are automatically injected by the widget component at runtime
import './styles/widget.css';
import './styles/widget-base.css';

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
