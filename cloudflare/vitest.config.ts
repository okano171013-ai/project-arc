import { defineConfig } from 'vitest/config';

/**
 * cloudflare/配下専用のvitest設定（Version38）。ルートの`pnpm test`
 * （`vitest.config.ts`、`include: ['src/**\/*.test.ts']`）には含めない
 * ——Miniflare/workerdの起動コストをNode側の高速なテストスイートに
 * 持ち込まないための分離。`pnpm cloudflare:test`で個別に実行する。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['cloudflare/**/*.test.ts'],
    testTimeout: 30000,
  },
});
