**実装とPC上の設定はクロコに振るのが正解です。**
ARCは設計・調査・レビュー・運用判断を担当します。

理由は、今のこのChatGPTセッションからは、おとのPC上のProject ARCリポジトリや`pnpm run mcp`を直接操作できないためです。Version16のMCPはstdio方式なのでClaude CodeなどのローカルMCPクライアントからは使えますが、ChatGPTへ接続するには、原則として外部から到達可能なリモートMCPサーバーが必要です。OpenAI公式にも、ChatGPTのDeveloper modeではサーバーURLを登録する方式が案内されています。([OpenAI Developers][1])

## 役割分担

**ARCが行うこと**

* 最新仕様の調査
* Agent Collaboration Layerの設計
* クロコ向け指示書の作成
* クロコからのFeedbackのレビュー
* Owner承認が必要な範囲の判断
* 接続後のProject ARC読み取り
* Proposalの作成
* おとの承認後のApprove実行

**クロコが行うこと**

* Project ARCのコード変更
* 必要なパッケージの導入
* MCPサーバーのRemote対応
* AgentTask／Message／Artifactの実装
* API・CLI・MCPツールの追加
* 環境変数と認証設定
* テスト、実機確認、コミット
* ChatGPTへの接続手順の準備

## まずやる順番

1. **クロコ側でAgent Collaboration Layerを実装**
2. **Claude Codeを既存stdio MCPへ接続**
3. ARC→クロコの指示書、クロコ→ARCのFeedbackをProject ARCに保存できるようにする
4. ChatGPT用にRemote MCP化
5. ChatGPTのDeveloper modeから接続
6. 読み取りとProposal作成を実機確認
7. Owner承認後の書き込みを実機確認

ChatGPTはカスタムMCPサーバーを登録して外部アプリとデータを送受信できますが、第三者サーバーとして扱われるため、認証・権限・プロンプトインジェクションへの対策が必要です。([OpenAI Developers][1])

## 費用について

最初の**ローカル協調レイヤー実装は、原則として追加費用なし**で進められます。

費用が発生する可能性があるのは、ChatGPTからProject ARCへ接続するために次を導入するときです。

* MCPサーバーのホスティング
* 独自ドメイン
* HTTPS公開基盤
* 有料トンネルサービス
* 外部データベース
* Claude・OpenAI等のAPI従量課金
* 常時起動サーバー

これらは、**無料枠で試せる構成を先に検証し、有料契約前に必ずおとへ相談**します。

## 結論

今すぐの実行担当は**クロコ**です。
ARCはクロコに対して、

> まず無料・ローカルでAgent Collaboration Layerを実装し、Claude Codeとの往復を成立させる。ChatGPT接続のためのRemote MCP化は別段階とし、有料サービスの契約や外部公開前にOwnerへ承認を求める。

という指示を出すのが適切です。

なお、ChatGPTへのカスタムMCP接続機能はプランや地域、Developer modeの提供状況によって使える範囲が異なります。公式にはChatGPT内でDeveloper modeを有効化し、サーバーURLを登録する手順が案内されています。([OpenAI Developers][1])

[1]: https://developers.openai.com/api/docs/mcp "
  Building MCP servers for ChatGPT Apps and API integrations
"
