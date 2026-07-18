import { describe, it, expect, beforeEach } from 'vitest';
import { RespondToInterventionUseCase } from './RespondToIntervention.js';
import { ListInterventionsUseCase } from './ListInterventions.js';
import { MeasureInterventionEffectivenessUseCase } from './MeasureInterventionEffectiveness.js';
import { Intervention } from '../../../domain/entities/Intervention.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';

class FakeInterventionRepository implements InterventionRepository {
  store: Intervention[] = [];
  async save(i: Intervention): Promise<void> {
    const idx = this.store.findIndex((x) => x.id === i.id);
    if (idx >= 0) this.store[idx] = i;
    else this.store.push(i);
  }
  async findById(id: string): Promise<Intervention | null> {
    return this.store.find((i) => i.id === id) ?? null;
  }
  async findAll(): Promise<Intervention[]> {
    return [...this.store];
  }
}

function buildIntervention(id: string, generatedAt: string): Intervention {
  return Intervention.create({
    id,
    record: { generatedAt, intensity: 'Warning', triggerRuleId: 'overdue-checkin', message: 'x' },
  });
}

describe('RespondToInterventionUseCase', () => {
  let repository: FakeInterventionRepository;
  let useCase: RespondToInterventionUseCase;

  beforeEach(() => {
    repository = new FakeInterventionRepository();
    useCase = new RespondToInterventionUseCase(repository);
  });

  it.each(['acknowledge', 'dismiss', 'snooze'] as const)('handles action %s (happy path)', async (action) => {
    await repository.save(buildIntervention('i-1', '2026-07-18T10:00:00Z'));
    const result = await useCase.execute({
      action,
      id: 'i-1',
      note: action === 'dismiss' ? '誤検知でした' : undefined,
      snoozeUntil: action === 'snooze' ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : undefined,
    });
    const expectedStatus = { acknowledge: 'Acknowledged', dismiss: 'Dismissed', snooze: 'Snoozed' }[action];
    expect(result.intervention.status).toBe(expectedStatus);
  });

  it('rejects dismiss without a note', async () => {
    await repository.save(buildIntervention('i-2', '2026-07-18T10:00:00Z'));
    await expect(useCase.execute({ action: 'dismiss', id: 'i-2' })).rejects.toThrow(
      "note is required for action 'dismiss'",
    );
  });

  it('rejects snooze without snoozeUntil', async () => {
    await repository.save(buildIntervention('i-3', '2026-07-18T10:00:00Z'));
    await expect(useCase.execute({ action: 'snooze', id: 'i-3' })).rejects.toThrow(
      "snoozeUntil is required for action 'snooze'",
    );
  });

  it('rejects an unknown id', async () => {
    await expect(useCase.execute({ action: 'acknowledge', id: 'missing' })).rejects.toThrow(
      'Intervention not found: missing',
    );
  });
});

describe('ListInterventionsUseCase', () => {
  it('filters by status and sorts by generatedAt descending', async () => {
    const repository = new FakeInterventionRepository();
    const a = buildIntervention('i-a', '2026-07-17T10:00:00Z');
    const b = buildIntervention('i-b', '2026-07-18T10:00:00Z');
    b.dismiss('誤検知');
    await repository.save(a);
    await repository.save(b);

    const useCase = new ListInterventionsUseCase(repository);
    const result = await useCase.execute({ limit: 10, status: 'Dismissed' });
    expect(result.interventions).toHaveLength(1);
    expect(result.interventions[0]?.id).toBe('i-b');
  });

  it('rejects a limit above the max', async () => {
    const useCase = new ListInterventionsUseCase(new FakeInterventionRepository());
    await expect(useCase.execute({ limit: 101 })).rejects.toThrow('limit must not exceed 100');
  });
});

describe('MeasureInterventionEffectivenessUseCase', () => {
  it('computes rates and average resume time from synthetic data', async () => {
    const repository = new FakeInterventionRepository();

    const acknowledged1 = buildIntervention('m-1', '2026-07-18T10:00:00Z');
    acknowledged1.acknowledge('2026-07-18T10:10:00Z');
    const acknowledged2 = buildIntervention('m-2', '2026-07-18T11:00:00Z');
    acknowledged2.acknowledge('2026-07-18T11:20:00Z');
    const dismissed = buildIntervention('m-3', '2026-07-18T12:00:00Z');
    dismissed.dismiss('誤検知');
    const snoozed = buildIntervention('m-4', '2026-07-18T13:00:00Z');
    snoozed.snooze(new Date(Date.now() + 60 * 60 * 1000).toISOString());
    const outOfRange = buildIntervention('m-5', '2026-06-01T00:00:00Z');

    await repository.save(acknowledged1);
    await repository.save(acknowledged2);
    await repository.save(dismissed);
    await repository.save(snoozed);
    await repository.save(outOfRange);

    const useCase = new MeasureInterventionEffectivenessUseCase(repository);
    const result = await useCase.execute({ from: '2026-07-18T00:00:00Z', to: '2026-07-18T23:59:59Z' });

    expect(result.totalGenerated).toBe(4);
    expect(result.acknowledgedCount).toBe(2);
    expect(result.dismissedCount).toBe(1);
    expect(result.snoozedCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(result.dismissRate).toBe(0.25);
    expect(result.snoozeRate).toBe(0.25);
    expect(result.avgResumeMinutes).toBe(15); // (10 + 20) / 2
  });

  it('returns undefined rates when there is no data in range (0件で割らない)', async () => {
    const useCase = new MeasureInterventionEffectivenessUseCase(new FakeInterventionRepository());
    const result = await useCase.execute({ from: '2026-07-18T00:00:00Z', to: '2026-07-18T23:59:59Z' });
    expect(result.totalGenerated).toBe(0);
    expect(result.dismissRate).toBeUndefined();
    expect(result.snoozeRate).toBeUndefined();
    expect(result.avgResumeMinutes).toBeUndefined();
  });
});
