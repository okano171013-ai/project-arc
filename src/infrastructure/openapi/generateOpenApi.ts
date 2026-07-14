#!/usr/bin/env node
/**
 * OpenAPI 3.x生成（Version18、Remote MCP Integration指示書6章）
 *
 * ChatGPT Actions対応を見据え、operationId・request・response付きの
 * OpenAPI 3.xドキュメントを生成する。Actions実装自体はVersion18の
 * 対象外（指示書6章「Actions実装までは不要」）。
 *
 * 既存の`http/server.ts`の手製正規表現ルーター自体は変更しない
 * （指示書7章「Project ARC本体は変更しない」）——このファイルは
 * server.tsのルーティングとは独立した、静的ドキュメント生成用の
 * スクリプトである。`pnpm run openapi:generate`で`docs/openapi.json`
 * を生成する。HTTPサーバー自身がこれを自動配信する新規ルートは
 * 追加しない。
 *
 * 対象エンドポイントは、ARCが実際に利用する主要API群
 * （Read Layer・Write Proposal Layer・ManagementFeedback・
 * AgentMessage）に絞る——Connector（Version15）・MCP Tool
 * （Version16〜17）が対応する10エンドポイントとそのまま一致する
 * （ADR 0043、YAGNI）。
 */
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const envelope = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
  });

const errorEnvelope = z.object({
  ok: z.literal(false),
  error: z.string(),
});

function okResponse(description: string, dataSchema: z.ZodTypeAny) {
  return {
    description,
    content: { 'application/json': { schema: envelope(dataSchema) } },
  };
}

const errorResponses = {
  400: { description: 'Bad Request', content: { 'application/json': { schema: errorEnvelope } } },
  401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelope } } },
};

const proposalTypeSchema = z
  .enum(['Reflection', 'Memory', 'ExternalKnowledge', 'Appearance', 'ManagementFeedback', 'AgentMessage'])
  .openapi('ProposalType');

const proposalSchema = z
  .object({
    type: proposalTypeSchema,
    target: z.string(),
    payload: z.record(z.unknown()),
    reason: z.string(),
    createdAt: z.string(),
  })
  .openapi('Proposal');

const resolutionSchema = z.enum(['Open', 'Accepted', 'Implemented', 'Closed', 'Rejected']).openapi('Resolution');

function registerGet(config: {
  operationId: string;
  path: string;
  summary: string;
  query: RouteConfig['request'] extends infer R ? (R extends { query?: infer Q } ? Q : never) : never;
  responseDescription: string;
  responseSchema: z.ZodTypeAny;
}): void {
  registry.registerPath({
    method: 'get',
    path: config.path,
    operationId: config.operationId,
    summary: config.summary,
    request: { query: config.query },
    responses: {
      200: okResponse(config.responseDescription, config.responseSchema),
      ...errorResponses,
    },
  });
}

// --- Read Layer（Version14、ADR 0030） ---

registerGet({
  operationId: 'readReflection',
  path: '/read/reflection',
  summary: '直近のReflectionを新しい順に最大limit件取得する',
  query: z.object({ limit: z.string().openapi({ description: '取得する最大件数（必須）' }) }),
  responseDescription: 'Reflectionの一覧',
  responseSchema: z.object({ reflections: z.array(z.record(z.unknown())) }),
});

registerGet({
  operationId: 'readTimeline',
  path: '/read/timeline',
  summary: '各Logを横断した時系列を新しい順に最大limit件取得する',
  query: z.object({
    limit: z.string(),
    since: z.string().optional(),
    source: z.string().optional(),
  }),
  responseDescription: 'Timelineエントリの一覧',
  responseSchema: z.object({ entries: z.array(z.record(z.unknown())) }),
});

registerGet({
  operationId: 'readExternal',
  path: '/read/external',
  summary: 'External Brainをスコア順に最大limit件取得する',
  query: z.object({
    limit: z.string(),
    q: z.string().optional(),
    tags: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
  }),
  responseDescription: 'ExternalKnowledgeの検索結果',
  responseSchema: z.object({ results: z.array(z.record(z.unknown())), sources: z.array(z.record(z.unknown())) }),
});

