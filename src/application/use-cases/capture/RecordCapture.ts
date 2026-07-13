import { randomUUID } from 'node:crypto';
import { Capture, type AppliedDestination, type CaptureLogType } from '../../../domain/entities/Capture.js';
import type { CaptureRepository } from '../../ports/CaptureRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import { AddSkinLogUseCase } from '../skin/AddSkinLog.js';
import { RecordPurchaseUseCase } from '../purchase/RecordPurchase.js';
import { AddChallengeLogUseCase } from '../challenge/AddChallengeLog.js';
import { AddAppearanceLogUseCase } from '../appearance/AddAppearanceLog.js';

export interface RecordCaptureDestination {
  logType: CaptureLogType;
  fields: Record<string, unknown>;
}

export interface RecordCaptureInput {
  text?: string;
  photoPath?: string;
  capturedAt: string;
  suggestions?: import('../../../domain/entities/Capture.js').CaptureSuggestion[];
  /** Owner/ARCがすでに確定した振り分け先のみを渡す。このUseCaseは分類しない（ADR 0007）。 */
  destinations: RecordCaptureDestination[];
}

export interface RecordCaptureOutput {
  capture: Capture;
  applied: AppliedDestination[];
}

function requireString(fields: Record<string, unknown>, key: string, logType: string): string {
  const value = fields[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${logType} requires a non-empty "${key}" field`);
  }
  return value;
}

function requireNumber(fields: Record<string, unknown>, key: string, logType: string): number {
  const value = fields[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${logType} requires a numeric "${key}" field`);
  }
  return value;
}

function optionalString(fields: Record<string, unknown>, key: string): string | undefined {
  const value = fields[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function optionalNumber(fields: Record<string, unknown>, key: string): number | undefined {
  const value = fields[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Owner/ARCがすでに確定した振り分け先（destinations）を、既存の
 * UseCase（AddSkinLogUseCase等）へそのまま委譲して忠実に書き込む。
 * このUseCase自身はどのLogへ書くべきかを判断しない（ADR 0007）。
 * 各Logの必須項目が欠けている場合は、値を捏造せずエラーにする
 * （Principle 5）。
 */
export class RecordCaptureUseCase {
  constructor(
    private readonly captureRepository: CaptureRepository,
    private readonly skinLogRepository: SkinLogRepository,
    private readonly purchaseLogRepository: PurchaseLogRepository,
    private readonly challengeLogRepository: ChallengeLogRepository,
    private readonly appearanceLogRepository: AppearanceLogRepository,
  ) {}

  async execute(input: RecordCaptureInput): Promise<RecordCaptureOutput> {
    const applied: AppliedDestination[] = [];

    for (const destination of input.destinations) {
      const recordId = await this.applyDestination(destination, input.capturedAt);
      applied.push({ logType: destination.logType, recordId });
    }

    const capture = Capture.create({
      id: randomUUID(),
      record: {
        text: input.text,
        photoPath: input.photoPath,
        capturedAt: input.capturedAt,
        suggestions: input.suggestions ?? [],
        appliedDestinations: applied,
      },
    });
    await this.captureRepository.save(capture);

    return { capture, applied };
  }

  private async applyDestination(
    destination: RecordCaptureDestination,
    capturedAt: string,
  ): Promise<string> {
    const { logType, fields } = destination;

    switch (logType) {
      case 'SkinLog': {
        const useCase = new AddSkinLogUseCase(this.skinLogRepository);
        const { log } = await useCase.execute({
          record: {
            date: optionalString(fields, 'date') ?? capturedAt,
            redness: optionalNumber(fields, 'redness'),
            pores: optionalNumber(fields, 'pores'),
            acne: optionalNumber(fields, 'acne'),
            acneScars: optionalNumber(fields, 'acneScars'),
            sebum: optionalNumber(fields, 'sebum'),
            currentSkincare: optionalString(fields, 'currentSkincare'),
            note: optionalString(fields, 'note'),
            photoPath: optionalString(fields, 'photoPath'),
          },
        });
        return log.id;
      }
      case 'PurchaseLog': {
        const useCase = new RecordPurchaseUseCase(this.purchaseLogRepository);
        const { purchase } = await useCase.execute({
          record: {
            productName: requireString(fields, 'productName', 'PurchaseLog'),
            category: optionalString(fields, 'category'),
            purchaseDate: optionalString(fields, 'purchaseDate') ?? capturedAt,
            price: optionalNumber(fields, 'price'),
            note: optionalString(fields, 'note'),
          },
        });
        return purchase.id;
      }
      case 'ChallengeLog': {
        const useCase = new AddChallengeLogUseCase(this.challengeLogRepository);
        const { log } = await useCase.execute({
          record: {
            date: optionalString(fields, 'date') ?? capturedAt,
            title: requireString(fields, 'title', 'ChallengeLog'),
            category: optionalString(fields, 'category'),
            note: optionalString(fields, 'note'),
          },
        });
        return log.id;
      }
      case 'AppearanceLog': {
        const useCase = new AddAppearanceLogUseCase(this.appearanceLogRepository);
        const { log } = await useCase.execute({
          record: {
            date: optionalString(fields, 'date') ?? capturedAt,
            overallRating: requireNumber(fields, 'overallRating', 'AppearanceLog'),
            skin: optionalString(fields, 'skin'),
            hair: optionalString(fields, 'hair'),
            beard: optionalString(fields, 'beard'),
            outfit: optionalString(fields, 'outfit'),
            physique: optionalString(fields, 'physique'),
            comment: optionalString(fields, 'comment'),
            improvementSuggestions: optionalString(fields, 'improvementSuggestions'),
            photoPath: optionalString(fields, 'photoPath'),
          },
        });
        return log.id;
      }
      default: {
        const exhaustive: never = logType;
        throw new Error(`unsupported capture destination: ${String(exhaustive)}`);
      }
    }
  }
}
