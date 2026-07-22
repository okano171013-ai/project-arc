# ADR 0075: Notionを新しいTransportとして統合する（ADR 0074の一部見送りを覆す）

## ステータス

Accepted（Owner本人の判断、2026-07-22、「1」の回答）

## 関連Principle・ADR

- Constitution第4条（Ownerが最終決定する）
- ADR 0059（Mobile Ingress：Transport/Canonical Store分離、
  Accepted→Canonicalizedの二段階モデル）
- ADR 0065（Mobile Ingressの冪等化・idempotencyKey設計）
- ADR 0069（Cloud Ingress Pull：cloud→localの2段目Transport hopの前例）
- ADR 0074（本ADRが一部を覆す決定）

## コンテキスト

ADR 0074は、ChatGPT Developer Mode経由のProject ARC接続が不安定で
あることと、Remote MCPがOwnerのPCに依存し「PCが起動していない間は
使えない」ことを理由に、Notionを当面の個人情報記録の母体とし、
Project ARC自体は開発を継続するが日常使いから一時的に外す、という
運用方針を決定した。その「見送った案」の1つとして「今すぐNotion
連携のコードを書く」を明示的にスコープ外としていた。

ADR 0074決定の直後、OwnerからNotionコネクタの利用可否を問われ、
Claude Code（本セッション）がClaude.ai側のMCPコネクタレジストリを
確認したところ、公式のNotionコネクタが存在することが分かった。
Ownerがこれを実際に接続し、「notionに接続して開発を進めて」との
指示があった。これは字面上「Notion連携の実装」と「Notion経由での
データ手動保存」のどちらとも解釈できたため、確認を行った結果、
Owner本人が明確に「1. Project ARCのコードとしてNotion連携を実装
する（ADR 0074の決定を覆して、今すぐ着手する）」を選択した。

## 決定

1. **ADR 0074「見送った案」の「今すぐNotion連携のコードを書く」を
   撤回し、Notion連携をProject ARCのコードとして実装する。**
   ADR 0074の他の決定（Notionを当面の個人情報記録の母体とする、
   コードのロールバックはしない、Constitution/Principlesは変更
   しない）はそのまま維持する。
2. **NotionをMobile Ingressと同格の新しいTransport sourceとして
   位置づける**（ADR 0059の設計思想を踏襲）。Notionは判断しない
   単なる「受け皿」——実際の書き込み先（Reflection/MemoryRepository
   等のCanonical Store）にはならない。既存の`IngressRecord`／
   `ReceiveIngressRecordUseCase`／`SyncIngressRecordsUseCase`
   （＝Canonicalizeパイプライン）をそのまま再利用し、Notion専用の
   受信側抽象は新設しない。
3. **同期方向はpull-onlyとする**（ADR 0069のCloud Ingress Pullと
   同じ設計）。Project ARC側からNotionへ書き込むことはしない——
   Notionは「Ownerが記録する場所」、Project ARCは「それを定期的に
   取り込む側」という非対称な関係を維持する（Notion側の削除は
   Owner自身の記録を壊すリスクがあるため行わない。cloud Ingress
   Queueのような一時的な受け皿とは異なり、Notionのページ自体は
   Ownerの一次記録として残り続けるべきものであるため、ackで
   `delete`する代わりに`Synced`チェックボックスを立てるだけに
   留める——次項）。
4. **Notion側データベースのスキーマ**（Owner側で作成、Claude Codeは
   コードのみ実装しスキーマそのものは作らない）：
   - `Name`（title）：Owner向けの自由記述ラベル。プログラムからは
     参照しない。
   - `Type`（select）：`BridgeLogType`のいずれか
     （`src/domain/value-objects/BridgeLogType.ts`参照。Owner の
     直近の主用途は`Memory`——ほしい物リスト等）。
   - `Payload`（rich text、JSON文字列）：`ImportLogsUseCase`が
     対応する`type`ごとに要求する`data`の形をそのまま入れる。例
     （`Memory`）：
     `{"record":{"category":"Preferences","title":"...","content":"...","tags":["..."]}}`
   - `Date`（date、任意）：`clientCreatedAt`として使う。未設定なら
     Notionページの`created_time`にフォールバックする。
   - `Synced`（checkbox）：Project ARC側が排他的に管理する。pull時は
     `Synced != true`のページのみ取得し、ローカルへの反映
     （`ReceiveIngressRecordUseCase`呼び出し）が成功した後にこの
     フラグを`true`に更新する。Ownerはこのプロパティを手で
     操作しない運用とする。
