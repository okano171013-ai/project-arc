# Developer Feedback — Version31

## メタデータ

- Version / 日付: Version31 / 2026-07-19
- 担当エンジン: Claude Code
- Git commit / tag: `docs/reports/Version31_Report.md`参照（後続コミットでhashを追記）
- 対応Issue / 関連Report: ARC-PM-002（解決） / `docs/reports/Version31_Report.md`
- 状態: Complete

## 1. 目的

Program A・BどちらもJSON Repositoryへの書き込み頻度増加を前提とする
ため、ARC-PM-002（backup/restore/schema migration契約がない）を
解決し、安全に書き込みが増やせる永続化の土台を作る。完了条件：
atomic書き込み、汎用backup/restore CLI、世代retention、実機restore
drill、ADR。

## 2. 実装

- 追加：`src/infrastructure/backup/BackupService.ts`、
  `src/infrastructure/cli/backup.ts`
- 変更：`src/infrastructure/db/jsonStore.ts`
  （`atomicWriteFile`新設、`writeJsonArray`がこれを利用）
- Before：書き込み中断でJSONファイルが破損しうる、バックアップ
  手段が無い
- After：atomicな書き込み、`pnpm backup create/list/restore`で
  世代管理された復元が可能

## 3. 設計判断

- **採用案**：ファイルレベルの汎用バックアップ（Entityの型を知らない）
- **見送り案**：Entity単位の個別バックアップロジック
  ——23箇所への実装・保守コストがかかり、新Entity追加のたびに
  対応漏れが起きうるため見送った
- **見送り案**：SQLite等への移行——ADR 0003の「複数クライアント
  同時アクセスが必要になるまではJSON運用を続ける」という既存判断を
  覆すほどの要件が無いため見送った
- 境界・データモデルへの影響：`data/backups/`という新しい
  ディレクトリが増える。既存の`data/*.json`のスキーマ・形式は無変更。

## 4. 理由

- atomic書き込み（rename方式）は追加の外部依存なしでNode.js標準の
  みで実現でき、23 Repositoryのインターフェースを一切変更せずに
  適用できるため、最小の変更で最大の効果を得られると判断した。
- 復元操作自体を新しいバックアップ世代として記録することで、
  「間違った世代を復元してしまった」という新しい不可逆操作を防いだ
  （Principle 4「記録は資産である」の適用）。

## 5. 副作用

- 互換性：既存Repositoryのインターフェース・呼び出し元は無変更。
- 性能：バックアップ作成はファイルコピー+SHA-256計算のみで、
  データ量が現状規模である限り無視できるコスト。
- セキュリティ：バックアップは暗号化していない（ローカルのみ、
  ADR 0004のtoken暗号化とは別の対象）——クラウド送信時は別途
  ADR 0059の枠組みで検討する。
- 運用：`data/backups/`がディスク容量を消費する
  （既定retentionで上限あり）。
- 新たな保守コスト：`BackupService`は独立したモジュールであり、
  既存コードへの影響は無い。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：527件合格（新規15件：jsonStore 6件、BackupService 9件）
- 実機確認：`pnpm backup create` → `data/reflections.json`削除・
  `data/tasks.json`破損 → `pnpm backup restore <id>` →
  両ファイルの内容が完全一致することを確認（モックなし、実CLI・
  実ファイルI/O）
- 未実行の検証：長期間（世代数が非常に多い状態）での性能特性は
  未検証。現状のデータ規模では問題にならないと判断し、実データ量が
  増えた時点で再評価する。

## 7. 未解決

- Entity行レベルのschemaVersion未実装（P2）：次Version以降で
  必要性が出た時点で対応。
- バックアップの定期自動実行が無い（手動`pnpm backup create`のみ）：
  次Versionで Runner Control Plane（Version29）との統合を検討。

## 8. 次Version

1. Program A/B着手前の残り4 ADR（Autonomous Development Authority、
   AgentTask State Machine、Cloud Provider Cost Ceiling、Mobile
   Sync/Idempotency）の設計（依存：なし、着手可能）
2. Architecture Gate論点をOwnerへ1回にまとめて提示
   （依存：上記ADRの初期設計）
3. バックアップの定期自動実行をRunner Control Planeへ統合
   （依存：Version29 Runner基盤の再確認）
4. ARC-PM-005（build失敗）の解消（依存：なし、着手条件なし、
   Version30から持ち越し）
5. Program B実装着手（依存：Architecture GateでのOwner確認完了）

## 9. Owner確認事項

- **Program B・cloud関連の意思決定（Architecture Gate）**：
  cloud候補、月額上限、data保管地域、DevelopmentGrant上限。
  Version31時点では未着手（設計ADRのみ先行）。
- それ以外（atomic書き込み、backup/restoreの実装・テスト・文書化）
  はOwner確認を待たずに実施済み（Owner Priority Programsの
  「Owner確認なしで可能な範囲」に該当）。

## 10. 関連ADR

- 新規：ADR 0058（Life Data Durability、Accepted）
- 新規：ADR 0059（Mobile Ingress as Transport vs Canonical Store、
  Proposed）
- ADR不要と判断した理由：該当なし（両方とも永続形式・将来の
  クラウド設計に関わるためADR必須と判断した）

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [ ] commit / tagを記録した（本コミット後、follow-upコミットでhashを追記）
- [x] 未実行テストを成功扱いしていない（長期性能特性は「未検証」と明記）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章で分離）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
