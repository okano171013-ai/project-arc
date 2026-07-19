# ADR 0058: Life Data Durability（atomic書き込み・backup・restore）

## ステータス

承認済み（Owner Priority Programs、2026-07-19、Version31）

## 関連Principle

- Principle 4（記録は資産である）
- Principle 8（長期保守性）・Principle 9（段階的拡張／YAGNI）
- Constitution第1条（唯一の人生データベース）

## コンテキスト

`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`が
Program A・Bの共通前提として「data foundation」の完成をVersion31に
指定した。現状の`src/infrastructure/db/jsonStore.ts`は：

1. **非atomic書き込み**：`writeFile(filePath, ...)`を直接呼んでおり、
   書き込み中にプロセスが中断（クラッシュ・kill・電源断）すると、
   対象JSONファイルが不完全な内容のまま残り、次回`readJsonArray`が
   `JSON.parse`で例外を投げる可能性がある。
2. **バックアップ機構が無い**：誤った削除・書き込みバグ・ディスク
   障害からの復旧手段が存在しない（ARC-PM-002・MOB-004）。

23個の`JsonFile*Repository`はすべてこの`jsonStore.ts`を共通で使う
設計（Version2、ADR 0003）になっている。

## 検討した選択肢

### 書き込み方式

1. **現状維持**：`writeFile`直書き。実装コストゼロだが、破損リスクを
   放置する。
2. **一時ファイル→rename**：同一ディレクトリ内に`.tmp`ファイルを
   書き、`rename`で置き換える。POSIX上`rename`は同一ファイル
   システム内でatomicであることが保証されている。追加の外部依存
   なしで実装できる。
3. **専用DBへの移行（SQLite等）**：atomicityをDBエンジンに任せる。
   ADR 0003が「複数クライアントからの同時アクセス要件が出るまでは
   JSON運用を続ける」としており、今回はそこまでの要件がない
   （単一プロセスの破損防止が目的）ため、過剰。

### バックアップ方式

1. **Entity単位のバックアップ**：23個のRepositoryそれぞれに
   個別のバックアップロジックを持たせる。Repositoryの型を知る必要が
   あり、新しいEntityを追加するたびにバックアップ側の対応漏れが
   起きうる。
2. **ファイルレベルの汎用バックアップ（採用）**：`data/*.json`を
   個別Entityの型を知らないまま、ファイルとしてまとめてコピーする。
   新しいEntity（新しい`data/xxx.json`）が増えても自動的に対象になる。

## 決定

### 1. atomic書き込み

`jsonStore.ts`の`writeJsonArray`を、同一ディレクトリに
`<filename>.tmp-<random>`を書いてから`rename`する実装に変更する。
`readJsonArray`側は無変更（既存の全Repositoryのインターフェースを
壊さない）。

### 2. ファイルレベルの汎用バックアップ

`src/infrastructure/backup/BackupService.ts`を新設する。

- **対象**：`data/*.json`（`data/backups/`自身と、テストが使う
  `data/_test-*`は除外する）
- **保存先**：`data/backups/<ISO8601タイムスタンプ>/`
  配下に、対象ファイルをそのままコピーし、`manifest.json`
  （`schemaVersion`・生成日時・含まれるファイル一覧・各ファイルの
  SHA-256チェックサム）を添える
- **世代管理**：既定で直近10世代を保持し、それを超えた古い世代から
  自動的に削除する（retention policy、テストで検証する）
- **CLI**：`pnpm backup create` / `pnpm backup list` / `pnpm backup
  restore <世代ID>`。`restore`は対象の`data/*.json`を上書きする前に
  「復元前のバックアップ」を自動的にもう1世代作成する（復元操作
  自体が不可逆にならないようにする、Principle 4）
- **manifestの`schemaVersion`**：本Versionでは固定値
  `"1"`から開始する。行レベル（各Entityの各レコード）への
  `schemaVersion`スタンプは対象外とする（Version31 Brief「対象外」
  参照）——manifestレベルの世代識別で十分な現時点のニーズに対して
  行レベル変更は影響範囲（23ファイル）に対して過剰と判断した。

### 3. migrationフレームワークは今回作らない

`manifest.json`の`schemaVersion`を将来のmigration判定に使える形には
しておくが、実際の変換ロジック（例：v1→v2のフィールド名変更）は、
具体的な変換が必要になった時点で追加する（YAGNI）。

### 4. 復元演習（restore drill）を実施する

設計・実装のみでなく、実際に「バックアップ作成→対象データ削除→
復元→内容一致確認」を自動テストとして実行し、結果を
`docs/reports/Version31_Report.md`に記録する。

## 根拠

- rename方式はNode.js標準の`fs/promises`のみで実現でき、新規外部
  依存を追加しない（Principle 9踏襲、express導入時のADR 0049と同じ
  判断基準）。
- ファイルレベルの汎用バックアップは、Entity数が23個かつ今後も
  増え続ける（Program B等）前提で、個別対応の保守コストを避ける
  設計として長期的に見合う（Principle 8）。
- 復元操作自体をバックアップ対象にすることで、「間違った世代を
  復元してしまった」という新しい種類の不可逆操作を防ぐ。

## 影響

- 新規：`src/infrastructure/backup/BackupService.ts`、
  `src/infrastructure/cli/backup.ts`（CLIエントリポイント）
- 変更：`src/infrastructure/db/jsonStore.ts`
  （`writeJsonArray`のatomic化。呼び出し側23 Repositoryは無変更）
- `package.json`に`backup`スクリプトを追加
- ARC-PM-002（データ耐久性）はこのADRで設計を確定し、Version31の
  実装完了をもって解決とする

## 再検討の条件

- 複数プロセス・複数マシンからの同時書き込みが必要になった場合、
  atomic renameだけでは足りない（排他制御が別途必要）——その時点で
  SQLite/Supabase等への移行を再検討する（ADR 0003の再検討条件と同じ）。
- クラウドへのバックアップ送信が必要になった場合（Program B、
  Version32以降）、別ADRで暗号化・送信先・保持期間を設計する。
