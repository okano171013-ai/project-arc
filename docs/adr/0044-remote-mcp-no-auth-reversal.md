# ADR 0044: Remote MCPエンドポイントのBearer認証必須を撤回する

## ステータス

承認済み（Owner確認済み、AskUserQuestionによる選択）

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- ADR 0041（Remote MCPを採用した理由——本ADRが一部訂正する対象）

## コンテキスト

Version18完了後、Owner自身がngrok経由でChatGPT Developer Modeから
実際に接続を試みたところ、コネクタ作成の段階で毎回エラーになった。
ngrokのHTTP Requestsログを確認したところ、ChatGPTからの
`POST /mcp`リクエストがすべて`401 Unauthorized`で拒否されていた
ことが判明した。

原因を`src/infrastructure/mcp/remoteServer.ts`のコードで確認した
結果、`handleRequest`が全リクエストに対し`isAuthorized`
（`ARC_API_KEY`とのBearer照合）を無条件に要求していたことが分かった。
一方、ChatGPT Developer Modeの接続設定画面で選択できる認証方式は
「認証なし」「OAuth」「Mixed」のみで、「認証なし」を選んだ場合
ChatGPTは`Authorization`ヘッダーを一切送らない。

つまりADR 0041時点の設計（簡易Bearer認証を必須にする）は、
**ChatGPTの実際のUIとは原理的に噛み合わず、現状のままでは
ChatGPTからRemote MCPサーバーへ絶対に接続できない**ことが、
机上の調査ではなく実際の接続テストで確定した。

## 決定

### `/mcp`エンドポイントへの受信リクエストからBearer認証チェックを撤廃する

`remoteServer.ts`の`handleRequest`から`isAuthorized`呼び出しを削除し、
`createRemoteMcpApp`から`apiKey`引数も削除した。起動時に
`ARC_API_KEY`の設定を必須とするチェック（プロセス起動失敗で
落とす仕様）も削除した——このチェックは「受信リクエストの認証」の
ためだけに存在しており、認証チェック自体をなくした以上、意味を
持たない。

`Connector → ARC Connector HTTP API`間の認証（`pnpm run api`側の
opt-in `ARC_API_KEY`検証、ADR 0035・0036）は本決定と無関係で、
従来どおり機能する。Remote MCPサーバーが受け取ったChatGPTからの
リクエストを、内部でConnector経由でHTTP APIへ転送する際は、
これまでどおり`.env`の`ARC_API_KEY`を使って認証される。

### 選択肢とOwnerの判断

Owner（AskUserQuestion）に以下2択を提示し、「認証チェックを外す」
を選択した。

1. **認証チェックを外す（採用）**：ChatGPTの「認証なし」モードで
   そのまま接続できるようにする。トンネル起動中は公開URLを知る
   誰でもアクセス可能になるというリスクを許容し、運用ドキュメント
   （`docs/setup/chatgpt-mcp-connection.md`）の「検証後は必ず
   トンネルを停止する」という既存の注意書きで運用上カバーする。
2. **認証必須のまま維持**：ChatGPTからの実接続は諦め、フルOAuth 2.1
   実装を将来Versionで検討するまでRemote MCPはローカル検証のみに
   留める。

「おとのコピペを減らすこと」というVersion18の唯一の成功指標
（`docs/handoff/archive/Version18_ARC_Brief.md`）を実際に満たす
には、ChatGPTから接続できることが必須であり、フルOAuth実装は
Principle 9のYAGNIおよび指示書のスコープ制約と矛盾する規模になる
ため、選択肢1が妥当と判断した。

## 根拠

- ADR 0041は「ChatGPT UIにBearer入力欄がない」ことまでは事前調査で
  正しく予見していたが、「認証なしモードなら接続できるはず」という
  前提が誤りだった——Bearer必須のサーバー側実装と組み合わせると、
  「認証なし」を選んでも401になり接続不能、という組み合わせの
  問題を見落としていた。これは機上の調査だけでは発見できず、
  実機での接続テストで初めて判明した。
- Write系の操作（`proposal_approve`等）は引き続きOwner承認を経由する
  Write Proposal Layer（Version14〜）の対象であり、認証を外しても
  「未承認のまま自動保存される」ことはない——Constitution Article 2
  ・Article 4への影響はない。認証撤廃が広げるリスクは「読み取り・
  Proposal作成をURLを知る第三者に許してしまう」範囲に限られる。
- トンネル（ngrok等）はOwnerが手動で起動・停止するプロセスであり、
  常時公開ではない。運用ドキュメントの「検証後は停止する」という
  既存の注意書きと運用規律で、リスクは実用上許容範囲に収まると
  判断した。

## 影響

- `pnpm run mcp:remote`は`ARC_API_KEY`が未設定でも起動する
  （ADR 0041が定めた「起動時必須」は撤回）。
- `/mcp`エンドポイントは無条件で応答する。ChatGPT以外の第三者が
  公開URLを知った場合、Read Layer・Proposal作成・
  ManagementFeedback一覧等に自由にアクセスできる——これは
  トンネル起動中に限られ、Owner自身の運用（検証後の停止）に
  委ねられる。
- `docs/setup/chatgpt-mcp-connection.md`の「Bearer入力欄があれば
  入力する」という記述は無効化し、「認証は常に無効」である旨に
  更新する。
- 将来、ChatGPT側がBearer/静的資格情報に対応する、またはProject ARC
  側でOAuth 2.1やCIMD（Client ID Metadata Documents）を実装する
  場合、本ADRを再度見直すこと。
