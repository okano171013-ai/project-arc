import type { AgentTask } from '../../domain/entities/AgentTask.js';

/**
 * AgentTaskRepository（ポート、ADR 0061）
 */
export interface AgentTaskRepository {
  save(task: AgentTask): Promise<void>;
  findById(id: string): Promise<AgentTask | null>;
  findAll(): Promise<AgentTask[]>;
}
