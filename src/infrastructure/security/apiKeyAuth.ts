/**
 * apiKeyAuth（Version15、Connector Deployment）
 *
 * ARC Connector HTTP APIの簡易API Key認証。`Authorization: Bearer
 * <key>`ヘッダーのみを解析する純粋関数——ChatGPT Actionsのカスタム
 * ヘッダー非対応・MCP Remote ServerのBearer token慣習の両方に
 * 合わせた形式（ADR 0035）。Application層はこの関数の存在を一切
 * 知らない（ADR 0036）。
 */
export function isAuthorized(header: string | undefined, expectedKey: string): boolean {
  if (!header) return false;
  const match = /^Bearer\s+(.+)$/.exec(header);
  if (!match) return false;
  return match[1] === expectedKey;
}
