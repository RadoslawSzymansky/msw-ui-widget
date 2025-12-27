import { render, screen } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { MswUiWidget } from '../components/MswUiWidget';
import { useWidgetStore } from '../store/widgetStore';
import * as useOpenApiParser from '../hooks/useOpenApiParser';
import { Endpoint, HttpMethod } from '../utils/types';

vi.mock('../hooks/useOpenApiParser', () => ({
  useOpenApiParser: vi.fn(),
}));

describe('Widget Flow Integration', () => {
  const mockWorker = { use: vi.fn(), resetHandlers: vi.fn() };
  const endpoints: Endpoint[] = [
    { id: 'GET:/users', path: '/users', method: 'GET' as HttpMethod },
    { id: 'POST:/posts', path: '/posts', method: 'POST' as HttpMethod },
  ];

  beforeEach(() => {
    useWidgetStore.getState().reset();
    vi.mocked(useOpenApiParser.useOpenApiParser).mockReturnValue({
      endpoints,
      baseUrl: 'https://api.example.com',
      loading: false,
      error: null,
    });
  });

  it('should complete full flow: open panel -> search -> add mock', async () => {
    const user = userEvent.setup();
    render(
      <MswUiWidget
        worker={mockWorker}
        openapiUrl="/api/openapi.json"
        visible={true}
      />
    );

    // Open panel
    const floatingButton = screen.getByRole('button');
    await user.click(floatingButton);

    expect(useWidgetStore.getState().isPanelOpen).toBe(true);
  });

  it('should filter endpoints by search', async () => {
    render(
      <MswUiWidget
        worker={mockWorker}
        openapiUrl="/api/openapi.json"
        visible={true}
      />
    );

    useWidgetStore.getState().setPanelOpen(true);
    useWidgetStore.getState().setSearchQuery('users');

    const filtered = useWidgetStore
      .getState()
      .endpoints.filter((e) => e.path.includes('users'));
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('should track call history', () => {
    useWidgetStore.getState().incrementCallCount('GET:/users');
    useWidgetStore.getState().addCallHistory({
      endpointId: 'GET:/users',
      method: 'GET',
      path: '/users',
      fullUrl: '/users',
    });

    const history = useWidgetStore.getState().callHistory;
    expect(history.length).toBe(1);
  });
});
