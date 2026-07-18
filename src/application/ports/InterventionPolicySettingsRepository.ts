import type { InterventionPolicySettings } from '../../domain/entities/InterventionPolicySettings.js';

/** シングルトン設定。`find()`は未設定なら`undefined`を返す——DEFAULTへの
 * フォールバックはUseCase側の責務とする。 */
export interface InterventionPolicySettingsRepository {
  save(settings: InterventionPolicySettings): Promise<void>;
  find(): Promise<InterventionPolicySettings | undefined>;
}
