/**
 * rateLimiter（Version30、既存OAuth実装のsecurity review）
 *
 * `LocalOAuthProvider`の`/authorize/confirm`（Passcode検証、SDK非経由の
 * 自前ルート）には、ADR 0049が前提としていた「SDKの`authorizationHandler`
 * によるIPベースのレート制限」が適用されない——そちらは`/authorize`
 * （GET、SDK配下）のみを保護しており、Passcodeを実際に検証する
 * `/authorize/confirm`（POST、`remoteServer.ts`が個別配線）は無制限に
 * 総当たり可能だった。本モジュールは固定窓（fixed window）カウンタに
 * よる最小限のレート制限を提供する。
 *
 * Passcode自体が十分な長さ・ランダム性を持つ前提（移行手順書で
 * 16文字以上を推奨）では総当たりは現実的に不可能だが、Owner運用の
 * 実際の強度に依存させず、多層防御として追加する。
 */

interface Window {
  count: number;
  windowStart: number;
}

export interface RateLimiter {
  /** trueなら許可、falseなら制限超過（呼び出し元が429を返すこと） */
  attempt(key: string): boolean;
}

export function createFixedWindowRateLimiter(options: { max: number; windowMs: number }): RateLimiter {
  const windows = new Map<string, Window>();

  return {
    attempt(key: string): boolean {
      const now = Date.now();
      const existing = windows.get(key);

      if (!existing || now - existing.windowStart >= options.windowMs) {
        windows.set(key, { count: 1, windowStart: now });
        return true;
      }

      if (existing.count >= options.max) {
        return false;
      }

      existing.count += 1;
      return true;
    },
  };
}