registerGet({
  operationId: 'readDecision',
  path: '/read/decision',
  summary: '質問文から選択肢・比較材料（DecisionContext）を取得する',
  query: z.object({
    limit: z.string(),
    question: z.string(),
    candidates: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
  }),
  responseDescription: 'DecisionContextと根拠一覧',
  responseSchema: z.object({
    decisionContext: z.record(z.unknown()),
    retrievedKnowledge: z.array(z.record(z.unknown())),
    sources: z.array(z.record(z.unknown())),
  }),
});

// --- Write Proposal Layer（Version14、ADR 0031） ---

registry.registerPath({
  method: 'post',
  path: '/proposal/create',
  operationId: 'createProposal',
  summary: 'Proposalを組み立てて返す。何も保存しない',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            type: proposalTypeSchema,
            target: z.string(),
            payload: z.record(z.unknown()),
            reason: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    201: okResponse('組み立てられたProposal', z.object({ proposal: proposalSchema })),
    ...errorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/proposal/approve',
  operationId: 'approveProposal',
  summary: 'Owner承認済みのProposal全体を再送し、対応する既存UseCase経由で保存する',
  request: { body: { content: { 'application/json': { schema: proposalSchema } } } },
  responses: {
    200: okResponse('保存結果', z.object({ type: proposalTypeSchema, result: z.unknown() })),
    ...errorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/proposal/reject',
  operationId: 'rejectProposal',
  summary: '却下されたProposalを渡す。何も保存しない',
  request: { body: { content: { 'application/json': { schema: proposalSchema } } } },
  responses: {
    200: okResponse('却下結果', z.object({ rejected: z.literal(true), type: proposalTypeSchema })),
    ...errorResponses,
  },
});

// --- ManagementFeedback（Version14〜15） ---

registerGet({
  operationId: 'listManagementFeedback',
  path: '/management-feedback',
  summary: 'ManagementFeedbackを一覧取得する',
  query: z.object({ resolution: resolutionSchema.optional() }),
  responseDescription: 'ManagementFeedbackの一覧',
  responseSchema: z.object({ feedback: z.array(z.record(z.unknown())) }),
});

registry.registerPath({
  method: 'post',
  path: '/management-feedback/{id}/resolve',
  operationId: 'resolveManagementFeedback',
  summary: 'ManagementFeedbackのresolutionを遷移させる',
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: z.object({ resolution: resolutionSchema }) } } },
  },
  responses: {
    200: okResponse('遷移後のManagementFeedback', z.object({ feedback: z.record(z.unknown()) })),
    ...errorResponses,
  },
});

// --- AgentMessage（Version17） ---

registerGet({
  operationId: 'listAgentMessages',
  path: '/agent-messages',
  summary: 'ARC↔Claude Code間の往復記録を一覧取得する',
  query: z.object({
    direction: z.enum(['ToClaudeCode', 'ToARC']).optional(),
    relatedVersion: z.string().optional(),
  }),
  responseDescription: 'AgentMessageの一覧',
  responseSchema: z.object({ messages: z.array(z.record(z.unknown())) }),
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Project ARC Connector API',
      version: '1.0.0',
      description:
        'ARC（ChatGPT/Claude）が利用する主要エンドポイントのみを対象とするOpenAPI 3.xドキュメント' +
        '（Version18、指示書6章。operationId/request/responseのみ、Actions実装は対象外）。',
    },
    servers: [
      {
        url: 'http://127.0.0.1:3939',
        description: 'ローカル既定値（pnpm run api）。実際の公開URLは環境ごとに異なる',
      },
    ],
  });
}

async function main(): Promise<void> {
  const document = generateOpenApiDocument();
  const outputPath = 'docs/openapi.json';
  await writeFile(outputPath, JSON.stringify(document, null, 2), 'utf-8');
  console.log(`OpenAPI document written to ${outputPath}`);
}

function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    console.error('Fatal error:', error);
    process.exitCode = 1;
  });
}
