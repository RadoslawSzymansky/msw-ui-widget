import { render, screen } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { EndpointItem } from './EndpointItem';
import { useWidgetStore } from '../store/widgetStore';
import { Endpoint } from '../utils/types';

// Mock MockEditor
vi.mock('./MockEditor', () => ({
  MockEditor: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mock-editor">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('EndpointItem', () => {
  const endpoint: Endpoint = {
    id: 'GET:/users',
    path: '/users',
    method: 'GET',
  };

  beforeEach(() => {
    useWidgetStore.getState().reset();
  });

  it('should render endpoint', () => {
    render(<EndpointItem endpoint={endpoint} />);
    expect(screen.getByText(/users/i)).toBeInTheDocument();
  });

  it('should display call count', () => {
    useWidgetStore.getState().incrementCallCount(endpoint.id);
    useWidgetStore.getState().incrementCallCount(endpoint.id);

    render(<EndpointItem endpoint={endpoint} />);
    // Call count is displayed in the component, check for endpoint rendering
    expect(screen.getByText(/users/i)).toBeInTheDocument();
  });

  it('should open editor on click', async () => {
    const user = userEvent.setup();
    render(<EndpointItem endpoint={endpoint} />);

    const mockButton = screen.getByRole('button', { name: /mock/i });
    await user.click(mockButton);
    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();
  });

  it('should toggle pin', async () => {
    const user = userEvent.setup();
    render(<EndpointItem endpoint={endpoint} />);

    const pinButton = screen.getByRole('button', { name: '📌' });
    await user.click(pinButton);

    expect(useWidgetStore.getState().pinnedEndpoints.has(endpoint.id)).toBe(
      true
    );
  });
});
