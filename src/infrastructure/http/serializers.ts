/**
 * Entity→JSON変換ヘルパー
 *
 * 各Entityは`private`フィールド（`_id`等）を持つクラスであり、
 * `JSON.stringify()`にそのまま渡すとTypeScriptの`private`は実行時の
 * 制約ではないため`_id`等の内部フィールド名がそのまま漏れる。
 * 必ずこのファイルの関数を通してpublicなgetter経由でシリアライズする。
 */
import type { Reflection } from '../../domain/entities/Reflection.js';
import type { SkinLog } from '../../domain/entities/SkinLog.js';
import type { PurchaseLog } from '../../domain/entities/PurchaseLog.js';
import type { AppearanceLog } from '../../domain/entities/AppearanceLog.js';
import type { ChallengeLog } from '../../domain/entities/ChallengeLog.js';
import type { Capture } from '../../domain/entities/Capture.js';

export function serializeReflection(reflection: Reflection) {
  return {
    id: reflection.id,
    date: reflection.date,
    record: reflection.record,
    createdAt: reflection.createdAt.toISOString(),
  };
}

export function serializeSkinLog(log: SkinLog) {
  return {
    id: log.id,
    record: log.record,
    createdAt: log.createdAt.toISOString(),
  };
}

export function serializePurchaseLog(purchase: PurchaseLog) {
  return {
    id: purchase.id,
    productName: purchase.productName,
    status: purchase.status,
    record: purchase.record,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
  };
}

export function serializeAppearanceLog(log: AppearanceLog) {
  return {
    id: log.id,
    record: log.record,
    createdAt: log.createdAt.toISOString(),
  };
}

export function serializeChallengeLog(log: ChallengeLog) {
  return {
    id: log.id,
    record: log.record,
    createdAt: log.createdAt.toISOString(),
  };
}

export function serializeCapture(capture: Capture) {
  return {
    id: capture.id,
    record: capture.record,
    createdAt: capture.createdAt.toISOString(),
  };
}
