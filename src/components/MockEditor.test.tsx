import { render, screen, waitFor, fireEvent } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { MockEditor } from './MockEditor';
import { useWidgetStore } from '../store/widgetStore';
import { Endpoint, MockResponse } from '../utils/types';
import * as useMswHandler from '../hooks/useMswHandler';
import * as useEndpointQueue from '../hooks/useEndpointQueue';

// Mock hooks
vi.mock('../hooks/useMswHandler');
vi.mock('../hooks/useEndpointQueue');

describe('MockEditor', () => {
  const endpoint: Endpoint = {
    id: 'GET:/users',
    path: '/users',
    method: 'GET',
  };

  const mockSetMock = vi.fn();
  const mockRemoveMock = vi.fn();
  const mockSetMockEnabled = vi.fn();
  const mockRemoveItem = vi.fn();
  const mockGetNext = vi.fn();
  const mockReset = vi.fn();
  const mockClear = vi.fn();

  beforeEach(() => {
    useWidgetStore.getState().reset();
    vi.clearAllMocks();

    vi.mocked(useMswHandler.useMswHandler).mockReturnValue({
      setMock: mockSetMock,
      removeMock: mockRemoveMock,
      setMockEnabled: mockSetMockEnabled,
      applyMock: vi.fn(),
      trackCall: vi.fn(),
      getOriginalResponse: vi.fn(),
      getActiveMock: vi.fn(),
    });

    vi.mocked(useEndpointQueue.useEndpointQueue).mockReturnValue({
      queue: { endpointId: endpoint.id, items: [], currentIndex: 0 },
      addItem: vi.fn(),
      removeItem: mockRemoveItem,
      getNext: mockGetNext,
      reset: mockReset,
      clear: mockClear,
    });
  });

  it('should render editor', () => {
    render(<MockEditor endpoint={endpoint} onClose={vi.fn()} />);
    expect(screen.getByText(/Delay \(ms\)/i)).toBeInTheDocument();
  });

  it('should load delay value from activeMock when editing existing mock', () => {
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1 },
    };

    useWidgetStore.getState().addMock(
      endpoint.id,
      endpoint.method,
      mockResponse,
      undefined,
      undefined,
      undefined,
      500 // delay
    );

    render(<MockEditor endpoint={endpoint} onClose={vi.fn()} />);

    const delayInput = screen.getByRole('spinbutton', {
      name: /Delay \(ms\)/i,
    }) as HTMLInputElement;
    expect(delayInput.value).toBe('500');
  });

  it('should display empty string for delay when value is 0', () => {
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1 },
    };

    useWidgetStore.getState().addMock(
      endpoint.id,
      endpoint.method,
      mockResponse,
      undefined,
      undefined,
      undefined,
      0 // delay
    );

    render(<MockEditor endpoint={endpoint} onClose={vi.fn()} />);

    const delayInput = screen.getByRole('spinbutton', {
      name: /Delay \(ms\)/i,
    }) as HTMLInputElement;
    expect(delayInput.value).toBe('');
  });

  it('should update delay value when user types in delay input', async () => {
    const user = userEvent.setup();
    render(<MockEditor endpoint={endpoint} onClose={vi.fn()} />);

    const delayInput = screen.getByRole('spinbutton', {
      name: /Delay \(ms\)/i,
    }) as HTMLInputElement;
    await user.clear(delayInput);
    await user.type(delayInput, '1000');

    expect(delayInput.value).toBe('1000');
  });

  it('should save delay value when saving mock', async () => {
    const user = userEvent.setup();
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1 },
    };

    useWidgetStore
      .getState()
      .addMock(endpoint.id, endpoint.method, mockResponse);

    render(<MockEditor endpoint={endpoint} onClose={vi.fn()} />);

    const delayInput = screen.getByRole('spinbutton', {
      name: /Delay \(ms\)/i,
    }) as HTMLInputElement;
    await user.clear(delayInput);
    await user.type(delayInput, '750');

    const responseBodyInput = screen.getByRole('textbox', {
      name: /Response Body/i,
    }) as HTMLTextAreaElement;
    await user.clear(responseBodyInput);
    fireEvent.change(responseBodyInput, { target: { value: '{"id": 1}' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSetMock).toHaveBeenCalledWith(
        endpoint.method,
        expect.any(Object),
        expect.any(String),
        undefined,
        750 // delay should be saved
      );
    });
  });

  it('should sync delay value when activeMock changes', async () => {
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1 },
    };

    render(<MockEditor endpoint={endpoint} onClose={vi.fn()} />);

    // Initially delay should be 0 (empty)
    const delayInput = screen.getByRole('spinbutton', {
      name: /Delay \(ms\)/i,
    }) as HTMLInputElement;
    expect(delayInput.value).toBe('');

    // Update mock with delay
    useWidgetStore
      .getState()
      .addMock(
        endpoint.id,
        endpoint.method,
        mockResponse,
        undefined,
        undefined,
        undefined,
        300
      );

    // Delay should be synced
    await waitFor(() => {
      expect(delayInput.value).toBe('300');
    });
  });

  it('should handle delay value of 0 correctly', async () => {
    const user = userEvent.setup();
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1 },
    };

    useWidgetStore
      .getState()
      .addMock(
        endpoint.id,
        endpoint.method,
        mockResponse,
        undefined,
        undefined,
        undefined,
        500
      );

    render(<MockEditor endpoint={endpoint} onClose={vi.fn()} />);

    const delayInput = screen.getByRole('spinbutton', {
      name: /Delay \(ms\)/i,
    }) as HTMLInputElement;
    expect(delayInput.value).toBe('500');

    // Clear delay (set to 0)
    await user.clear(delayInput);

    // Value should be empty string when 0
    expect(delayInput.value).toBe('');

    const responseBodyInput = screen.getByRole('textbox', {
      name: /Response Body/i,
    }) as HTMLTextAreaElement;
    await user.clear(responseBodyInput);
    fireEvent.change(responseBodyInput, { target: { value: '{"id": 1}' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSetMock).toHaveBeenCalledWith(
        endpoint.method,
        expect.any(Object),
        expect.any(String),
        undefined,
        0 // delay should be 0
      );
    });
  });

  it('should update delay when switching methods', async () => {
    const mockResponse: MockResponse = {
      status: 200,
      body: { id: 1 },
    };

    // Add mock for GET with delay 500
    useWidgetStore
      .getState()
      .addMock(
        endpoint.id,
        'GET',
        mockResponse,
        undefined,
        undefined,
        undefined,
        500
      );

    // Add mock for POST with delay 1000
    useWidgetStore
      .getState()
      .addMock(
        endpoint.id,
        'POST',
        mockResponse,
        undefined,
        undefined,
        undefined,
        1000
      );

    render(<MockEditor endpoint={endpoint} onClose={vi.fn()} />);

    const delayInput = screen.getByRole('spinbutton', {
      name: /Delay \(ms\)/i,
    }) as HTMLInputElement;
    expect(delayInput.value).toBe('500'); // GET delay

    // Switch to POST method
    const methodSelect = screen.getByRole('combobox', {
      name: /HTTP Method/i,
    }) as HTMLSelectElement;
    const user = userEvent.setup();
    await user.selectOptions(methodSelect, 'POST');

    // Delay should update to POST delay
    await waitFor(() => {
      expect(delayInput.value).toBe('1000');
    });
  });
});
