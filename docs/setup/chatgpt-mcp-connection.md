# ChatGPTとの接続方法（Remote MCP）

Project ARC Version18で追加したRemote MCPサーバーを使い、
ChatGPT（Developer Mode）からProject ARCへ直接接続するための手順です。
トンネルサービスへの登録・ChatGPT側の接続操作はOwner自身の作業が
必要です（Claude Codeはアカウント作成・外部サービスへの契約を
代行できません）。

**重要な前提**：ChatGPT Developer Modeのネイティブな接続方式は
OAuth 2.0/2.1または「認証なし」であり、静的なBearer API Keyを
UI上に直接入力する仕組みはありません（ADR 0041）。本サーバーは
簡易Bearer認証のみを実装しているため、ChatGPT側のUIにAPI Key入力欄が
ない場合は「認証なし」モードでの接続検証が現実的な選択肢になります
——この場合、公開URLを知る誰でもアクセスできる状態になるため、
公開URLの取り扱いには十分注意してください（検証後はトンネルを
必ず停止する等）。

---

## 1. 起動順

Remote MCPサーバーは単体では動作しません。以下の順に起動してください。

1. **ARC Connector HTTP API**（`pnpm run api`）— Remote MCP・stdio MCP
   どちらもこのAPIを経由してProject ARCのデータへアクセスします。
2. **Remote MCPサーバー**（`pnpm run mcp:remote`）— `.env`の
   `ARC_API_KEY`が未設定だと起動時にエラーで終了します（安全側の
   デフォルト、ADR 0041）。既定では`http://127.0.0.1:3940/mcp`で
   待ち受けます。
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
3. 認証方式の選択で、Bearer API Keyの入力欄がある場合は
   `ARC_API_KEY`の値を入力する。ない場合は「認証なし」を選択する
   （上記の注意事項を参照）。
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
| `pnpm run mcp:remote`が起動直後にエラー終了する | `.env`に`ARC_API_KEY`が設定されていない。設定して再実行する |
| ツール呼び出しが接続エラーになる | `pnpm run api`（HTTP API）が起動していない、またはポートが競合している |
| ChatGPTから接続できない | トンネルが起動しているか、公開URLの末尾に`/mcp`が付いているか確認する |
| 401 Unauthorizedが返る | `ARC_API_KEY`の値がChatGPT側の設定と一致しているか確認する。UIにAPI Key欄がない場合は「認証なし」モードを試す |
| 接続後にツール一覧が空 | Remote MCPサーバーのログ（stderr）にエラーが出ていないか確認する |

検証が終わったら、トンネルを停止し、公開URLを他者に共有しないよう
注意してください。
