import type { BridgeLogType } from '../../../domain/value-objects/BridgeLogType.js';
import { RecordDailyReflectionUseCase } from '../reflection/RecordDailyReflection.js';
import { AddMemoryEntryUseCase } from '../memory/AddMemoryEntry.js';
import { AddInventoryItemUseCase } from '../inventory/AddInventoryItem.js';
import { AddAppearanceLogUseCase } from '../appearance/AddAppearanceLog.js';
import { AddSkinLogUseCase } from '../skin/AddSkinLog.js';
import { RecordPurchaseUseCase } from '../purchase/RecordPurchase.js';
import { AddChallengeLogUseCase } from '../challenge/AddChallengeLog.js';
import { AddThirdPersonEvaluationUseCase } from '../evaluation/AddThirdPersonEvaluation.js';
import { AddExternalSourceUseCase } from '../external-source/AddExternalSource.js';
import { AddExternalKnowledgeUseCase } from '../external-knowledge/AddExternalKnowledge.js';
import { AddMealLogUseCase } from '../meal/AddMealLog.js';
import { AddNutritionLogUseCase } from '../nutrition/AddNutritionLog.js';
import { AddWeightLogUseCase } from '../weight/AddWeightLog.js';
import { AddFinanceLogUseCase } from '../finance/AddFinanceLog.js';
import { RecordStudySessionUseCase } from '../study-session/RecordStudySession.js';

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
import type { MealLogRepository } from '../../ports/MealLogRepository.js';
import type { NutritionLogRepository } from '../../ports/NutritionLogRepository.js';
import type { WeightLogRepository } from '../../ports/WeightLogRepository.js';
import type { FinanceLogRepository } from '../../ports/FinanceLogRepository.js';
import type { StudySessionRepository } from '../../ports/StudySessionRepository.js';

export interface ImportLogEntry {
  type: BridgeLogType;
  /** 対応する既存UseCase（AddSkinLogUseCase等）のInputとして、そのまま渡される。 */
  data: Record<string, unknown>;
}

export interface ImportLogsInput {
  logs: ImportLogEntry[];
}

export interface ImportLogResult {
  type: BridgeLogType;
  ok: boolean;
  id?: string;
  error?: string;
}

export interface ImportLogsOutput {
  results: ImportLogResult[];
  successCount: number;
  failureCount: number;
}

/**
 * ImportLogsUseCase（Bridge Layer、Version9）
 *
 * `{ type, data }`の配列を受け取り、`type`ごとに既存のAdd系・Record系
 * UseCaseへ`data`をそのまま委譲する。新しい書き込みロジックは
 * 追加しない——単に「どのUseCaseを呼ぶか」を`type`で振り分けるだけの
 * 薄いディスパッチャである。各項目は独立して処理し、1件の失敗が
 * 他の項目に影響しない（部分成功を許容する、ADR 0010）。
 *
 * このUseCase自身はどのLogへ書くべきかを判断しない——`type`は
 * 呼び出し側（Owner/ARC）が確定済みの値として渡す（ADR 0007/0008
 * から継続する方針）。
 *
 * Version10でExternalSource/ExternalKnowledgeを追加。同一バッチ内で
 * 新規ExternalSourceを作成し、同じバッチ内のExternalKnowledgeから
 * その新規sourceIdを参照することはサポートしない（IDは登録完了時に
 * 生成されるため、バッチ内での前方参照は解決できない）。Sourceを
 * 先にImportし、返却されたidを使って改めてKnowledgeをImportする
 * 2段階の運用とする（ADR 0016）。
 */
export class ImportLogsUseCase {
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
    private readonly mealLogRepository: MealLogRepository,
    private readonly nutritionLogRepository: NutritionLogRepository,
    private readonly weightLogRepository: WeightLogRepository,
    private readonly financeLogRepository: FinanceLogRepository,
    private readonly studySessionRepository: StudySessionRepository,
  ) {}

  async execute(input: ImportLogsInput): Promise<ImportLogsOutput> {
    const results: ImportLogResult[] = [];

    for (const entry of input.logs) {
      try {
        const id = await this.importOne(entry);
        results.push({ type: entry.type, ok: true, id });
      } catch (error) {
        results.push({
          type: entry.type,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.ok).length;
    return { results, successCount, failureCount: results.length - successCount };
  }

  private async importOne(entry: ImportLogEntry): Promise<string> {
    switch (entry.type) {
      case 'Reflection': {
        const useCase = new RecordDailyReflectionUseCase(this.reflectionRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.reflection.id;
      }
      case 'Memory': {
        const useCase = new AddMemoryEntryUseCase(this.memoryRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.entry.id;
      }
      case 'InventoryItem': {
        const useCase = new AddInventoryItemUseCase(this.inventoryRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.item.id;
      }
      case 'AppearanceLog': {
        const useCase = new AddAppearanceLogUseCase(this.appearanceLogRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.log.id;
      }
      case 'SkinLog': {
        const useCase = new AddSkinLogUseCase(this.skinLogRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.log.id;
      }
      case 'PurchaseLog': {
        const useCase = new RecordPurchaseUseCase(this.purchaseLogRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.purchase.id;
      }
      case 'ChallengeLog': {
        const useCase = new AddChallengeLogUseCase(this.challengeLogRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.log.id;
      }
      case 'ThirdPersonEvaluation': {
        const useCase = new AddThirdPersonEvaluationUseCase(this.thirdPersonEvaluationRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.evaluation.id;
      }
      case 'ExternalSource': {
        const useCase = new AddExternalSourceUseCase(this.externalSourceRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.source.id;
      }
      case 'ExternalKnowledge': {
        const useCase = new AddExternalKnowledgeUseCase(
          this.externalKnowledgeRepository,
          this.externalSourceRepository,
        );
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.knowledge.id;
      }
      case 'MealLog': {
        const useCase = new AddMealLogUseCase(this.mealLogRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.log.id;
      }
      case 'NutritionLog': {
        const useCase = new AddNutritionLogUseCase(this.nutritionLogRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.log.id;
      }
      case 'WeightLog': {
        const useCase = new AddWeightLogUseCase(this.weightLogRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.log.id;
      }
      case 'FinanceLog': {
        const useCase = new AddFinanceLogUseCase(this.financeLogRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.log.id;
      }
      case 'StudySession': {
        const useCase = new RecordStudySessionUseCase(this.studySessionRepository);
        const result = await useCase.execute(
          entry.data as unknown as Parameters<typeof useCase.execute>[0],
        );
        return result.session.id;
      }
      default: {
        const exhaustive: never = entry.type;
        throw new Error(`unsupported import type: ${String(exhaustive)}`);
      }
    }
  }
}
