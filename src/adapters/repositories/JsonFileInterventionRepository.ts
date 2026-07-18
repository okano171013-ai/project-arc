import {
  Intervention,
  type InterventionRecord,
  type InterventionStatus,
} from '../../domain/entities/Intervention.js';
import type { InterventionRepository } from '../../application/ports/InterventionRepository.js';
import { readJsonArray, writeJsonArray } from '../../infrastructure/db/jsonStore.js';

interface InterventionFileRow {
  id: string;
  record: InterventionRecord;
  createdAt: string;
  status: InterventionStatus;
  respondedAt?: string;
  responseNote?: string;
  snoozedUntil?: string;
  resumedActivityAt?: string;
}

export class JsonFileInterventionRepository implements InterventionRepository {
  constructor(private readonly filePath: string = 'data/interventions.json') {}

  async save(intervention: Intervention): Promise<void> {
    const rows = await readJsonArray<InterventionFileRow>(this.filePath);
    const withoutExisting = rows.filter((row) => row.id !== intervention.id);
    withoutExisting.push({
      id: intervention.id,
      record: intervention.record,
      createdAt: intervention.createdAt.toISOString(),
      status: intervention.status,
      respondedAt: intervention.respondedAt?.toISOString(),
      responseNote: intervention.responseNote,
      snoozedUntil: intervention.snoozedUntil,
      resumedActivityAt: intervention.resumedActivityAt,
    });
    await writeJsonArray(this.filePath, withoutExisting);
  }

  async findById(id: string): Promise<Intervention | null> {
    const all = await this.findAll();
    return all.find((i) => i.id === id) ?? null;
  }

  async findAll(): Promise<Intervention[]> {
    const rows = await readJsonArray<InterventionFileRow>(this.filePath);
    return rows.map((row) =>
      Intervention.restore({
        id: row.id,
        record: row.record,
        createdAt: new Date(row.createdAt),
        status: row.status,
        respondedAt: row.respondedAt ? new Date(row.respondedAt) : undefined,
        responseNote: row.responseNote,
        snoozedUntil: row.snoozedUntil,
        resumedActivityAt: row.resumedActivityAt,
      }),
    );
  }
}
