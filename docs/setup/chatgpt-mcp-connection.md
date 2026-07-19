# ChatGPTとの接続方法（Remote MCP）

Project ARC Version18で追加したRemote MCPサーバーを使い、
ChatGPT（Developer Mode）からProject ARCへ直接接続するための手順です。
トンネルサービスへの登録・ChatGPT側の接続操作はOwner自身の作業が
必要です（Claude Codeはアカウント作成・外部サービスへの契約を
代行できません）。

**重要な前提（2026年7月、実機接続確認により更新）**：ChatGPT
Developer Modeのネイティブな接続方式はOAuth 2.0/2.1または
「認証なし」であり、静的なBearer API KeyをUI上に直接入力する仕組みは
ありません。当初はBearer認証を実装していましたが、ChatGPTの
「認証なし」モードは`Authorization`ヘッダーを一切送らないため
Bearer必須のままでは接続できないことが実機テストで判明し、
**Remote MCPサーバー（`/mcp`）は認証チェックを行わない仕様に変更
しました**（ADR 0044）。ChatGPT側の認証方式は必ず「認証なし
（No Authentication）」を選択してください。

> **Version30追記**：OAuth 2.1認証（Passcodeゲート）はコードとして
> 実装・テスト済みだが、Version30時点で本番`.env`にはまだ反映して
> いない（ADR 0051の「有効化した」という記録は誤りだったと判明、
> 詳細はADR 0051「訂正」節参照）。本番でOAuthを有効化した場合、
> 上記「認証なし」ではなく「OAuth」を選ぶ必要がある——手順は
> `docs/setup/remote-mcp-oauth-migration.md`（one-shot checklist）
> を参照。有効化するまでは本ページの「認証なし」の説明が現状どおり
> 正しい。

**このため、トンネル起動中は公開URLを知る誰でもアクセスできる
状態になります。** 検証が終わったら必ずトンネルを停止してください
（本ドキュメント末尾の注意も参照）。

**追記（Version20、ADR 0047）**：常時稼働の運用（ログオン時自動起動）
を導入した場合、この節の「検証後は停止する」という前提は変わり、
**ログオンしている間はほぼ常時、公開URLが有効な状態になります**。
Owner確認済みのリスク許容ですが、常時稼働の詳細・停止方法は
[`docs/setup/collaboration-runner.md`](./collaboration-runner.md)を
参照してください。以下の手順（3章以降）は、まだ常時稼働を導入して
いない場合の、都度手動で起動・確認する手順として引き続き有効です。

---

## 1. 起動順

Remote MCPサーバーは単体では動作しません。以下の順に起動してください。

1. **ARC Connector HTTP API**（`pnpm run api`）— Remote MCP・stdio MCP
   どちらもこのAPIを経由してProject ARCのデータへアクセスします。
2. **Remote MCPサーバー**（`pnpm run mcp:remote`）— 既定では
   `http://127.0.0.1:3940/mcp`で待ち受けます。`ARC_API_KEY`の設定は
   不要です（`/mcp`エンドポイント自体は認証しません、ADR 0044）。
   Connector→HTTP API間の内部認証にのみ`ARC_API_KEY`（`pnpm run api`
   側がopt-inで要求する場合）が使われます。
3. **トンネル**（下記2章のいずれか）— Remote MCPサーバー
   （127.0.0.1:3940）を公開HTTPSへ橋渡しします。

```bash
# ターミナル1
pnpm run api

# ターミナル2
pnpm run mcp:remote

# ターミナル3（下記2章のいずれかを選んで実行）
```

## 2. 必要な`.env`設定

```
ARC_API_KEY=（十分に長いランダムな文字列。Remote MCP・HTTP API両方の認証に使う）
MCP_HTTP_PORT=3940  # 任意、既定値のままで問題なければ省略可
```

`.env.example`にも記載があります。`ARC_API_KEY`は`pnpm run api`（HTTP
API側）と`pnpm run mcp:remote`（Remote MCP側）の両方が同じ値を読み
込みます——1つの共有シークレットとして扱ってください。

## 3. トンネル起動方法（比較はADR 0042参照）

いずれもアカウント作成が必要です。Owner自身が事前にサインアップして
ください。

### ngrok（初回の動作確認向け）

```bash
ngrok http 3940
```

表示された`https://xxxx.ngrok-free.app`が公開URLです。無料枠は
セッション時間に制限があるため、恒久運用には向きません。

### Cloudflare Tunnel（恒久運用向け、独自ドメインが必要）

```bash
cloudflared tunnel --url http://127.0.0.1:3940
```

または、既にCloudflareでドメインを管理している場合は名前付き
トンネルを設定して恒久的なURLを割り当てられます（`cloudflared`公式
ドキュメント参照）。

## 4. ChatGPT Developer Modeでの接続手順

1. ChatGPTの設定から「Developer mode」を有効化する
   （プラン・地域により提供状況が異なります）。
2. カスタムMCPコネクタの追加画面で、トンネルが発行した公開URLに
   `/mcp`を付けたもの（例：`https://xxxx.ngrok-free.app/mcp`）を
   サーバーURLとして登録する。
3. 認証方式の選択で「認証なし（No Authentication）」を選択する
   （本サーバーはBearer認証を行わないため、これ以外を選ぶと
   接続できません。上記の注意事項を参照）。
4. 接続後、`read_reflection`等のツールが一覧表示されることを
   確認する。

## 5. 実機確認（指示書15章）

最低限、以下を確認してください。

1. ChatGPTから`read_reflection`（`limit`指定）を呼び、Reflectionの
   一覧（空でもよい）が返ること。
2. 可能であれば`proposal_create`→（Ownerが内容を確認した上で）
   `proposal_approve`を呼び、実際に保存されることを確認する
   （`pnpm propose list-messages`等、既存CLIで保存結果を確認できる）。

## 6. トラブルシューティング

| 症状 | 原因・対処 |
|---|---|
| ツール呼び出しが接続エラーになる | `pnpm run api`（HTTP API）が起動していない、またはポートが競合している |
| ChatGPTから接続できない | トンネルが起動しているか、公開URLの末尾に`/mcp`が付いているか確認する（URLに余計な空白が入っていないかも確認） |
| 401 Unauthorizedが返る | 認証方式が「認証なし」になっているか確認する。本サーバーはBearer認証を行わないため、OAuth等を選ぶと接続できない（ADR 0044） |
| 接続後にツール一覧が空 | Remote MCPサーバーのログ（stderr）にエラーが出ていないか確認する |

検証が終わったら、トンネルを停止し、公開URLを他者に共有しないよう
注意してください。
