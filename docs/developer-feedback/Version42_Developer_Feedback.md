# Developer Feedback — Version42

## メタデータ

- Version / 日付: Version42 / 2026-07-22
- 担当エンジン: Claude Code
- Git commit / tag: `864e75c`
- 対応Issue / 関連Report: Notion Transport統合（ADR 0074の一部撤回、ADR 0075） / `docs/reports/Version42_Report.md`
- 状態: Complete

## 1. 目的

ADR 0074（Notionを当面の個人情報記録の母体とする運用方針）決定の
直後、Owner本人がClaude.ai側で公式Notionコネクタを接続し、
「notionに接続して開発を進めて」と指示。解釈が複数取れたため確認
したところ、Owner本人が明確に「Project ARCのコードとしてNotion
連携を実装する（ADR 0074の決定を覆して、今すぐ着手する）」を
選択した。NotionをMobile Ingressと同格の新しいTransport source
として統合する。

## 2. 実装

- 新規：`NotionClient`ポート、`HttpNotionClient`実装、
  `PullNotionEntriesUseCase`
- 変更：`mobileSync.ts`（`notion-pull`サブコマンド）、`env.ts`
  （`NOTION_API_KEY`/`NOTION_DATABASE_ID`）
- Before：Notionからのデータ取り込み経路は存在しなかった。
- After：`pnpm mobile-sync notion-pull`で、Notion側`Synced`未
  チェックのページを、既存のCanonicalizeパイプライン
  （`ReceiveIngressRecordUseCase`）へそのまま合流できる。

## 3. 設計判断

- **採用案**：NotionをTransport sourceとして扱い、既存の
  `IngressRecord`/`ReceiveIngressRecordUseCase`/
  `SyncIngressRecordsUseCase`をそのまま再利用する（ADR 0059・0069と
  同じパターン）。理由：新しい書き込み経路・新しいCanonical Storeを
  増やさないという本プロジェクト一貫の方針を維持できる。
- **採用案**：pull後もNotion側のページを削除せず、`Synced`
  チェックボックスのみ更新する。理由：Notionのページ自体はOwnerの
  一次記録として残り続けるべきものであり、cloud Ingress Queueの
  ような一時的な受け皿とは性質が異なる。
- **見送り案**：Notion側からのpush（webhook）。理由：Owner利用形態
  （Internal Integration）との組み合わせが単純でなく、pull型の方が
  受信エンドポイントを新設せずに済む。

## 4. 理由

Constitution第4条は変更しない。ADR 0074の「見送った案」の一部
（「今すぐNotion連携のコードを書く」）を撤回する決定であるため、
ADR 0075を新規作成した。

## 5. 副作用

- 互換性：既存のMobile Ingress・Cloud Ingress Pull（`pnpm mobile-sync
  pull`）の挙動には影響なし。`notion-pull`は完全にopt-in。
- セキュリティ：`NOTION_API_KEY`未設定の既存Ownerには一切影響しない。
  Notion側データベースの実作成・トークン発行・データベース共有は
  引き続きOwner自身の操作が必要（Claude Code/ARCは代行できない）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：**675件合格**（94 test files、Version41時点661件+14件）
- `pnpm build`のARC-PM-005は本変更と無関係であることを`git stash`
  比較で再確認した。
- `HttpNotionClient`は実際のNotion APIと疎通できない
  （本サンドボックスのproxyポリシーで`api.notion.com`への直接到達性
  なし、実機確認済み）ため、fake serverによる契約テストのみで検証。

## 7. 未解決

- `HttpNotionClient`の実Notion APIとの疎通確認はOwner環境での実機
  確認待ち。

## 8. 次Version

1. Owner自身がNotion Internal Integration Tokenを作成し、対象
   データベースへ共有した上で`NOTION_API_KEY`/`NOTION_DATABASE_ID`を
   設定する（依存：Owner操作、Notion側UI）
2. Owner自身がNotion側に`Type: Memory`のテストページを数件作成し、
   `pnpm mobile-sync notion-pull`→`sync`を実機確認する
3. 保留中の「ほしい物リスト・方針」をNotion側の該当スキーマで記録し、
   次回`notion-pull`で取り込む

## 9. Owner確認事項

- **Notion Internal Integration Tokenの作成・データベース共有・
  環境変数設定**：Notion側のUI操作であり、Owner本人が行う必要が
  ある（Claude Code/ARCは代行できない）。急ぎ度：中——保留中の
  「ほしい物リスト・方針」の取り込みに必要。
- **`pnpm mobile-sync notion-pull`の実機確認**：本サンドボックスから
  はNotion APIへ疎通できないため、Owner環境での実行結果の確認が
  必要。急ぎ度：中。

## 10. 関連ADR

- 新規：ADR 0075（Notion Transport統合、ADR 0074の一部撤回）

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録した（`864e75c`）
- [x] 未実行テストを成功扱いしていない（675件全件実行・全件合格を実機で確認）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章に明記）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
