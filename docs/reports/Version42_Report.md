# Version42 Report: Notion Transport統合（ADR 0074の一部撤回、ADR 0075）

commit: `864e75c`

## 1. Version概要

Version41完了後、Owner本人が「開発をやり直す」という発言の真意を
確認したところ、「ChatGPT接続の不安定さ・Remote MCPのPC依存により
Project ARCが日常使いに耐えない、当面Notionを個人情報記録の母体に
する」という運用上の判断であることが判明し、ADR 0074として記録
した。その直後、Owner本人がClaude.ai側で公式Notionコネクタを実際に
接続し、「notionに接続して開発を進めて」と指示。指示の解釈が
「Notion連携のコード実装」と「Notion経由でのデータ手動保存」の
どちらとも取れたため確認したところ、Owner本人が明確に「1.
Project ARCのコードとしてNotion連携を実装する（ADR 0074の決定を
覆して、今すぐ着手する）」を選択した。これを受けてADR 0075として
設計・実装した。

## 2. 今回実装した機能（理由も含めて説明）

- **ADR 0075**：ADR 0074「見送った案」の「今すぐNotion連携の
  コードを書く」を撤回し、NotionをMobile Ingressと同格の新しい
  Transport sourceとして統合する設計を記録した（ADR 0059の
  Transport/Canonical分離、ADR 0069のpull型2段目hopをそのまま踏襲）。
- `NotionClient`ポート（Application層）＋`HttpNotionClient`実装
  （Infrastructure層）を追加した。Notion API
  （`POST /v1/databases/:id/query`・`PATCH /v1/pages/:id`）を
  Bearer認証＋`Notion-Version`ヘッダーで呼び出す。
- `PullNotionEntriesUseCase`を追加した。`PullCloudIngressUseCase`
  （Version38）とほぼ同型——既存の`ReceiveIngressRecordUseCase`
  （Canonicalizeパイプラインの入口）をそのまま再利用し、Notion専用の
  受信側抽象は新設していない。
- `pnpm mobile-sync notion-pull`サブコマンドを追加した。
  `NOTION_API_KEY`/`NOTION_DATABASE_ID`が未設定の場合は明確な
  エラーで終了する（`CLOUD_INGRESS_URL`/`CLOUD_INGRESS_PULL_TOKEN`と
  同じopt-in設計）。
- Notion側データベースのスキーマ（`Name`/`Type`/`Payload`/`Date`/
  `Synced`）をADR 0075に明文化した。cloud Ingress Queueと異なり、
  pull後もNotionのページは削除しない——`Synced`チェックボックスを
  立てるだけに留め、Ownerの一次記録を壊さない設計とした。
  idempotencyKeyはNotionページID由来（`notion:${pageId}`）とし、
  `Synced`更新の失敗時も安全に再試行できるようにした
  （`pulled-sync-failed`/`failed`の2種類のresultステータス、
  `PullCloudIngressUseCase`と同じ設計）。

## 3. 実装しなかった機能（延期理由も記載）

- Notion側からのpush（webhook等）：Owner利用形態（Internal
  Integration）との単純な組み合わせが難しく、pull型の方が受信
  エンドポイントを新設せずに済むため見送った（ADR 0075「見送った
  案」）。
- Notion側データベースの実作成・Internal Integration Tokenの発行・
  対象データベースへの共有：Notion側のUI操作であり、Owner本人が
  行う必要がある（`wrangler secret put`と同種のLevel2操作）。
- `HttpNotionClient`の実Notion APIとの疎通確認：本サンドボックスの
  outbound proxyポリシーにより`api.notion.com`への直接到達性が
  ない（`curl`でHTTP 000/exit 56を実機確認済み）。fake serverによる
  契約テストのみで検証し、実際の疎通確認はOwner環境に委ねた
  （Cloudflare Workerローカルエミュレータ検証の前例と同じ扱い）。

## 4. Architecture Review

- 新規：`src/application/ports/NotionClient.ts`、
  `src/infrastructure/http/notionClient.ts`、
  `src/application/use-cases/mobile-ingress/PullNotionEntries.ts`
- 変更：`src/infrastructure/cli/mobileSync.ts`
  （`notion-pull`サブコマンド・`buildNotionPullUseCase`追加）、
  `src/infrastructure/config/env.ts`（`NOTION_API_KEY`/
  `NOTION_DATABASE_ID`追加）
- 新しいCanonical Store・新しいRepositoryは作っていない。
  `ReceiveIngressRecordUseCase`・`SyncIngressRecordsUseCase`・
  `ImportLogsUseCase`は無変更のまま再利用した（Clean Architectureの
  層境界・「書き込み経路を増やさない」方針を維持）。

