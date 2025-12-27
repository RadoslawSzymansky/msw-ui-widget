import { render, screen } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { SearchFilter } from './SearchFilter';
import { useWidgetStore } from '../store/widgetStore';

describe('SearchFilter', () => {
  beforeEach(() => {
    useWidgetStore.getState().reset();
  });

  it('should render search input', () => {
    render(<SearchFilter />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('should update search query on input', async () => {
    const user = userEvent.setup();
    render(<SearchFilter />);

    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'test query');

    expect(useWidgetStore.getState().searchQuery).toBe('test query');
  });

  it('should render method filter buttons', () => {
    render(<SearchFilter />);
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('should toggle method filter', async () => {
    const user = userEvent.setup();
    render(<SearchFilter />);

    const getButton = screen.getByText('GET');
    await user.click(getButton);

    expect(useWidgetStore.getState().filterMethods.has('GET')).toBe(true);
  });
});
