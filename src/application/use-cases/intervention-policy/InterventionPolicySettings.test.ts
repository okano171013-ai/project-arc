import { describe, it, expect } from 'vitest';
import { GetInterventionPolicySettingsUseCase } from './GetInterventionPolicySettings.js';
import { UpdateInterventionPolicySettingsUseCase } from './UpdateInterventionPolicySettings.js';
import {
  InterventionPolicySettings,
  DEFAULT_INTERVENTION_POLICY_SETTINGS,
} from '../../../domain/entities/InterventionPolicySettings.js';
import type { InterventionPolicySettingsRepository } from '../../ports/InterventionPolicySettingsRepository.js';

class FakeInterventionPolicySettingsRepository implements InterventionPolicySettingsRepository {
  settings: InterventionPolicySettings | undefined;
  async save(s: InterventionPolicySettings): Promise<void> {
    this.settings = s;
  }
  async find(): Promise<InterventionPolicySettings | undefined> {
    return this.settings;
  }
}

describe('GetInterventionPolicySettingsUseCase', () => {
  it('falls back to DEFAULT when nothing is saved (未設定時はDEFAULT)', async () => {
    const useCase = new GetInterventionPolicySettingsUseCase(new FakeInterventionPolicySettingsRepository());
    const result = await useCase.execute();
    expect(result.isDefault).toBe(true);
    expect(result.record).toEqual(DEFAULT_INTERVENTION_POLICY_SETTINGS);
  });

  it('returns the saved record when present', async () => {
    const repository = new FakeInterventionPolicySettingsRepository();
    await repository.save(
      InterventionPolicySettings.create({
        id: 'x',
        record: { ...DEFAULT_INTERVENTION_POLICY_SETTINGS, dailyNotificationLimit: 3 },
      }),
    );
    const useCase = new GetInterventionPolicySettingsUseCase(repository);
    const result = await useCase.execute();
    expect(result.isDefault).toBe(false);
    expect(result.record.dailyNotificationLimit).toBe(3);
  });
});

describe('UpdateInterventionPolicySettingsUseCase', () => {
  it('replaces the singleton record wholesale', async () => {
    const repository = new FakeInterventionPolicySettingsRepository();
    const useCase = new UpdateInterventionPolicySettingsUseCase(repository);
    await useCase.execute({ record: { ...DEFAULT_INTERVENTION_POLICY_SETTINGS, dailyNotificationLimit: 2 } });
    const saved = await repository.find();
    expect(saved?.record.dailyNotificationLimit).toBe(2);
  });

  it('validates the record via the entity (不正値の拒否)', async () => {
    const useCase = new UpdateInterventionPolicySettingsUseCase(new FakeInterventionPolicySettingsRepository());
    await expect(
      useCase.execute({ record: { ...DEFAULT_INTERVENTION_POLICY_SETTINGS, dailyNotificationLimit: 0 } }),
    ).rejects.toThrow('dailyNotificationLimit must be a positive integer');
  });
});
