# Version31 Report: Data Durability

commit: `8ef0588`

## 1. Version概要

`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`
「Claude Codeへの次の指示」に基づき、Program A（自律共同開発）・
Program B（Mobile Daily Capture）の共通前提となる永続化の土台
（data foundation）を実装した。ARC-PM-002（JSON生活データに
backup/restore/schema migration契約がない）を解決する。詳細は
ADR 0058。あわせて、Program Bの設計上の境界（Mobile Ingressは
Transport、local JSONがCanonical Store）をADR 0059として先行させた
（実装はしない）。

## 2. 今回実装した機能（理由も含めて説明）

- **atomic書き込み**：`src/infrastructure/db/jsonStore.ts`の
  `writeJsonArray`を、一時ファイル書き込み→`rename`する方式に変更。
  23個の`JsonFile*Repository`は無変更のまま、書き込み中のプロセス
  中断によるファイル破損を防げるようになった。
- **汎用バックアップ・復元**：`src/infrastructure/backup/
  BackupService.ts`を新設。`data/*.json`をファイルレベルで
  （Entityの型を知らずに）バックアップし、`manifest.json`
  （schemaVersion・チェックサム）を添える。世代retention（既定10）、
  復元時の自動安全スナップショット、チェックサム照合による
  改ざん検知を実装。
- **CLI**：`pnpm backup create|list|restore <id>`
  （`src/infrastructure/cli/backup.ts`）。

## 3. 実装しなかった機能（延期理由も記載）

- **Entity行レベルのschemaVersion**：23 Repositoryへの一括変更となり
  影響範囲が大きいため、manifestレベルのschemaVersion（`"1"`固定）
  のみを今回のスコープとした（Version31 Brief「対象外」・ADR 0058
  参照）。
- **本格的なmigrationフレームワーク**：具体的な変換要件が無いうちに
  作るのはYAGNIに反すると判断し、manifestの`schemaVersion`を将来の
  判定に使える形にするに留めた。
- **Mobile Ingressの実装**：ADR 0059は設計（Proposed）のみ。
  Program B実装はArchitecture Gate（Owner確認）後、Version32以降。
- **Program A（AgentTask等）**：統合Roadmap案でVersion34〜35。

## 4. Architecture Review

- 新規：`src/infrastructure/backup/BackupService.ts`、
  `src/infrastructure/cli/backup.ts`
- 変更：`src/infrastructure/db/jsonStore.ts`
  （`atomicWriteFile`を新設しexport、`writeJsonArray`はこれを使う
  形にリファクタ）
- 既存23 Repositoryのインターフェース・依存方向は無変更

## 5. ADR

- 新規：ADR 0058（Life Data Durability、Accepted）
- 新規：ADR 0059（Mobile Ingress as Transport vs Canonical Store、
  Proposed、設計のみ）

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**527件合格**（Version30時点512件 + jsonStore.test.ts
  6件 + BackupService.test.ts 9件）
- 追加テスト：
  - `jsonStore.test.ts`：atomic書き込みの正常系・異常系
    （renameを実際に失敗させ、元ファイルが壊れないこと・一時
    ファイルが残らないことを確認）
  - `BackupService.test.ts`：バックアップ作成、一覧、**実際の復元
    演習**（バックアップ→データ削除・破損→復元→内容一致確認）、
    復元前の自動安全スナップショット、チェックサム不一致時の復元
    拒否、世代retentionの動作
- **実機確認**：`pnpm backup create` → `data/reflections.json`削除・
  `data/tasks.json`を不正なJSONに書き換え → `pnpm backup restore
  <id>` → 両ファイルの内容が元と完全一致することを、このセッション内
  で実際のCLI実行により確認した（モックではなく実ファイルI/O）。
- `pnpm build`：不合格（TS2742、既存のARC-PM-005、Version31起因では
  ない——Version30と同じ理由で確認済み）。

## 7. 修正したバグ

該当なし（新規バグ修正ではなく、新機能の追加）。

## 8. 技術的負債

