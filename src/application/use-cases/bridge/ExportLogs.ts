import type { BridgeLogType } from './BridgeLogType.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { MemoryRepository } from '../../ports/MemoryRepository.js';
import type { InventoryRepository } from '../../ports/InventoryRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';

import {
  serializeReflection,
  serializeMemoryEntry,
  serializeInventoryItem,
  serializeAppearanceLog,
  serializeSkinLog,
  serializePurchaseLog,
  serializeChallengeLog,
  serializeThirdPersonEvaluation,
} from '../../serializers.js';

const REFLECTION_FETCH_LIMIT = 3650; // GetTimelineUseCaseと同じ理由（ADR 0009）

export interface ExportLogsInput {
  /** 省略時は全種別をエクスポートする。 */
  type?: BridgeLogType;
}

export type ExportedLog = { type: BridgeLogType; data: unknown };

export interface ExportLogsOutput {
  logs: ExportedLog[];
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
];

/**
 * ExportLogsUseCase（Bridge Layer、Version9）
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
  ) {}

  async execute(input: ExportLogsInput = {}): Promise<ExportLogsOutput> {
    const types = input.type ? [input.type] : ALL_BRIDGE_LOG_TYPES;
    const logs: ExportedLog[] = [];

    for (const type of types) {
      const data = await this.exportOne(type);
      logs.push(...data.map((d) => ({ type, data: d })));
    }

    return { logs };
  }

  private async exportOne(type: BridgeLogType): Promise<unknown[]> {
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
      default: {
        const exhaustive: never = type;
        throw new Error(`unsupported export type: ${String(exhaustive)}`);
      }
    }
  }
}
