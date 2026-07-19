# Version31 Brief: Data Durability

作成日: 2026-07-19  
作成者: Claude Code  
根拠: `docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`
「Claude Codeへの次の指示」2項、統合Roadmap案のVersion31行
（「共通data foundation | backup、schemaVersion、migration、
restore drill、cloud inbox ADR」）

## 目的

Program A（自律共同開発）・Program Bのどちらも、JSON Repositoryへの
書き込み頻度が増える前提に立つ。現状の`jsonStore.ts`は非atomic書き込み
（`writeFile`直書き、一時ファイル経由のrenameなし）で、プロセスが
書き込み中に中断すると対象JSONファイルが破損しうる。また、バックアップ・
復元・世代管理の仕組みが一切ない（ARC-PM-002・MOB-004）。Version31は
この2点を解消し、Program A/Bが安全に乗れる永続化の土台を作る。

## 対象（このVersionでやること）

1. `jsonStore.ts`の書き込みをatomicにする（一時ファイル→rename）
2. 全`data/*.json`を対象にした汎用バックアップ機構
   （個別Entityの型を知らない、ファイルレベルのコピー）
3. 世代管理（retention）・手動バックアップCLI・復元CLI
4. **実際に**バックアップ→データ破損（削除）→復元→検証、という
   restore drillを実行し、結果をReportに記録する
5. ADR「Life Data Durability（backup・restore・retention）」を
   実装前に作成する
6. ADR「Mobile Ingress as ARC Transport vs Canonical Store」
   （統合Roadmap案の「cloud inbox ADR」）の設計のみ先行させる
   ——Program B自体の実装（Version32以降）はしない

## 対象外（このVersionではやらない）

- Program A（AgentTask State Machine、DevelopmentGrant、Review
  Broker等）——統合Roadmap案でVersion34〜35
- Program Bの実装（Mobile Ingress常時稼働、smartphone PWA等）
  ——ADRのみ先行、実装はVersion32以降
- 各Entityの行レベル`schemaVersion`スタンプ（全23 Repositoryへの
  一括変更）——バックアップmanifestレベルの`schemaVersion`のみを
  今回のスコープとし、行レベルは次Versionへ持ち越す（理由：
  一括変更は影響範囲が23ファイルに及び、Version31の主目的
  （破損防止・復元可能性）に対して過剰）
- 本格的なmigrationフレームワーク——restore機構がmanifestを検証する
  設計フックは用意するが、実際のスキーマ変換ロジックは、変換が
  実際に必要になった時点で追加する（YAGNI, Principle 9）
- 有料provider契約、cloud storageへのバックアップ送信、秘密情報の
  新規作成——ローカル`data/backups/`配下のみを対象とする

## 受入条件

- [ ] `pnpm test`で、atomic書き込みの検証（書き込み中断を模した
      テストを含む）が緑
- [ ] `pnpm backup create`でバックアップ世代が作成される
- [ ] `pnpm backup list`で世代一覧が確認できる
- [ ] `pnpm backup restore <id>`で復元でき、実際に
      「バックアップ→データ削除→復元→内容一致確認」のdrillを
      実行した記録がReportにある
- [ ] retention policy（保持世代数の上限）が実装され、テストされている
- [ ] ADR「Life Data Durability」がAccepted
- [ ] ADR「Mobile Ingress as ARC Transport vs Canonical Store」が
      Proposedとして存在する（実装はしない）
- [ ] typecheck / lint / test / buildが確認される
      （buildはARC-PM-005が未解決のため、Version31起因の新規失敗が
      無いことを確認する形に留める）

## 依存

- 既存`jsonStore.ts`・23個の`JsonFile*Repository`
  （個別Entityへの変更なしで対応できる設計を優先する）
- `docs/security/remote-mcp-threat-model.md`・ADR 0057
  （Version30、直前のVersion）

## Owner専権事項

- 費用が発生する外部storage（cloud backup先）の選定・契約——今回は
  ローカルのみのため発生しない
- 秘密情報の新規作成・送信——今回は発生しない
- 本番運用への反映——バックアップ機構自体はローカル完結のツールで
  あり、「本番」の概念に該当しない（既存CLIと同列）と判断し、
  Owner確認なしで進める。異論があれば差し戻してもらう前提とする

## 完了時の成果物（DEVELOPMENT_RULES.md Version終了チェックリスト準拠）

- ADR（新規2本）
- `docs/reports/Version31_Report.md`
- `docs/developer-feedback/Version31_Developer_Feedback.md`
- `docs/roadmap.md` / `docs/project-management/STATUS.md` /
  Open Issues更新（ARC-PM-002をクローズまたは進捗更新）
