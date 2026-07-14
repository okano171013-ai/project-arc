import type { AgentMessage } from '../../domain/entities/AgentMessage.js';

/**
 * AgentMessageRepository（ポート）
 *
 * `delete`は持たない——往復記録は削除せず残す（ManagementFeedback
 * Repositoryと同じ方針）。
 */
export interface AgentMessageRepository {
  save(message: AgentMessage): Promise<void>;
  findById(id: string): Promise<AgentMessage | null>;
  findAll(): Promise<AgentMessage[]>;
}
