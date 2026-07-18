import {
  InterventionPolicySettings,
  type InterventionPolicySettingsRecord,
} from '../../../domain/entities/InterventionPolicySettings.js';
import type { InterventionPolicySettingsRepository } from '../../ports/InterventionPolicySettingsRepository.js';

/** シングルトンなので固定id。 */
const SINGLETON_ID = 'intervention-policy-settings';

export interface UpdateInterventionPolicySettingsInput {
  record: InterventionPolicySettingsRecord;
}

export interface UpdateInterventionPolicySettingsOutput {
  settings: InterventionPolicySettings;
}

/**
 * UpdateInterventionPolicySettingsUseCase（Version26、行動介入レイヤー）
 *
 * 全項目置換（部分更新はしない）——`AgentDelegationGrant.create()`が
 * record全体を要求するのと同じ理由で、部分更新の曖昧さを避ける
 * （YAGNI）。呼び出し元は常にLevel2・自動承認対象外
 * （`ClassifyApprovalLevelUseCase`・`WriteProposalGatewayUseCase`参照）。
 */
export class UpdateInterventionPolicySettingsUseCase {
  constructor(private readonly repository: InterventionPolicySettingsRepository) {}

  async execute(input: UpdateInterventionPolicySettingsInput): Promise<UpdateInterventionPolicySettingsOutput> {
    const settings = InterventionPolicySettings.create({ id: SINGLETON_ID, record: input.record });
    await this.repository.save(settings);
    return { settings };
  }
}
