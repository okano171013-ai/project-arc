import { loadEnv } from '../config/env.js';

/**
 * ConnectorConfig（Version15、Connector Deployment）
 *
 * Connector自体の設定（接続先・API Key）をコード中にハードコード
 * しない（指示書7章）。既存の`env.ts`（zod検証済み）を経由して
 * `.env`から読み込む。サーバー側のAPI Key検証（`server.ts`起動時の
 * `loadEnv().ARC_API_KEY`）と同じ値を共有する想定——同一マシン上で
 * ConnectorとServerが同じ秘密鍵を使う、という単純な構成（ADR 0036）。
 */
export interface ConnectorConfig {
  readonly baseUrl: string;
  readonly apiKey?: string;
}

export function loadConnectorConfig(): ConnectorConfig {
  const env = loadEnv();
  return {
    baseUrl: env.ARC_CONNECTOR_BASE_URL,
    apiKey: env.ARC_API_KEY,
  };
}
