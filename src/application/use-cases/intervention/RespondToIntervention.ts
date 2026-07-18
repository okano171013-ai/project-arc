import { Intervention } from '../../../domain/entities/Intervention.js';
import type { InterventionRepository } from '../../ports/InterventionRepository.js';

export type RespondToInterventionAction = 'acknowledge' | 'dismiss' | 'snooze';

export interface RespondToInterventionInput {
  action: RespondToInterventionAction;
  id: string;
  /** action: 'dismiss'のみ必須。 */
  note?: string;
  /** action: 'snooze'のみ必須。 */
  snoozeUntil?: string;
  /** action: 'acknowledge'のみ任意。 */
  resumedActivityAt?: string;
}

export interface RespondToInterventionOutput {
  intervention: Intervention;
}

/**
 * RespondToInterventionUseCase（Version26、行動介入レイヤー）
 *
 * Ownerの応答（承認・却下・スヌーズ）だけを扱う——`Intervention`の
 * 生成自体は`GenerateInterventionsUseCase`（決定的ルールエンジン）の
 * 専管であり、このUseCaseはそちらを一切呼ばない。`ManageAgentDelegation
 * GrantUseCase`と同型のaction集約パターン（ADR 0039「書き込み経路を
 * 増やさない」方針）。
 */
export class RespondToInterventionUseCase {
  constructor(private readonly interventionRepository: InterventionRepository) {}

  async execute(input: RespondToInterventionInput): Promise<RespondToInterventionOutput> {
    const intervention = await this.interventionRepository.findById(input.id);
    if (!intervention) {
      throw new Error(`Intervention not found: ${input.id}`);
    }

    if (input.action === 'acknowledge') {
      intervention.acknowledge(input.resumedActivityAt);
    } else if (input.action === 'dismiss') {
      if (!input.note) {
        throw new Error("note is required for action 'dismiss'");
      }
      intervention.dismiss(input.note);
    } else {
      if (!input.snoozeUntil) {
        throw new Error("snoozeUntil is required for action 'snooze'");
      }
      intervention.snooze(input.snoozeUntil);
    }

    await this.interventionRepository.save(intervention);
    return { intervention };
  }
}
