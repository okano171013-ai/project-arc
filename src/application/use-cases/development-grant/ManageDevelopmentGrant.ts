import { randomUUID } from 'node:crypto';
import { DevelopmentGrant, type DevelopmentGrantRecord } from '../../../domain/entities/DevelopmentGrant.js';
import type { DevelopmentGrantRepository } from '../../ports/DevelopmentGrantRepository.js';

export type ManageDevelopmentGrantAction = 'create' | 'pause' | 'resume' | 'revoke';

export interface ManageDevelopmentGrantInput {
  action: ManageDevelopmentGrantAction;
  /** action: 'create'のみ必須。 */
  record?: DevelopmentGrantRecord;
  /** action: 'pause'|'resume'|'revoke'のみ必須。 */
  id?: string;
}

export interface ManageDevelopmentGrantOutput {
  grant: DevelopmentGrant;
}

/**
 * ManageDevelopmentGrantUseCase（Version33、ADR 0060）
 *
 * `ManageAgentDelegationGrantUseCase`と同じ構造。このUseCase自体は
 * 「委譲すべきかどうか」を判断しない——action・recordの構造検証と
 * Entityの状態機械をそのまま呼び出すだけ（Constitution第2条）。
 * Grant自体の作成・変更・再開はOwner専権（ADR 0060）——このUseCaseの
 * 呼び出し元（CLI/MCP Tool）は、実施前にOwner確認を経ていることが
 * 前提。
 */
export class ManageDevelopmentGrantUseCase {
  constructor(private readonly developmentGrantRepository: DevelopmentGrantRepository) {}

  async execute(input: ManageDevelopmentGrantInput): Promise<ManageDevelopmentGrantOutput> {
    if (input.action === 'create') {
      if (!input.record) {
        throw new Error("record is required for action 'create'");
      }
      const grant = DevelopmentGrant.create({ id: randomUUID(), record: input.record });
      await this.developmentGrantRepository.save(grant);
      return { grant };
    }

    if (!input.id) {
      throw new Error(`id is required for action '${input.action}'`);
    }
    const grant = await this.developmentGrantRepository.findById(input.id);
    if (!grant) {
      throw new Error(`DevelopmentGrant not found: ${input.id}`);
    }

    if (input.action === 'pause') grant.pause();
    else if (input.action === 'resume') grant.resume();
    else grant.revoke();

    await this.developmentGrantRepository.save(grant);
    return { grant };
  }
}
