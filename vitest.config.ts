import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Domain / Application層のカバレッジを重視する。
      include: ['src/domain/**', 'src/application/**'],
    },
  },
});
