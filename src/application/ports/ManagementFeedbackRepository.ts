import type { ManagementFeedback } from '../../domain/entities/ManagementFeedback.js';

/**
 * ManagementFeedbackRepository（ポート）
 *
 * `delete`は持たない——フィードバックは`resolution`を遷移させるのみで
 * 削除しない（Owner指示、Version14）。
 */
export interface ManagementFeedbackRepository {
  /** create/updateとも同一（idの有無で内部的にupsertする実装を想定）。 */
  save(feedback: ManagementFeedback): Promise<void>;
  findById(id: string): Promise<ManagementFeedback | null>;
  findAll(): Promise<ManagementFeedback[]>;
}
