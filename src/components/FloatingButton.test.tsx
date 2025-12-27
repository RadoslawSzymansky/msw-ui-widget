import { render, screen } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { FloatingButton } from './FloatingButton';

describe('FloatingButton', () => {
  it('should render button', () => {
    const onClick = vi.fn();
    render(<FloatingButton onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FloatingButton onClick={onClick} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });
});
