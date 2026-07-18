import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Connector } from '../../connector/Connector.js';
import { runTool } from '../toolResult.js';

const DISTRACTION_SIGNAL_KINDS = [
  'YouTube',
  'SNS',
  'AimlessSearch',
  'LongBreak',
  'EasyTaskEscape',
  'NoTimerAtLibrary',
  'ScheduledTaskNotStarted',
  'Other',
] as const;

export function registerDistractionSignalListTool(server: McpServer, connector: Connector): void {
  server.registerTool(
    'distraction_signal_list',
    {
      title: 'List Distraction Signals',
      description:
        'DistractionSignal（逃避・注意散漫の候補シグナル、Version26 行動介入レイヤー）を新しい順に最大limit件取得する。dateまたはkindで絞り込み可能。confidence・basisが常に必須（推測を確定事実として扱わない）。書き込みはproposal_create（type: DistractionSignal）→proposal_approveを使う。',
      inputSchema: {
        limit: z.number().int().positive().describe('取得する最大件数（必須、全件取得禁止、最大100）'),
        date: z.string().optional().describe('occurredAtの前方一致（例: 2026-07-18）'),
        kind: z.enum(DISTRACTION_SIGNAL_KINDS).optional().describe('シグナルの種類で絞り込む'),
      },
    },
    async ({ limit, date, kind }) => runTool(() => connector.listDistractionSignals({ limit, date, kind })),
  );
}
