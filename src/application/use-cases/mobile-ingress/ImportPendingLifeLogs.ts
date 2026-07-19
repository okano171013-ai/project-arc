import { z } from 'zod';
import { ALL_BRIDGE_LOG_TYPES, type BridgeLogType } from '../../../domain/value-objects/BridgeLogType.js';
import { ReceiveIngressRecordUseCase } from './ReceiveIngressRecord.js';

const PendingLifeLogLineSchema = z.object({
  sequence: z.number().int(),
  type: z.string(),
  occurredAt: z.string().nullable(),
  content: z.record(z.unknown()),
  provenance: z.string(),
});

export type PendingLifeLogLineResult =
  | { sequence: number | undefined; status: 'parse_error'; reason: string }
  | { sequence: number | undefined; status: 'schema_invalid'; reason: string }
  | { sequence: number; type: string; status: 'unsupported_type'; reason: string }
  | { sequence: number; type: BridgeLogType; status: 'validated' }
  | { sequence: number; type: BridgeLogType; status: 'accepted'; idempotencyKey: string; ingressRecordId: string }
  | { sequence: number; type: BridgeLogType; status: 'duplicate'; idempotencyKey: string; ingressRecordId: string }
  | { sequence: number; type: BridgeLogType; status: 'rejected'; reason: string };

export interface ImportPendingLifeLogsInput {
  /** JSONL本文（1行1レコード）。ファイルI/O自体はこのUseCaseの責務外——呼び出し側（CLI）がファイルを読んで渡す。 */
  jsonl: string;
  /** trueの場合、スキーマ検証・type対応確認のみ行い、実際のReceive（IngressRecord作成）は行わない。 */
  dryRun: boolean;
}

export interface ImportPendingLifeLogsOutput {
  results: PendingLifeLogLineResult[];
  summary: { total: number; accepted: number; duplicate: number; unsupportedType: number; invalid: number };
}

/**
 * ImportPendingLifeLogsUseCase（Version37、ADR 0067）
 *
 * Owner指示書（2026-07-20）が定義した「退避中の16件」JSONL形式
 * （`sequence`/`type`/`occurredAt`/`content`/`provenance`、1行1件）を
 * 安全に検証・取り込むための汎用Importer。**実データはこの
 * リポジトリに含まれない**——Owner自身がローカルのファイルパスを
 * CLI（`pnpm import-pending-logs`）へ渡して実行する想定。
 *
 * 重複防止ID生成規則：`idempotencyKey = "pending-life-log:<sequence>"`
 * という決定的な規則を採用した（指示書自身は生成規則を指定して
 * いないため、Claude Codeが設計）。同じJSONLファイルを複数回
 * importしても、既存の`ReceiveIngressRecordUseCase`の冪等化が
 * そのまま効き、二重取り込みにならない。
 *
 * 未対応のtype（例：RewardSystem/BudgetRule/Wishlist/Preference/
 * SkincareRoutine/AppearanceAssessment/PersonalCareInventory——
 * 2026-07-20時点でProject ARCに対応するEntityが存在しない型）は
 * `unsupported_type`として明示的に報告し、既存の型へ推測で
 * マッピングしない（Constitution第2条「Systemは判断しない」、
 * Principle 5「推測は推測として扱う」）。
 *
 * dry-runの検証範囲はJSON構文・トップレベルschema・type対応確認
 * まで——`content`が各Entityの`create()`要件（例：MealLogの
 * `occurredAt`必須）を満たすかどうかは、既存のTransport/Canonical
 * 分離（ADR 0059・0065）に従い、実際のReceive後に`pnpm mobile-sync`
 * （Canonicalize）が検証する。スマートフォンからのライブ送信と
 * 同じ検証経路を通すことで、Importer側にロジックを二重実装しない。
 */
export class ImportPendingLifeLogsUseCase {
  constructor(private readonly receive: ReceiveIngressRecordUseCase) {}

  async execute(input: ImportPendingLifeLogsInput): Promise<ImportPendingLifeLogsOutput> {
    const lines = input.jsonl
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const results: PendingLifeLogLineResult[] = [];

    for (const raw of lines) {
      results.push(await this.processLine(raw, input.dryRun));
    }

    return { results, summary: summarize(results) };
  }

  private async processLine(raw: string, dryRun: boolean): Promise<PendingLifeLogLineResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return { sequence: undefined, status: 'parse_error', reason: error instanceof Error ? error.message : String(error) };
    }

    const validated = PendingLifeLogLineSchema.safeParse(parsed);
    if (!validated.success) {
      const maybeSequence = (parsed as { sequence?: unknown } | null)?.sequence;
      const sequence = typeof maybeSequence === 'number' ? maybeSequence : undefined;
      return { sequence, status: 'schema_invalid', reason: validated.error.issues.map((i) => i.message).join('; ') };
    }

    const line = validated.data;
    if (!ALL_BRIDGE_LOG_TYPES.includes(line.type as BridgeLogType)) {
      return {
        sequence: line.sequence,
        type: line.type,
        status: 'unsupported_type',
        reason:
          `Project ARCに"${line.type}"に対応するEntityが存在しません。` +
          '既存の型へ自動でマッピングせず、Owner/ARCの判断を待ちます。',
      };
    }

    const type = line.type as BridgeLogType;
    if (dryRun) {
      return { sequence: line.sequence, type, status: 'validated' };
    }

    const idempotencyKey = `pending-life-log:${line.sequence}`;
    try {
      const result = await this.receive.execute({
        idempotencyKey,
        payloadType: type,
        payload: line.content,
        clientCreatedAt: new Date().toISOString(),
      });
      if (result.duplicate) {
        return { sequence: line.sequence, type, status: 'duplicate', idempotencyKey, ingressRecordId: result.record.id };
      }
      return { sequence: line.sequence, type, status: 'accepted', idempotencyKey, ingressRecordId: result.record.id };
    } catch (error) {
      return { sequence: line.sequence, type, status: 'rejected', reason: error instanceof Error ? error.message : String(error) };
    }
  }
}

function summarize(results: PendingLifeLogLineResult[]): ImportPendingLifeLogsOutput['summary'] {
  return {
    total: results.length,
    accepted: results.filter((r) => r.status === 'accepted').length,
    duplicate: results.filter((r) => r.status === 'duplicate').length,
    unsupportedType: results.filter((r) => r.status === 'unsupported_type').length,
    invalid: results.filter((r) => r.status === 'parse_error' || r.status === 'schema_invalid' || r.status === 'rejected').length,
  };
}
