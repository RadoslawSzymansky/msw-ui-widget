import { render, screen } from '../test/utils';
import { EndpointList } from './EndpointList';
import { useWidgetStore } from '../store/widgetStore';
import { Endpoint } from '../utils/types';
import { EndpointGroup } from '../utils/endpointGrouper';

// Mock EndpointGroup
vi.mock('./EndpointGroup', () => ({
  EndpointGroup: ({ group }: { group: EndpointGroup }) => (
    <div data-testid={`group-${group.name}`}>
      {group.endpoints.map((e: Endpoint) => (
        <div key={e.id}>{e.path}</div>
      ))}
    </div>
  ),
}));

describe('EndpointList', () => {
  const endpoints: Endpoint[] = [
    { id: 'GET:/users', path: '/users', method: 'GET' },
    { id: 'POST:/posts', path: '/posts', method: 'POST' },
  ];

  beforeEach(() => {
    useWidgetStore.getState().reset();
  });

  it('should render endpoints', () => {
    render(<EndpointList endpoints={endpoints} />);
    expect(screen.getByText('/users')).toBeInTheDocument();
    expect(screen.getByText('/posts')).toBeInTheDocument();
  });

  it('should filter by search query', () => {
    useWidgetStore.getState().setSearchQuery('users');
    render(<EndpointList endpoints={endpoints} />);

    expect(screen.getByText('/users')).toBeInTheDocument();
    expect(screen.queryByText('/posts')).not.toBeInTheDocument();
  });

  it('should show message when no endpoints match', () => {
    useWidgetStore.getState().setSearchQuery('nonexistent');
    render(<EndpointList endpoints={endpoints} />);

    expect(screen.getByText(/no endpoints match/i)).toBeInTheDocument();
  });
});
