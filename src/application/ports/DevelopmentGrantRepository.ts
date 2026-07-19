import type { DevelopmentGrant } from '../../domain/entities/DevelopmentGrant.js';

/**
 * DevelopmentGrantRepository（ポート、ADR 0060）
 *
 * `delete`は持たない——Grantは`revoke()`で無効化するのみで、記録は
 * 監査のため残す（`AgentDelegationGrantRepository`と同じ方針）。
 */
export interface DevelopmentGrantRepository {
  save(grant: DevelopmentGrant): Promise<void>;
  findById(id: string): Promise<DevelopmentGrant | null>;
  findAll(): Promise<DevelopmentGrant[]>;
}
