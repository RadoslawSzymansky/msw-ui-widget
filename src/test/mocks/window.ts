/**
 * Mock window APIs for testing
 */
export const mockWindow = () => {
  return {
    location: {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
};
