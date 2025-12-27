import { render, screen } from '../test/utils';
import { MswUiWidget } from './MswUiWidget';
import { useWidgetStore } from '../store/widgetStore';
import * as useOpenApiParser from '../hooks/useOpenApiParser';
import { Endpoint, HttpMethod } from '../utils/types';

// Mock useOpenApiParser
vi.mock('../hooks/useOpenApiParser', () => ({
  useOpenApiParser: vi.fn(),
}));

describe('MswUiWidget', () => {
  const mockWorker = { use: vi.fn(), resetHandlers: vi.fn() };

  beforeEach(() => {
    useWidgetStore.getState().reset();
    vi.clearAllMocks();
    vi.mocked(useOpenApiParser.useOpenApiParser).mockReturnValue({
      endpoints: [],
      baseUrl: undefined,
      loading: false,
      error: null,
    });
  });

  it('should not render widget when visible is false', () => {
    render(
      <MswUiWidget
        worker={mockWorker}
        openapiUrl="/api/openapi.json"
        visible={false}
      />
    );

    expect(screen.queryByText('MSW Widget')).not.toBeInTheDocument();
  });

  it('should not render widget when worker is null', () => {
    render(
      <MswUiWidget
        worker={null}
        openapiUrl="/api/openapi.json"
        visible={true}
      />
    );

    expect(screen.queryByText('MSW Widget')).not.toBeInTheDocument();
  });

  it('should set worker in store', () => {
    render(
      <MswUiWidget
        worker={mockWorker}
        openapiUrl="/api/openapi.json"
        visible={true}
      />
    );

    expect(useWidgetStore.getState().worker).toBe(mockWorker);
  });

  it('should update endpoints in store when parsed', () => {
    const endpoints: Endpoint[] = [
      { id: 'GET:/users', path: '/users', method: 'GET' as HttpMethod },
    ];
    vi.mocked(useOpenApiParser.useOpenApiParser).mockReturnValue({
      endpoints,
      baseUrl: 'https://api.example.com',
      loading: false,
      error: null,
    });

    render(
      <MswUiWidget
        worker={mockWorker}
        openapiUrl="/api/openapi.json"
        visible={true}
      />
    );

    expect(useWidgetStore.getState().endpoints).toEqual(endpoints);
    expect(useWidgetStore.getState().baseUrl).toBe('https://api.example.com');
  });

  it('should display loading indicator', () => {
    vi.mocked(useOpenApiParser.useOpenApiParser).mockReturnValue({
      endpoints: [],
      baseUrl: undefined,
      loading: true,
      error: null,
    });

    render(
      <MswUiWidget
        worker={mockWorker}
        openapiUrl="/api/openapi.json"
        visible={true}
      />
    );

    expect(screen.getByText('Loading OpenAPI spec...')).toBeInTheDocument();
  });

  it('should display error indicator', () => {
    const error = new Error('Failed to load');
    vi.mocked(useOpenApiParser.useOpenApiParser).mockReturnValue({
      endpoints: [],
      baseUrl: undefined,
      loading: false,
      error,
    });

    render(
      <MswUiWidget
        worker={mockWorker}
        openapiUrl="/api/openapi.json"
        visible={true}
      />
    );

    expect(screen.getByText(/Error:/)).toBeInTheDocument();
  });

  it('should not parse when visible is false', () => {
    render(
      <MswUiWidget
        worker={mockWorker}
        openapiUrl="/api/openapi.json"
        visible={false}
      />
    );

    expect(useOpenApiParser.useOpenApiParser).toHaveBeenCalledWith(null);
  });
});
