import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/**/*.test.{ts,tsx}'],
  project: ['src/**/*.{ts,tsx}'],
  ignore: [
    'dist/**',
    'node_modules/**',
    'coverage/**',
    // Test mocks - may be used in future tests
    'src/test/mocks/**',
  ],
  ignoreDependencies: [
    '@types/uuid',
    // These are used by typescript-eslint in eslint.config.mjs
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
  ],
  eslint: {
    config: 'eslint.config.mjs',
  },
};

// Note: Knip reports the following as unused, but they are actually used (false positives):
// - resetStore, createMockWorker (src/test/utils.tsx): Test utilities
// - ParsedOpenApiSpec: Used as return type in parseOpenApiSpec() function
// - EndpointCallCount: Used in WidgetState.callCounts: Map<string, EndpointCallCount>
// - ActiveMock: Used in WidgetState.activeMocks: Map<string, ActiveMock>
// Knip doesn't detect type usage in Map<> generics or function return types

export default config;
