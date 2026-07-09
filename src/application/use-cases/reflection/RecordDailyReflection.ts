import { randomUUID } from 'node:crypto';
import { Reflection, type ReflectionRecord } from '../../../domain/entities/Reflection.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';

export interface RecordDailyReflectionInput {
  date: string; // YYYY-MM-DD
  record: ReflectionRecord;
}

export interface RecordDailyReflectionOutput {
  reflection: Reflection;
  /**
   * 「継続性」に関する事実の提示のみ。ここでは判断しない
   * （Principle 1: 人間が最終意思決定者である／
   *  Principle 2: AIは判断材料を提供する）。
   */
  hasMinimumRoutine: boolean;
}

/**
 * RecordDailyReflectionUseCase
 *
 * Version1で実装する最初のユースケース。「今日の振り返りを記録する」
 * という最小単位の行為を、Domain層のルールに従って実行する。
 */
export class RecordDailyReflectionUseCase {
  constructor(private readonly reflectionRepository: ReflectionRepository) {}

  async execute(input: RecordDailyReflectionInput): Promise<RecordDailyReflectionOutput> {
    const existing = await this.reflectionRepository.findByDate(input.date);
    if (existing) {
      throw new Error(
        `Reflection for ${input.date} already exists. Use an update use case instead.`,
      );
    }

    const reflection = Reflection.create({
      id: randomUUID(),
      date: input.date,
      record: input.record,
    });

    await this.reflectionRepository.save(reflection);

    return {
      reflection,
      hasMinimumRoutine: reflection.hasMinimumRoutine(),
    };
  }
}
