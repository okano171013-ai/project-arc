import { randomUUID } from 'node:crypto';
import { Reflection, type ReflectionRecord } from '../../../domain/entities/Reflection.js';
import type { ReflectionRepository } from '../../ports/ReflectionRepository.js';
import { previousDate } from '../../../shared/date.js';

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
  /** 今日の点数（100点満点）。参考指標（Reflection.score()参照）。 */
  score: number;
  /** 前日の点数。前日の記録がなければundefined。 */
  previousScore: number | undefined;
  /**
   * 前日比（今日 - 前日）。あくまで自分自身との比較であり、
   * 他人との比較は行わない（Version3要件）。
   */
  scoreDelta: number | undefined;
}

/**
 * RecordDailyReflectionUseCase
 *
 * Version1で実装する最初のユースケース。「今日の振り返りを記録する」
 * という最小単位の行為を、Domain層のルールに従って実行する。
 * Version3で前日比較を追加した。
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