5. **冪等化はNotionページIDを基にする**：
   `idempotencyKey = "notion:" + pageId`。同じページを複数回pullしても
   （例：`Synced`更新が失敗して再度対象になった場合）、
   `ReceiveIngressRecordUseCase`側の既存の冪等化により重複登録
   されない——ADR 0069のCloud Ingress Pullと同じ「ack/Synced更新の
   失敗は安全側に倒す（データは既にローカルへ複製済み）」設計を
   踏襲する。
6. **認証はOwnerが作成するNotion Internal Integration Token
   （`NOTION_API_KEY`）＋対象データベースID（`NOTION_DATABASE_ID`）
   による**。トークンの発行・対象データベースへのintegration共有は
   Notion側のUI操作であり、Owner本人が行う（`wrangler secret put`
   と同種のLevel2操作——Claude Code/ARCは代行できない、ADR 0069の
   Cloud Ingress Pull Tokenと同じ扱い）。未設定時は
   `notion-pull`コマンドが明確なエラーで終了する、既存の
   `CLOUD_INGRESS_URL`/`CLOUD_INGRESS_PULL_TOKEN`未設定時と同じ
   opt-in設計に揃える。

## 根拠

- 「新しい書き込み経路を増やさない」という本プロジェクト一貫の
  方針（ADR 0039/0048/0051、Version40でも再確認）を維持できる。
  NotionはIngressRecordの「入力ソースが1つ増える」だけであり、
  Canonicalize先のRepository群・検証ロジックは一切変更しない。
- ADR 0059のTransport/Canonical分離、ADR 0069のpull型2段目hopと
  完全に同じ形を踏襲することで、実装・テストパターンを丸ごと
  再利用できる（`CloudIngressClient`/`PullCloudIngressUseCase`が
  そのままテンプレートになる）。
- pull-only・Notion側は`Synced`フラグのみで削除しない設計は、
  Owner自身がNotionを「日常の一次記録」として使い続けるという
  ADR 0074の運用方針と矛盾しない——Project ARCへの取り込みが、
  Owner自身のNotion上の記録を壊す・消すことがない。

## 影響

- コード変更：`NotionClient`ポート（Application層）＋HTTP実装
  （Infrastructure層）、`PullNotionEntriesUseCase`（Application層、
  `PullCloudIngressUseCase`とほぼ同型）、`mobile-sync`CLIへの
  `notion-pull`サブコマンド追加、`NOTION_API_KEY`/
  `NOTION_DATABASE_ID`環境変数の追加。
- 新しいCanonical Store・新しいRepositoryは作らない。
- この結果、本サンドボックス環境からは`api.notion.com`への直接
  HTTP到達性がない（プロキシポリシーによりブロック——本セッションで
  実機確認済み）。そのため`NotionClient`の実HTTP到達性は、
  Cloudflare Worker統合時と同様、fakeを使った単体テストのみで
  検証し、実際のNotion APIとの疎通確認はOwner環境での実機確認に
  委ねる。

## 見送った案

- **Notion側からもProject ARCへリアルタイムでpushする
  （webhook等）**：Notion APIのpublic webhook機能は本ADR時点で
  Ownerの利用形態（Internal Integration）と単純に組み合わせられず、
  ADR 0069のCloud Ingress Pull同様、pull型の方がProject ARC側の
  受信エンドポイントを新設せずに済み実装・運用ともに単純なため
  見送った。将来PC-off Gapの解消と合わせて再検討しうる。
- **pull後にNotion側のページを削除する**：cloud Ingress Queueは
  一時的な受け皿だが、Notionのページ自体はOwnerの一次記録として
  残るべきものであるため、削除ではなく`Synced`チェックボックスに
  留めた。
