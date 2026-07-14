import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * `env.ts`の`loadEnv()`はモジュールスコープで結果をキャッシュするため
 * （`env.ts`参照）、環境変数を変えて複数ケースを検証するには
 * `vi.resetModules()`で毎回モジュールを読み直す必要がある。
 */
describe('loadConnectorConfig', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ARC_API_KEY;
    delete process.env.ARC_CONNECTOR_BASE_URL;
  });

  it('falls back to the default baseUrl and no apiKey when unset (デフォルト値)', async () => {
    const { loadConnectorConfig } = await import('./connectorConfig.js');
    const config = loadConnectorConfig();
    expect(config.baseUrl).toBe('http://127.0.0.1:3939');
    expect(config.apiKey).toBeUndefined();
  });

  it('reads baseUrl/apiKey from environment variables, never hardcoded (環境変数からの読み込み)', async () => {
    process.env.ARC_CONNECTOR_BASE_URL = 'http://127.0.0.1:4000';
    process.env.ARC_API_KEY = 'test-secret';

    const { loadConnectorConfig } = await import('./connectorConfig.js');
    const config = loadConnectorConfig();
    expect(config.baseUrl).toBe('http://127.0.0.1:4000');
    expect(config.apiKey).toBe('test-secret');
  });
});
