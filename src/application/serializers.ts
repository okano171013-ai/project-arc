/**
 * Entity→プレーンオブジェクト変換ヘルパー（Bridge Layer、Version9）
 *
 * 各Entityは`private`フィールド（`_id`等）を持つクラスであり、
 * `JSON.stringify()`にそのまま渡すとTypeScriptの`private`は実行時の
 * 制約ではないため`_id`等の内部フィールド名がそのまま漏れる。
 * 必ずこのファイルの関数を通してpublicなgetter経由でシリアライズする。
 *
 * Version7ではHTTP専用（`src/infrastructure/http/serializers.ts`）
 * だったが、Version9のBridge Layer（Import/Export）でCLIとHTTP
 * APIの両方が同じシリアライズ結果を必要とするようになったため、
 * Application層の共有ユーティリティとして統合した（ADR 0010）。
 */
import type { Reflection } from '../domain/entities/Reflection.js';
import type { SkinLog } from '../domain/entities/SkinLog.js';
import type { PurchaseLog } from '../domain/entities/PurchaseLog.js';
import type { AppearanceLog } from '../domain/entities/AppearanceLog.js';
import type { ChallengeLog } from '../domain/entities/ChallengeLog.js';
import type { Capture } from '../domain/entities/Capture.js';
import type { MemoryEntry } from '../domain/entities/MemoryEntry.js';
import type { InventoryItem } from '../domain/entities/InventoryItem.js';
import type { ThirdPersonEvaluation } from '../domain/entities/ThirdPersonEvaluation.js';
import type { ExternalSource } from '../domain/entities/ExternalSource.js';
import type { ExternalKnowledge } from '../domain/entities/ExternalKnowledge.js';
import type { DecisionContext, DecisionEvidence } from '../domain/value-objects/DecisionContext.js';
import type { ConversationContext } from '../domain/value-objects/ConversationContext.js';

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

export function serializeMemoryEntry(entry: MemoryEntry) {
  return {
    id: entry.id,
    category: entry.category,
    title: entry.title,
    content: entry.content,
    tags: entry.tags,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function serializeInventoryItem(item: InventoryItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    note: item.note,
    purchaseDate: item.purchaseDate,
    purchasePrice: item.purchasePrice,
    condition: item.condition,
    usage: item.usage,
    replacementIntervalMonths: item.replacementIntervalMonths,
    photoPath: item.photoPath,
    maintenanceHistory: item.maintenanceHistory,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function serializeThirdPersonEvaluation(evaluation: ThirdPersonEvaluation) {
  return {
    id: evaluation.id,
    record: evaluation.record,
    createdAt: evaluation.createdAt.toISOString(),
  };
}

export function serializeExternalSource(source: ExternalSource) {
  return {
    id: source.id,
    record: source.record,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

export function serializeExternalKnowledge(knowledge: ExternalKnowledge) {
  return {
    id: knowledge.id,
    record: knowledge.record,
    createdAt: knowledge.createdAt.toISOString(),
    updatedAt: knowledge.updatedAt.toISOString(),
  };
}

function serializeDecisionEvidence(evidence: DecisionEvidence) {
  return {
    knowledge: serializeExternalKnowledge(evidence.knowledge),
    source: evidence.source ? serializeExternalSource(evidence.source) : null,
    score: evidence.score,
    matchedIn: evidence.matchedIn,
  };
}

export function serializeDecisionContext(context: DecisionContext) {
  return {
    question: context.question,
    candidates: context.candidates,
    comparisons: context.comparisons.map((c) => ({
      candidate: c.candidate,
      merits: c.merits,
      demerits: c.demerits,
      missingInfo: c.missingInfo,
      evidence: c.evidence.map(serializeDecisionEvidence),
    })),
    evidenceList: context.evidenceList.map(serializeDecisionEvidence),
    missingInformation: context.missingInformation,
    pointsForOwnerToDecide: context.pointsForOwnerToDecide,
  };
}

export function serializeConversationContext(context: ConversationContext) {
  return {
    question: context.question,
    intent: context.intent,
    retrievedKnowledge: context.retrievedKnowledge.map(serializeDecisionEvidence),
    decisionContext: context.decisionContext ? serializeDecisionContext(context.decisionContext) : null,
    sources: context.sources.map(serializeExternalSource),
    warnings: context.warnings,
  };
}
