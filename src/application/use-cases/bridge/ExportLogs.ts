import type { BridgeLogType } from './BridgeLogType.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalKnowledge, ExternalKnowledgeStatus } from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalSourceType } from '../../../domain/entities/ExternalSource.js';

import {
  serializeReflection,
  serializeMemoryEntry,
  serializeInventoryItem,
  serializeAppearanceLog,
  serializeSkinLog,
  serializePurchaseLog,
  serializeChallengeLog,
  serializeThirdPersonEvaluation,
  serializeExternalSource,
  serializeExternalKnowledge,
} from '../../serializers.js';

const REFLECTION_FETCH_LIMIT = 3650; // GetTimelineUseCaseと同じ理由（ADR 0009）

/**
 * Version9で指摘した「Exportサイズ無制限」の技術的負債への対応
 * （Version10指示書7章）。既定では1種別あたりこの件数までに制限し、
 * 全件が必要な場合は`all: true`を明示的に指定させる。
 */
const DEFAULT_EXPORT_LIMIT = 500;

export interface ExportLogsInput {
  /** 省略時は全種別をエクスポートする。 */
  type?: BridgeLogType;
  /** 1種別あたりの件数上限。省略時はDEFAULT_EXPORT_LIMIT。 */
  limit?: number;
  /** trueの場合、limitを無視して全件を返す（明示的なオプトイン）。 */
  all?: boolean;
  // 以下はExternalKnowledgeのExportにのみ適用される絞り込み（指示書7章）。
  status?: ExternalKnowledgeStatus;
  topic?: string;
  tag?: string;
  /** capturedAt >= since（YYYY-MM-DD） */
  since?: string;
  /** capturedAt <= until（YYYY-MM-DD） */
  until?: string;
  /** ExternalSourceのExportにのみ適用される絞り込み。 */
  sourceType?: ExternalSourceType;
}

export type ExportedLog = { type: BridgeLogType; data: unknown };

export interface ExportLogsOutput {
  logs: ExportedLog[];
  /** limitによって切り詰められた場合にtrue。 */
  truncated: boolean;
}

const ALL_BRIDGE_LOG_TYPES: BridgeLogType[] = [
  'Reflection',
  'Memory',
  'InventoryItem',
  'AppearanceLog',
  'SkinLog',
  'PurchaseLog',
  'ChallengeLog',
  'ThirdPersonEvaluation',
  'ExternalSource',
  'ExternalKnowledge',
];

/**
 * ExportLogsUseCase（Bridge Layer、Version9、Version10で件数上限と
 * External Brain専用フィルタを追加）
 *
 * 各Repositoryの`findAll()`（Reflectionのみ`findRecent`、ADR 0009と
 * 同じ理由）を呼び、プレーンなJSON互換オブジェクトとして返す。
 * TimelineEntryへの射影（要約・簡略化）とは異なり、各Logの全
 * フィールドをそのまま返す「完全な読み出し」を目的とする。
 * 判断・要約は行わない（ADR 0007/0008から継続する方針）。
 */
export class ExportLogsUseCase {
  constructor(
    private readonly reflectionRepository: ReflectionRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly appearanceLogRepository: AppearanceLogRepository,
    private readonly skinLogRepository: SkinLogRepository,
    private readonly purchaseLogRepository: PurchaseLogRepository,
    private readonly challengeLogRepository: ChallengeLogRepository,
    private readonly thirdPersonEvaluationRepository: ThirdPersonEvaluationRepository,
    private readonly externalSourceRepository: ExternalSourceRepository,
    private readonly externalKnowledgeRepository: ExternalKnowledgeRepository,
  ) {}

  async execute(input: ExportLogsInput = {}): Promise<ExportLogsOutput> {
    const types = input.type ? [input.type] : ALL_BRIDGE_LOG_TYPES;
    const limit = input.all ? undefined : (input.limit ?? DEFAULT_EXPORT_LIMIT);
    const logs: ExportedLog[] = [];
    let truncated = false;

    for (const type of types) {
      const data = await this.exportOne(type, input);
      const sliced = limit !== undefined ? data.slice(0, limit) : data;
      if (limit !== undefined && data.length > limit) truncated = true;
      logs.push(...sliced.map((d) => ({ type, data: d })));
    }

    return { logs, truncated };
  }

  private async exportOne(type: BridgeLogType, filters: ExportLogsInput): Promise<unknown[]> {
    switch (type) {
      case 'Reflection': {
        const items = await this.reflectionRepository.findRecent(REFLECTION_FETCH_LIMIT);
        return items.map(serializeReflection);
      }
      case 'Memory': {
        const items = await this.memoryRepository.findAll();
        return items.map(serializeMemoryEntry);
      }
      case 'InventoryItem': {
        const items = await this.inventoryRepository.findAll();
        return items.map(serializeInventoryItem);
      }
      case 'AppearanceLog': {
        const items = await this.appearanceLogRepository.findAll();
        return items.map(serializeAppearanceLog);
      }
      case 'SkinLog': {
        const items = await this.skinLogRepository.findAll();
        return items.map(serializeSkinLog);
      }
      case 'PurchaseLog': {
        const items = await this.purchaseLogRepository.findAll();
        return items.map(serializePurchaseLog);
      }
      case 'ChallengeLog': {
        const items = await this.challengeLogRepository.findAll();
        return items.map(serializeChallengeLog);
      }
      case 'ThirdPersonEvaluation': {
        const items = await this.thirdPersonEvaluationRepository.findAll();
        return items.map(serializeThirdPersonEvaluation);
      }
      case 'ExternalSource': {
        const items = await this.externalSourceRepository.findAll();
        const filtered = filters.sourceType
          ? items.filter((s) => s.record.sourceType === filters.sourceType)
          : items;
        return filtered.map(serializeExternalSource);
      }
      case 'ExternalKnowledge': {
        const items = await this.externalKnowledgeRepository.findAll();
        const filtered = this.filterKnowledge(items, filters);
        return filtered.map(serializeExternalKnowledge);
      }
      default: {
        const exhaustive: never = type;
        throw new Error(`unsupported export type: ${String(exhaustive)}`);
      }
    }
  }

  private filterKnowledge(
    items: ExternalKnowledge[],
    filters: ExportLogsInput,
  ): ExternalKnowledge[] {
    return items.filter((k) => {
      if (filters.status && k.status !== filters.status) return false;
      if (filters.topic && !k.record.topics.includes(filters.topic)) return false;
      if (filters.tag && !k.record.tags.includes(filters.tag)) return false;
      if (filters.since && k.capturedAt < filters.since) return false;
      if (filters.until && k.capturedAt > filters.until) return false;
      return true;
    });
  }
}
