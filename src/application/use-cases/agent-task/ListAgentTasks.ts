import type { AgentTask, AgentTaskStatus } from '../../../domain/entities/AgentTask.js';
import type { AgentTaskRepository } from '../../ports/AgentTaskRepository.js';

export interface ListAgentTasksInput {
  status?: AgentTaskStatus;
  relatedVersion?: string;
}

export interface ListAgentTasksOutput {
  tasks: AgentTask[];
}

export class ListAgentTasksUseCase {
  constructor(private readonly agentTaskRepository: AgentTaskRepository) {}

  async execute(input: ListAgentTasksInput = {}): Promise<ListAgentTasksOutput> {
    const all = await this.agentTaskRepository.findAll();
    const filtered = all.filter(
      (t) =>
        (!input.status || t.status === input.status) &&
        (!input.relatedVersion || t.record.relatedVersion === input.relatedVersion),
    );
    const sorted = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { tasks: sorted };
  }
}
