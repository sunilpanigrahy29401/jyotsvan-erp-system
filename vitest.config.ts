import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/support/global-setup.ts'],
    setupFiles: ['tests/support/env.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
  },
});
