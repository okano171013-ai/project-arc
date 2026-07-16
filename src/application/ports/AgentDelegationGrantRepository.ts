import type { AgentDelegationGrant } from '../../domain/entities/AgentDelegationGrant.js';

/**
 * AgentDelegationGrantRepository（ポート）
 *
 * `delete`は持たない——Grantは`revoke()`で無効化するのみで、記録は
 * 監査のため残す（ManagementFeedback Repositoryと同じ方針）。
 */
export interface AgentDelegationGrantRepository {
  save(grant: AgentDelegationGrant): Promise<void>;
  findById(id: string): Promise<AgentDelegationGrant | null>;
  findAll(): Promise<AgentDelegationGrant[]>;
}
