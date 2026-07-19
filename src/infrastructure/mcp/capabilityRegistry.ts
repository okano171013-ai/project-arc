import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROPOSAL_TYPES } from './tools/proposalSchema.js';

export const CAPABILITY_SCHEMA_VERSION = '1.0.0';
export const PROJECT_ARC_VERSION = 34;

export const MCP_TOOL_NAMES = [
  'read_reflection',
  'read_timeline',
  'read_external',
  'read_decision',
  'proposal_create',
  'proposal_approve',
  'proposal_reject',
  'management_feedback_list',
  'management_feedback_resolve',
  'agent_message_list',
  'approval_decision_list',
  'agent_delegation_grant_list',
  'development_grant_list',
  'agent_task_list',
  'meal_log_list',
  'nutrition_log_list',
  'nutrition_summary_by_date',
  'weight_log_list',
  'finance_log_list',
  'check_in_list',
  'distraction_signal_list',
  'intervention_list',
  'intervention_policy_settings_get',
  'daily_behavior_score_get',
  'intervention_effectiveness_get',
  'capability_registry_get',
] as const;

export interface McpCapabilityRegistry {
  readonly schemaVersion: string;
  readonly projectVersion: number;
  readonly buildCommit: string;
  readonly toolCount: number;
  readonly toolNames: readonly string[];
  readonly proposalTypes: readonly string[];
}

function readGitCommit(): string {
  const fromEnvironment = process.env.ARC_BUILD_COMMIT?.trim();
  if (fromEnvironment) return fromEnvironment;

  try {
    const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
    const gitDirectory = resolve(repositoryRoot, '.git');
    const head = readFileSync(resolve(gitDirectory, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return head;
    return readFileSync(resolve(gitDirectory, head.slice(5)), 'utf8').trim();
  } catch {
    return 'unknown';
  }
}

export function getMcpCapabilityRegistry(): McpCapabilityRegistry {
  return {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    projectVersion: PROJECT_ARC_VERSION,
    buildCommit: readGitCommit(),
    toolCount: MCP_TOOL_NAMES.length,
    toolNames: [...MCP_TOOL_NAMES].sort(),
    proposalTypes: [...PROPOSAL_TYPES].sort(),
  };
}
