import {
  DEFAULT_INTERVENTION_POLICY_SETTINGS,
  type InterventionPolicySettingsRecord,
} from '../../../domain/entities/InterventionPolicySettings.js';
import type { InterventionPolicySettingsRepository } from '../../ports/InterventionPolicySettingsRepository.js';

export interface GetInterventionPolicySettingsOutput {
  record: InterventionPolicySettingsRecord;
  /** Ownerが一度も設定を保存していない場合true（DEFAULT_INTERVENTION_POLICY_SETTINGSを返している）。 */
  isDefault: boolean;
}

export class GetInterventionPolicySettingsUseCase {
  constructor(private readonly repository: InterventionPolicySettingsRepository) {}

  async execute(): Promise<GetInterventionPolicySettingsOutput> {
    const saved = await this.repository.find();
    if (!saved) {
      return { record: DEFAULT_INTERVENTION_POLICY_SETTINGS, isDefault: true };
    }
    return { record: saved.record, isDefault: false };
  }
}
