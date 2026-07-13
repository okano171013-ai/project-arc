import { describe, it, expect, beforeEach } from 'vitest';
import { SuggestCaptureDestinationsUseCase } from './SuggestCaptureDestinations.js';
import { RecordCaptureUseCase } from './RecordCapture.js';
import type { CaptureClassifier } from '../../ports/CaptureClassifier.js';
import type { CaptureRepository } from '../../ports/CaptureRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { ThirdPersonEvaluationRepository } from '../../ports/ThirdPersonEvaluationRepository.js';
import type { Capture, CaptureSuggestion } from '../../../domain/entities/Capture.js';
import type { SkinLog } from '../../../domain/entities/SkinLog.js';
import type { PurchaseLog } from '../../../domain/entities/PurchaseLog.js';
import type { ChallengeLog } from '../../../domain/entities/ChallengeLog.js';
import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';
import type { ThirdPersonEvaluation } from '../../../domain/entities/ThirdPersonEvaluation.js';

class FakeCaptureClassifier implements CaptureClassifier {
  constructor(private readonly fixed: CaptureSuggestion[]) {}
  async suggest(): Promise<CaptureSuggestion[]> {
    return this.fixed;
  }
}

class FakeCaptureRepository implements CaptureRepository {
  store: Capture[] = [];
  async save(capture: Capture): Promise<void> {
    this.store.push(capture);
  }
  async findAll(): Promise<Capture[]> {
    return [...this.store];
  }
}

class FakeSkinLogRepository implements SkinLogRepository {
  store: SkinLog[] = [];
  async save(log: SkinLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<SkinLog[]> {
    return [...this.store];
  }
}

class FakePurchaseLogRepository implements PurchaseLogRepository {
  store = new Map<string, PurchaseLog>();
  async save(log: PurchaseLog): Promise<void> {
    this.store.set(log.id, log);
  }
  async findAll(): Promise<PurchaseLog[]> {
    return [...this.store.values()];
  }
  async findById(id: string): Promise<PurchaseLog | null> {
    return this.store.get(id) ?? null;
  }
}

class FakeChallengeLogRepository implements ChallengeLogRepository {
  store: ChallengeLog[] = [];
  async save(log: ChallengeLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<ChallengeLog[]> {
    return [...this.store];
  }
}

class FakeAppearanceLogRepository implements AppearanceLogRepository {
  store: AppearanceLog[] = [];
  async save(log: AppearanceLog): Promise<void> {
    this.store.push(log);
  }
  async findAll(): Promise<AppearanceLog[]> {
    return [...this.store];
  }
}

class FakeThirdPersonEvaluationRepository implements ThirdPersonEvaluationRepository {
  store: ThirdPersonEvaluation[] = [];
  async save(e: ThirdPersonEvaluation): Promise<void> {
    this.store.push(e);
  }
  async findAll(): Promise<ThirdPersonEvaluation[]> {
    return [...this.store];
  }
}

describe('SuggestCaptureDestinations', () => {
  it('classifierの提案をそのまま返す（自身では判断しない）', async () => {
    const suggestion: CaptureSuggestion = {
      logType: 'ChallengeLog',
      reason: '「初めて」というキーワードを検出',
      fields: { title: '赤福を初めて食べた' },
    };
    const useCase = new SuggestCaptureDestinationsUseCase(
      new FakeCaptureClassifier([suggestion]),
    );
    const result = await useCase.execute({ text: '赤福を初めて食べた' });
    expect(result.suggestions).toEqual([suggestion]);
  });
});

describe('RecordCapture', () => {
  let captureRepo: FakeCaptureRepository;
  let skinRepo: FakeSkinLogRepository;
  let purchaseRepo: FakePurchaseLogRepository;
  let challengeRepo: FakeChallengeLogRepository;
  let appearanceRepo: FakeAppearanceLogRepository;
  let evaluationRepo: FakeThirdPersonEvaluationRepository;
  let useCase: RecordCaptureUseCase;

  beforeEach(() => {
    captureRepo = new FakeCaptureRepository();
    skinRepo = new FakeSkinLogRepository();
    purchaseRepo = new FakePurchaseLogRepository();
    challengeRepo = new FakeChallengeLogRepository();
    appearanceRepo = new FakeAppearanceLogRepository();
    evaluationRepo = new FakeThirdPersonEvaluationRepository();
    useCase = new RecordCaptureUseCase(
      captureRepo,
      skinRepo,
      purchaseRepo,
      challengeRepo,
      appearanceRepo,
      evaluationRepo,
    );
  });

  it('確定済みのdestinationsを対応するLogへ書き込む', async () => {
    const result = await useCase.execute({
      text: '赤福を初めて食べた',
      capturedAt: '2026-07-13',
      destinations: [{ logType: 'ChallengeLog', fields: { title: '赤福' } }],
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]?.logType).toBe('ChallengeLog');
    expect(challengeRepo.store).toHaveLength(1);
    expect(challengeRepo.store[0]?.title).toBe('赤福');
  });

  it('複数destinationsを一度に処理し、Captureに監査記録を残す', async () => {
    const result = await useCase.execute({
      text: 'メラノCC買った',
      capturedAt: '2026-07-13',
      destinations: [
        { logType: 'PurchaseLog', fields: { productName: 'メラノCC' } },
        { logType: 'ChallengeLog', fields: { title: 'メラノCC' } },
      ],
    });

    expect(result.applied).toHaveLength(2);
    expect(captureRepo.store).toHaveLength(1);
    expect(captureRepo.store[0]?.record.appliedDestinations).toHaveLength(2);
  });

  it('必須項目が欠けている場合は捏造せずエラーにする（AppearanceLogのoverallRating）', async () => {
    await expect(
      useCase.execute({
        text: 'いとこにガタイ良くなったと言われた',
        capturedAt: '2026-07-13',
        destinations: [{ logType: 'AppearanceLog', fields: { comment: 'ガタイ良くなったと言われた' } }],
      }),
    ).rejects.toThrow(/overallRating/);
  });

  it('ThirdPersonEvaluationへ書き込む（personは必須、テキストから断定しない）', async () => {
    const result = await useCase.execute({
      text: 'いとこにガタイ良くなったと言われた',
      capturedAt: '2026-07-13',
      destinations: [
        {
          logType: 'ThirdPersonEvaluation',
          fields: { evaluation: 'いとこにガタイ良くなったと言われた', person: 'いとこ' },
        },
      ],
    });
    expect(result.applied[0]?.logType).toBe('ThirdPersonEvaluation');
  });

  it('ThirdPersonEvaluationはpersonが欠けていると捏造せずエラーにする', async () => {
    await expect(
      useCase.execute({
        text: 'ガタイ良くなったと言われた',
        capturedAt: '2026-07-13',
        destinations: [
          { logType: 'ThirdPersonEvaluation', fields: { evaluation: 'ガタイ良くなった' } },
        ],
      }),
    ).rejects.toThrow(/person/);
  });

  it('必須項目が欠けている場合は捏造せずエラーにする（PurchaseLogのproductName）', async () => {
    await expect(
      useCase.execute({
        capturedAt: '2026-07-13',
        destinations: [{ logType: 'PurchaseLog', fields: {} }],
      }),
    ).rejects.toThrow(/productName/);
  });
});
