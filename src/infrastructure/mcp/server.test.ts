import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createApp } from '../http/server.js';
import { Connector } from '../connector/Connector.js';
import { buildMcpServer } from './server.js';

/**
 * MCP Tool層のend-to-endテスト。指示書15章の精神
 * （実物を起動して駆動する）に従い、実際のHTTP APIサーバーを起動し、
 * SDKが提供する`InMemoryTransport`でClient/McpServerを接続して、
 * 実際のMCPプロトコル（JSON Schema検証を含む）越しに23ツールを
 * 検証する。
 */
describe('Project ARC MCP Server', () => {
  const DATA_DIR = 'data/_test-mcp-server';
  const API_KEY = 'mcp-test-key';
  let httpServer: Server;
  let client: Client;

  beforeAll(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    httpServer = createApp({ dataDir: DATA_DIR, apiKey: API_KEY });
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const address = httpServer.address() as AddressInfo;
    const connector = new Connector({ baseUrl: `http://127.0.0.1:${address.port}`, apiKey: API_KEY });
    const mcpServer = buildMcpServer(connector);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
    const content = result.content as Array<{ type: string; text?: string }>;
    return content[0]?.text ?? '';
  }

  it('lists all 23 registered tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'agent_delegation_grant_list',
        'agent_message_list',
        'approval_decision_list',
        'check_in_list',
        'daily_behavior_score_get',
        'distraction_signal_list',
        'finance_log_list',
        'intervention_effectiveness_get',
        'intervention_list',
        'intervention_policy_settings_get',
        'management_feedback_list',
        'management_feedback_resolve',
        'meal_log_list',
        'nutrition_log_list',
        'nutrition_summary_by_date',
        'proposal_approve',
        'proposal_create',
        'proposal_reject',
        'read_decision',
        'read_external',
        'read_reflection',
        'read_timeline',
        'weight_log_list',
      ].sort(),
    );
  });

  it('read_reflection requires limit and returns reflections (JSON Schema検証)', async () => {
    const missingLimit = await client.callTool({ name: 'read_reflection', arguments: {} });
    expect(missingLimit.isError).toBe(true);

    const result = await client.callTool({
      name: 'read_reflection',
      arguments: { limit: 5 },
    });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(textOf(result))).toEqual({ reflections: [] });
  });

  it('drives Read -> Proposal -> Approve -> ManagementFeedback -> Resolve end-to-end (指示書15章)', async () => {
    const created = await client.callTool({
      name: 'proposal_create',
      arguments: {
        type: 'ManagementFeedback',
        target: '22時レビューをManagementFeedback Proposalとして生成',
        payload: {
          record: {
            author: 'ARC',
            category: 'Process',
            content: 'Daily Reviewをもっと早い時間に生成してほしい',
            reason: '22時だとOwnerが確認しないまま日付が変わることが多いため',
          },
        },
        reason: '22時だとOwnerが確認しないまま日付が変わることが多いため',
      },
    });
    expect(created.isError).toBeFalsy();
    const proposal = JSON.parse(textOf(created));
    expect(proposal.type).toBe('ManagementFeedback');

    const beforeApprove = await client.callTool({
      name: 'management_feedback_list',
      arguments: {},
    });
    expect(JSON.parse(textOf(beforeApprove)).feedback).toHaveLength(0);

    const approved = await client.callTool({ name: 'proposal_approve', arguments: proposal });
    expect(approved.isError).toBeFalsy();
    expect(JSON.parse(textOf(approved)).type).toBe('ManagementFeedback');

    const afterApprove = await client.callTool({
      name: 'management_feedback_list',
      arguments: {},
    });
    const feedbackList = JSON.parse(textOf(afterApprove)).feedback;
    expect(feedbackList).toHaveLength(1);
    expect(feedbackList[0].resolution).toBe('Open');

    const resolved = await client.callTool({
      name: 'management_feedback_resolve',
      arguments: { id: feedbackList[0].id, resolution: 'Accepted' },
    });
    expect(resolved.isError).toBeFalsy();
    expect(JSON.parse(textOf(resolved)).feedback.resolution).toBe('Accepted');
  });

  it('proposal_reject persists nothing', async () => {
    const created = await client.callTool({
      name: 'proposal_create',
      arguments: {
        type: 'Memory',
        target: '新しいMemory: シェーバー',
        payload: { record: { category: 'Assets', title: 'シェーバー', content: 'PHILIPS 5000' } },
        reason: '会話で言及されたため',
      },
    });
    const proposal = JSON.parse(textOf(created));

    const rejected = await client.callTool({ name: 'proposal_reject', arguments: proposal });
    expect(rejected.isError).toBeFalsy();
    expect(JSON.parse(textOf(rejected))).toEqual({ rejected: true, type: 'Memory' });
  });

  it('surfaces Connector/HTTP errors as isError:true (unauthorizedなど)', async () => {
    // 存在しないIDへのresolveはHTTP側で400/エラーになり、isErrorへ変換される
    const result = await client.callTool({
      name: 'management_feedback_resolve',
      arguments: { id: 'does-not-exist', resolution: 'Accepted' },
    });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('not found');
  });

  it('drives AgentMessage proposal_create -> approve -> agent_message_list (Version17)', async () => {
    const created = await client.callTool({
      name: 'proposal_create',
      arguments: {
        type: 'AgentMessage',
        target: 'Version17指示書',
        payload: {
          record: { direction: 'ToClaudeCode', content: '指示書の内容', relatedVersion: 'Version17' },
        },
        reason: 'ARCからの指示',
      },
    });
    expect(created.isError).toBeFalsy();
    const proposal = JSON.parse(textOf(created));

    const approved = await client.callTool({ name: 'proposal_approve', arguments: proposal });
    expect(approved.isError).toBeFalsy();
    expect(JSON.parse(textOf(approved)).type).toBe('AgentMessage');

    const list = await client.callTool({ name: 'agent_message_list', arguments: {} });
    expect(list.isError).toBeFalsy();
    const messages = JSON.parse(textOf(list)).messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].record.direction).toBe('ToClaudeCode');
  });

  it('drives signals -> proposal_create -> approval_decision_list -> proposal_approve -> approval_decision_list (Version21)', async () => {
    const created = await client.callTool({
      name: 'proposal_create',
      arguments: {
        type: 'Memory',
        target: 'Version21 e2e対象',
        payload: { record: { category: 'Assets', title: 't', content: 'c' } },
        reason: 'e2e確認',
        signals: { costImpact: true },
      },
    });
    expect(created.isError).toBeFalsy();
    const proposal = JSON.parse(textOf(created));
    expect(proposal.approvalLevel).toBe('Level2');

    const afterCreate = await client.callTool({ name: 'approval_decision_list', arguments: {} });
    expect(afterCreate.isError).toBeFalsy();
    const proposedDecisions = JSON.parse(textOf(afterCreate)).decisions;
    expect(proposedDecisions.some((d: { record: { stage: string; level: string } }) =>
      d.record.stage === 'Proposed' && d.record.level === 'Level2',
    )).toBe(true);

    const approved = await client.callTool({ name: 'proposal_approve', arguments: proposal });
    expect(approved.isError).toBeFalsy();

    const afterApprove = await client.callTool({
      name: 'approval_decision_list',
      arguments: { level: 'Level2' },
    });
    const level2Decisions = JSON.parse(textOf(afterApprove)).decisions;
    expect(level2Decisions.some((d: { record: { stage: string } }) => d.record.stage === 'Approved')).toBe(
      true,
    );
  });
});
