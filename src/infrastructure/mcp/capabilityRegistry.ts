import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROPOSAL_TYPES } from './tools/proposalSchema.js';

/**
 * このモジュールがロードされた時刻（＝MCPサーバープロセスの起動時刻に
 * 近似）。Version40（ADR 0072、Owner指示`ba6548bc-...`項目5）：
 * 「古い長寿命MCPプロセスが残る問題」を切り分けるための材料——
 * `processUptimeSeconds`が長時間かつ`buildCommit`が現在のgit HEADと
 * 一致しない場合、再起動が必要な古いプロセスである可能性が高い。
 */
const PROCESS_STARTED_AT = new Date().toISOString();

export const CAPABILITY_SCHEMA_VERSION = '1.0.0';
/**
 * Version40（ADR 0072）で34→40へ更新した。過去、Version35〜39の間
 * この値が更新されておらず、`capability_registry_get`が実態より
 * 古いVersion番号を返し続けるという「staleness」の一因になっていた
 * （Owner指示`ba6548bc-...`項目5）。今後は各Version完了時のDoD
 * チェックリストへこの値の更新を明記し、同じ齟齬を繰り返さない。
 */
export const PROJECT_ARC_VERSION = 40;

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
  'study_session_create',
  'study_session_update',
  'study_session_finish',
  'study_session_list',
  'study_summary_by_date',
  'study_summary_by_period',
  'capability_registry_get',
] as const;

export interface McpCapabilityRegistry {
  readonly schemaVersion: string;
  readonly projectVersion: number;
  readonly buildCommit: string;
  readonly toolCount: number;
  readonly toolNames: readonly string[];
  readonly proposalTypes: readonly string[];
  /**
   * Version40追加。「本番Project ARCとローカルcheckoutが異なる
   * データストアを見る問題」（Owner指示項目5）を切り分けるための
   * 実行環境情報。個人データの内容は一切含めない——ファイル数のみ。
   */
  readonly environment: {
    readonly cwd: string;
    readonly dataDirectory: string;
    readonly dataFileCount: number | null;
    readonly processStartedAt: string;
    readonly processUptimeSeconds: number;
  };
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

/**
 * `data/`直下の`.json`ファイル数を数える。0件・存在しない場合は
 * 「実データが無い＝サンドボックス/未初期化環境の可能性」を示す
 * シグナルとして`null`ではなく`0`を返す（読み取れないこと自体は
 * `null`で区別する）。ファイル名・内容は一切読まない。
 */
function countDataFiles(dataDirectory: string): number | null {
  try {
    return readdirSync(dataDirectory).filter((name) => name.endsWith('.json')).length;
  } catch {
    return null;
  }
}

export function getMcpCapabilityRegistry(): McpCapabilityRegistry {
  const dataDirectory = resolve(process.cwd(), 'data');
  return {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    projectVersion: PROJECT_ARC_VERSION,
    buildCommit: readGitCommit(),
    toolCount: MCP_TOOL_NAMES.length,
    toolNames: [...MCP_TOOL_NAMES].sort(),
    proposalTypes: [...PROPOSAL_TYPES].sort(),
    environment: {
      cwd: process.cwd(),
      dataDirectory,
      dataFileCount: countDataFiles(dataDirectory),
      processStartedAt: PROCESS_STARTED_AT,
      processUptimeSeconds: Math.round(process.uptime()),
    },
  };
}
