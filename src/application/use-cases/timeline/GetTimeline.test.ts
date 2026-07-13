import { describe, it, expect, beforeEach } from 'vitest';
import { GetTimelineUseCase } from './GetTimeline.js';
import { AddAppearanceLogUseCase } from '../appearance/AddAppearanceLog.js';
import { AddSkinLogUseCase } from '../skin/AddSkinLog.js';
import { RecordPurchaseUseCase } from '../purchase/RecordPurchase.js';
import { AddChallengeLogUseCase } from '../challenge/AddChallengeLog.js';
import { RecordCaptureUseCase } from '../capture/RecordCapture.js';
import { RecordDailyReflectionUseCase } from '../reflection/RecordDailyReflection.js';

import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import type { AppearanceLogRepository } from '../../ports/AppearanceLogRepository.js';
import type { SkinLogRepository } from '../../ports/SkinLogRepository.js';
import type { PurchaseLogRepository } from '../../ports/PurchaseLogRepository.js';
import type { ChallengeLogRepository } from '../../ports/ChallengeLogRepository.js';
import type { CaptureRepository } from '../../ports/CaptureRepository.js';

import type { Reflection } from '../../../domain/entities/Reflection.js';
import type { AppearanceLog } from '../../../domain/entities/AppearanceLog.js';
import type { SkinLog } from '../../../domain/entities/SkinLog.js';
import type { PurchaseLog } from '../../../domain/entities/PurchaseLog.js';
import type { ChallengeLog } from '../../../domain/entities/ChallengeLog.js';
import type { Capture } from '../../../domain/entities/Capture.js';

class FakeReflectionRepository implements ReflectionRepository {
  store: Reflection[] = [];
  async save(r: Reflection): Promise<void> {
    this.store.push(r);
  }
  async findByDate(date: string): Promise<Reflection | null> {
    return this.store.find((r) => r.date === date) ?? null;
  }
  async findRecent(limit: number): Promise<Reflection[]> {
    return [...this.store].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
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

class FakeCaptureRepository implements CaptureRepository {
  store: Capture[] = [];
  async save(c: Capture): Promise<void> {
    this.store.push(c);
  }
  async findAll(): Promise<Capture[]> {
    return [...this.store];
  }
}

describe('GetTimeline', () => {
  let reflectionRepo: FakeReflectionRepository;
  let appearanceRepo: FakeAppearanceLogRepository;
  let skinRepo: FakeSkinLogRepository;
  let purchaseRepo: FakePurchaseLogRepository;
  let challengeRepo: FakeChallengeLogRepository;
  let captureRepo: FakeCaptureRepository;
  let useCase: GetTimelineUseCase;

  beforeEach(() => {
    reflectionRepo = new FakeReflectionRepository();
    appearanceRepo = new FakeAppearanceLogRepository();
    skinRepo = new FakeSkinLogRepository();
    purchaseRepo = new FakePurchaseLogRepository();
    challengeRepo = new FakeChallengeLogRepository();
    captureRepo = new FakeCaptureRepository();
    useCase = new GetTimelineUseCase(
      reflectionRepo,
      appearanceRepo,
      skinRepo,
      purchaseRepo,
      challengeRepo,
      captureRepo,
    );
  });

  it('merges entries from all sources sorted by date descending', async () => {
    await new RecordDailyReflectionUseCase(reflectionRepo).execute({
      date: '2026-07-01',
      record: { studyMinutes: 60 },
    });
    await new AddSkinLogUseCase(skinRepo).execute({
      record: { date: '2026-07-05', redness: 2 },
    });
    await new AddChallengeLogUseCase(challengeRepo).execute({
      record: { date: '2026-07-10', title: '赤福' },
    });

    const { entries } = await useCase.execute();

    expect(entries.map((e) => e.date)).toEqual(['2026-07-10', '2026-07-05', '2026-07-01']);
    expect(entries.map((e) => e.source)).toEqual(['ChallengeLog', 'SkinLog', 'Reflection']);
  });

  it('filters by source', async () => {
    await new AddSkinLogUseCase(skinRepo).execute({ record: { date: '2026-07-01', redness: 2 } });
    await new AddChallengeLogUseCase(challengeRepo).execute({
      record: { date: '2026-07-02', title: '赤福' },
    });

    const { entries } = await useCase.execute({ source: 'SkinLog' });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.source).toBe('SkinLog');
  });

  it('filters by since (inclusive)', async () => {
    await new AddChallengeLogUseCase(challengeRepo).execute({
      record: { date: '2026-06-30', title: '古い' },
    });
    await new AddChallengeLogUseCase(challengeRepo).execute({
      record: { date: '2026-07-01', title: '境界' },
    });
    await new AddChallengeLogUseCase(challengeRepo).execute({
      record: { date: '2026-07-02', title: '新しい' },
    });

    const { entries } = await useCase.execute({ since: '2026-07-01' });
    expect(entries.map((e) => e.title)).toEqual(['新しい', '境界']);
  });

  it('respects limit', async () => {
    for (let i = 1; i <= 5; i++) {
      await new AddChallengeLogUseCase(challengeRepo).execute({
        record: { date: `2026-07-0${i}`, title: `#${i}` },
      });
    }
    const { entries } = await useCase.execute({ limit: 2 });
    expect(entries).toHaveLength(2);
  });

  it('includes PurchaseLog and AppearanceLog and Capture entries', async () => {
    await new AddAppearanceLogUseCase(appearanceRepo).execute({
      record: { date: '2026-07-01', overallRating: 4 },
    });
    await new RecordPurchaseUseCase(purchaseRepo).execute({
      record: { productName: 'メラノCC', purchaseDate: '2026-07-02' },
    });
    const recordCapture = new RecordCaptureUseCase(
      captureRepo,
      skinRepo,
      purchaseRepo,
      challengeRepo,
      appearanceRepo,
    );
    await recordCapture.execute({
      text: '赤福を初めて食べた',
      capturedAt: '2026-07-03',
      destinations: [{ logType: 'ChallengeLog', fields: { title: '赤福' } }],
    });

    const { entries } = await useCase.execute();
    expect(entries.map((e) => e.source).sort()).toEqual(
      ['AppearanceLog', 'Capture', 'ChallengeLog', 'PurchaseLog'].sort(),
    );
  });
});