## 5. ADR

- 新規：ADR 0075（Notion Transport統合、ADR 0074の一部撤回）

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**675件合格**（94 test files、Version41時点661件+14件：
  `notionClient.test.ts`4件、`PullNotionEntries.test.ts`5件、
  `mobileSync.test.ts`に`notion-pull`未設定エラーのテスト1件を追加、
  他既存ファイルへの影響なし）
- `pnpm build`：ARC-PM-005（TS2742、`generateOpenApi.ts`）が本
  Versionの変更と無関係であることを`git stash`比較で再確認した
  （stash後も同一エラー・同一行で再現、本Versionで触れていない
  ファイル）。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

なし。

## 8. 技術的負債（今後改善したい点）

- `HttpNotionClient`は実際のNotion APIとの疎通が本サンドボックスから
  検証できない。Owner環境での実機確認（`notion-pull`実行、実際の
  Notionページの取り込み）が完了するまでは、Notion側のレスポンス
  形状の想定違い（例：`rich_text`が複数ブロックに分かれる場合の
  結合順序等）が潜在的リスクとして残る。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner自身がNotion Internal Integration Tokenを作成し、
  `NOTION_API_KEY`/`NOTION_DATABASE_ID`を設定した上で、実際に
  Notionへ数件のテストページ（`Memory`型）を作成し、
  `pnpm mobile-sync notion-pull`→`pnpm mobile-sync sync`の一連を
  実機確認する。
- 保留中の「ほしい物リスト・方針」は、Notion側データベースへ
  Owner自身が該当スキーマ（`Type: Memory`、`Payload`にJSON）で
  記録すれば、次回`notion-pull`で取り込める状態になった。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- ADR 0074からADR 0075への流れは、「運用方針の決定」と「その運用を
  支えるコードをいつ書くか」が別の意思決定であることを示す実例
  だった。Owner本人が数分の間に「今は書かない」→「今すぐ書く」と
  判断を変えたこと自体は問題ではなく、両方の判断をその都度ADRとして
  記録できたことが重要だと考える。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Owner本人の運用判断（ADR 0074）とその直後の実装判断（ADR 0075）の
両方を、Constitution/Principlesを変更せず、既存のTransport/
Canonical分離という設計パターンの中で一貫して扱えたことが今回の
成果だと考える。次Versionでは、Owner自身によるNotion側の実設定と
実機確認を経て、実際に保留中のデータが取り込まれる様子を確認したい。

## 12. ARCへの引き継ぎ（Owner追加指示、2026年7月）

- **新しい資産**：Notionが、Mobile Ingress・Cloud Ingressに続く
  3つ目のTransport sourceになった。Owner自身がNotionへ記録した
  内容が、`notion-pull`経由で既存のCanonicalizeパイプラインへ
  そのまま合流する。
- **新しいルール**：運用方針の決定（例：ADR 0074の「当面は
  コードを書かない」）は、Owner本人の後続判断（例：「1」の
  回答）によって部分的に上書きされうる——ただしその都度ADRとして
  明示的に記録し、何が撤回され何が維持されたかを明確にすること。
- **Ownerについて分かったこと**：ChatGPT接続の不安定さへの
  フラストレーションが、Notion移行という運用判断だけでなく、
  Notion連携自体をコードとして今すぐ実装するという判断にも
  つながった——「使えるものは今すぐ使えるようにする」という
  Owner本人の指向が一貫している。

## 13. Product Review（Owner追加指示、2026年7月）

- **ユーザー体験で改善されたこと**：まだ変化なし——Notion側の
  実設定（Token発行・データベース作成）が完了するまでは、
  `notion-pull`は実行できない。
- **懸念**：本サンドボックスからNotion APIへ疎通できないため、
  Notionのレスポンス形状に関する実装上の想定違いが、実機確認まで
  顕在化しない可能性がある。
- **次Versionで最も価値が高い改善**：Owner自身がNotion側の設定を
  完了し、実際に`notion-pull`を実行して、保留中の「ほしい物
  リスト・方針」がProject ARCへ取り込まれる様子を確認すること。

## 14. 10年後のProject ARCへの貢献（Owner追加指示、2026年7月、Version9より）

「日常使いの主運用ツールを一時的に切り替える」という運用判断が
あっても、Transport/Canonical分離という設計パターンがあれば、
切り替え先（Notion）をコードの中核を変えずに新しい入力経路として
迎え入れられる、という実例が10年後も再利用される資産である。