- Entity行レベルのschemaVersion未実装（P2、次Version以降で検討）
- 既存のARC-PM-005〜010は本Versionでは変化なし

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Program A/B着手前に必要な残り4 ADR
  （Autonomous Development Authority、AgentTask State Machine、
  Cloud Provider Cost Ceiling、Mobile Sync/Idempotency）の設計を
  進めること。
- Program Bの実装に入る前に、Architecture Gate
  （cloud候補・月額上限・data保管地域・DevelopmentGrant上限）を
  Ownerと1回にまとめて確認すること
  （`OWNER_PRIORITY_PROGRAMS_2026-07-19.md`「Owner確認をまとめる
  タイミング」参照）。
- `pnpm backup create`を定期実行する仕組み（cron的な自動化）は
  今回のスコープに含めていない——Runner Control Plane（Version29）
  と統合できる可能性があり、次Versionで検討する。

## 10. POへの提案

- バックアップの自動定期実行（今は手動`pnpm backup create`のみ）が
  無いと、実際に障害が起きた時点のバックアップが古い可能性がある。
  Runner基盤への統合を早めに検討することを推奨する。

## 11. CEOへのコメント

Version30に続き、地味だが「実際に壊れたときに直せるか」を実機で
確認できたVersionだった。特に復元演習を自動テストとしてだけでなく、
このセッション内で実際のCLIコマンドとして手を動かして確認できたのは
大きい——`docs/HISTORY.md`が繰り返し指摘してきた「実機確認でしか
見つからない不具合」という教訓を、今回は逆に「実機確認で安心を
確認できた」形で活かせた。

## 12. ARCへの引き継ぎ

**新しい資産**：`pnpm backup create/list/restore`という、23個の
Repository全てに自動的に効く汎用バックアップ機構ができた。新しい
Entityが増えても対応不要。

**新しいルール**：`jsonStore.ts`への書き込みは今後全てatomicである
ことが保証される。新しいRepositoryを追加する際も、この保証を
意識した実装（追加のtmpファイル管理等）を自前で行う必要はない。

**新しい思想**：ADR 0059の「Transport（一時中継）とCanonical
Store（正本）を区別する」という考え方は、Program B以降、クラウド
コンポーネントが増えるたびに立ち返るべき判断基準になる——
Constitution第1条「唯一の人生データベース」を、新しいコンポーネント
追加のたびに曖昧にしないための最初の防波堤。

**Ownerについて分かったこと**：Owner Priority Programsという文書を
一度作成して優先順位を明文化するスタイルは、Version28時点のPM
Reviewと同じパターン——個別の指示を都度出すより、まとまった文書を
一度作って以後の判断基準にする、という進め方が一貫している。

## 13. Product Review

**ユーザー体験で改善されたこと**：直接の体験変化はない
（バックエンドの耐久性向上のため）。ただし「もし何か壊れても、
`pnpm backup restore`で戻せる」という安心感は、今後Program A/Bで
書き込み頻度が増える前提に立つと、体験の一部になる。

**毎日使う理由**：変化なし。

**懸念**：バックアップが手動実行である限り、実際に障害が起きた瞬間の
直前状態を必ず復元できるとは限らない。定期自動実行の検討を次Versionで
優先したい。

**次Versionで最も価値が高い改善**：Program A/B着手前の残り4 ADRの
設計を進め、Architecture Gateの論点（cloud候補・cost上限）を早めに
Ownerへ提示すること——これが決まらないとProgram Bの実装に着手できない。

## 14. 10年後のProject ARCへの貢献

Version31が10年後に効いてくるとすれば、それは「データが壊れても
戻せる」という、地味だが人生OSにとって最も基礎的な信頼性を先に
固めたことだと考える。Program A（AIが自律的にコードを書き続ける）・
Program B（クラウド常駐コンポーネントが増える）のどちらも、今後
Project ARCへの書き込み頻度と書き込み主体を増やす方向の変化であり、
その前に「壊れても直せる」という土台を確認せずに進めていたら、
Version40〜50あたりで取り返しのつかないデータ損失が起きていた
可能性がある。機能の格好良さではなく、退屈な信頼性を機能追加の前に
確保したという順序そのものが、10年後にも参照される価値だと考える。
