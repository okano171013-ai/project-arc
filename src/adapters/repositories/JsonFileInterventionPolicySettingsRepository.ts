import {
  InterventionPolicySettings,
  type InterventionPolicySettingsRecord,
} from '../../domain/entities/InterventionPolicySettings.js';
import type { InterventionPolicySettingsRepository } from '../../application/ports/InterventionPolicySettingsRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface InterventionPolicySettingsFileRow {
  id: string;
  record: InterventionPolicySettingsRecord;
  createdAt: string;
}

/**
 * シングルトン設定の永続化。既存の`readJsonArray`/`writeJsonArray`を
 * そのまま使い、要素0または1件の配列として保存する——新しい低レベル
 * ヘルパーは追加しない（YAGNI）。
 */
export class JsonFileInterventionPolicySettingsRepository implements InterventionPolicySettingsRepository {
  constructor(private readonly filePath: string = 'data/intervention-policy-settings.json') {}

  async save(settings: InterventionPolicySettings): Promise<void> {
    const row: InterventionPolicySettingsFileRow = {
      id: settings.id,
      record: settings.record,
      createdAt: settings.createdAt.toISOString(),
    };
    await writeJsonArray(this.filePath, [row]);
  }

  async find(): Promise<InterventionPolicySettings | undefined> {
    const rows = await readJsonArray<InterventionPolicySettingsFileRow>(this.filePath);
    const row = rows[0];
    if (!row) return undefined;
    return InterventionPolicySettings.restore({
      id: row.id,
      record: row.record,
      createdAt: new Date(row.createdAt),
    });
  }
}
