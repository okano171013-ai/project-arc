import { Reflection, type ReflectionRecord } from '../../../domain/entities/Reflection.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import { previousDate } from '../../../shared/date.js';

export interface UpdateDailyReflectionInput {
  date: string; // YYYY-MM-DD
  record: ReflectionRecord;
}

export interface UpdateDailyReflectionOutput {
  reflection: Reflection;
  hasMinimumRoutine: boolean;
  score: number;
  previousScore: number | undefined;
  scoreDelta: number | undefined;
}

/**
 * UpdateDailyReflectionUseCase
 *
 * その日の記録をすでに行っている場合に上書きするためのユースケース。
 * RecordDailyReflectionUseCaseが「既に存在する場合はこちらを使う」と
 * 案内している先。IDと作成日時は元の記録を引き継ぎ、内容のみ
 * 差し替える。
 */
export class UpdateDailyReflectionUseCase {
  constructor(private readonly reflectionRepository: ReflectionRepository) {}

  async execute(input: UpdateDailyReflectionInput): Promise<UpdateDailyReflectionOutput> {
    const existing = await this.reflectionRepository.findByDate(input.date);
    if (!existing) {
      throw new Error(
        `Reflection for ${input.date} does not exist yet. Use RecordDailyReflectionUseCase instead.`,
      );
    }

    const reflection = Reflection.create({
      id: existing.id,
      date: input.date,
      record: input.record,
      createdAt: existing.createdAt,
    });

    await this.reflectionRepository.save(reflection);

    const score = reflection.score();
    const yesterdayReflection = await this.reflectionRepository.findByDate(
      previousDate(input.date),
    );
    const previousScore = yesterdayReflection?.score();

    return {
      reflection,
      hasMinimumRoutine: reflection.hasMinimumRoutine(),
      score,
      previousScore,
      scoreDelta: previousScore !== undefined ? score - previousScore : undefined,
    };
  }
}
