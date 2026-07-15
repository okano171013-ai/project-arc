/**
 * ApprovalLevel（Version21、Approval Policy Engine）
 *
 * ARC（AgentMessage `6b78f23d-...`、Version21正式指示）が定義した
 * 3段階の承認レベル。Level0=Claude Code、Level1=ARC、Level2=Owner。
 *
 * `ApprovalSignals`は、この判定に使う唯一の入力である。呼び出し側
 * （ARC/Claude Code）が明示的に宣言した構造化フラグのみを見て機械的に
 * lookupする——`target`/`reason`等の自由記述テキストの意味を解釈する
 * ことは一切しない（Constitution第2条「Systemは判断しない」に抵触
 * しないための設計、ADR 0048参照）。
 */

export type ApprovalLevel = 'Level0' | 'Level1' | 'Level2';

/**
 * Owner自身が指示書で列挙した6つのLevel2該当カテゴリにそのまま対応する。
 * 新しい基準は作らない。
 */
export interface ApprovalSignals {
  /** 有料サービス・課金・契約 */
  readonly costImpact?: boolean;
  /** 外部公開範囲の拡大（新規公開エンドポイント、トンネル設定変更等） */
  readonly externalExposureChange?: boolean;
  /** 認証方式・秘密情報・APIキーの変更 */
  readonly authOrSecretChange?: boolean;
  /** 破壊的操作（force-push、hard reset、データの不可逆削除等） */
  readonly destructive?: boolean;
  /** 個人情報の外部送信 */
  readonly personalDataExternalTransfer?: boolean;
  /** Constitution/Principlesの変更 */
  readonly constitutionOrPrincipleChange?: boolean;
}

export const APPROVAL_SIGNAL_KEYS = [
  'costImpact',
  'externalExposureChange',
  'authOrSecretChange',
  'destructive',
  'personalDataExternalTransfer',
  'constitutionOrPrincipleChange',
] as const satisfies readonly (keyof ApprovalSignals)[];
