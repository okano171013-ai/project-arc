# Version38 Activation Packet — Cloud Mobile Ingress 実行チェックリスト

Owner指示書（2026-07-20）の(f)「後日Ownerが5分以内に判断・実行できる
1ページのActivation Packet」に対応する。**このPacketに書かれた操作は
まだ何一つ実行していない**——実装・ローカルエミュレータ検証のみ
完了している（Version38 Report・ADR 0069、Version39 Report・
ADR 0070参照）。実行するかどうかはOwnerの判断。

**Version39追記**：Version39でCloud側`GET /`にQuick Capture UI
（Reflection/MealLog/NutritionLog/WeightLog/FinanceLog明示選択）を
実装した。以下の手順1〜8を実行してデプロイすれば、追加設定なしで
そのままスマホのブラウザから使える（8番目の手順「疎通確認」を
Quick Capture UIでの実送信に置き換えてよい）。ただし、これは
(a) cloud ingress受付のみを満たすものであり、「PC-off対応完了」を
意味しない——(b) canonical ARC確定・(c) 全生活履歴read availability
は引き続きPC起動時の`pnpm mobile-sync pull`+`sync`が前提のまま
である（ADR 0070のCapability/Gap表参照）。

## 前提：ここまでで準備済みのもの

- `cloudflare/src/worker.ts`・`kvIngressRecordRepository.ts`：
  Cloudflare Workers実装済み、Miniflareで実機検証済み（14件合格）
- `pnpm mobile-sync pull`：cloud queueをローカルへ引き下ろすCLI、
  実装・テスト済み
- 2種類のtoken設計（DEVICE_TOKEN / PULL_TOKEN）済み

## 実行手順（Owner自身、想定5分）

| # | 操作 | コマンド／場所 | 費用 |
|---|---|---|---|
| 1 | Cloudflareアカウント作成 | https://dash.cloudflare.com/sign-up | 無料 |
| 2 | wrangler CLIログイン | `npx wrangler login`（ブラウザでOAuth） | 無料 |
| 3 | KV namespace作成 | `npx wrangler kv:namespace create INGRESS_RECORDS` | 無料枠内 |
| 4 | `cloudflare/wrangler.toml.example`を`wrangler.toml`にリネームし、3で発行されたidと`account_id`を記入 | 手動編集 | - |
| 5 | 2つのtokenを生成・設定（任意の長いランダム文字列、例：`openssl rand -hex 32`） | `npx wrangler secret put DEVICE_TOKEN`<br>`npx wrangler secret put PULL_TOKEN` | 無料 |
| 6 | デプロイ | `cd cloudflare && npx wrangler deploy` | 無料枠内（10万req/日） |
| 7 | 発行された`*.workers.dev`のURLをローカル`.env`へ設定 | `CLOUD_INGRESS_URL=https://xxx.workers.dev`<br>`CLOUD_INGRESS_PULL_TOKEN=<手順5のPULL_TOKEN>` | - |
| 8 | 疎通確認 | `pnpm mobile-sync pull`（0件でもエラーにならなければ疎通OK） | - |

## 必要アカウント・秘密情報（まとめ）

- Cloudflareアカウント（無料）
- `DEVICE_TOKEN`・`PULL_TOKEN`（Owner自身が生成する共有シークレット、
  外部サービスへの登録は不要）

## ChatGPT接続について

Mobile Ingress（本Packet）はChatGPT/Remote MCPとは別系統
——ChatGPT接続（Remote MCP OAuth本番有効化）は`docs/setup/
remote-mcp-oauth-migration.md`の既存手順が対象で、本Packetの範囲外。

## 想定費用

Cloudflare Workers無料枠：10万リクエスト/日、KV読み取り10万/日・
書き込み1,000/日。個人の生活ログ用途（1日数十件程度）であれば
無料枠内に収まる見込み（ADR 0062参照、要最終確認）。**継続的に
無料枠内であることをOwner自身が定期的に確認することを推奨**
——Cloudflare側の料金プランは今後変更されうる。

## Rollback（撤退・戻し方）

- Workerを止める：`npx wrangler delete`（cloudflareダッシュボードでも可）
- ローカル`.env`の`CLOUD_INGRESS_URL`を空にすれば`pnpm mobile-sync
  pull`は即座に「未設定」エラーへ戻る（コード変更不要）
- Canonical Store（`data/reflections.json`等）はローカルのままの
  ため、Worker削除によるデータ損失はない——cloud側はTransportのみ

## 実行後に確認すべきこと（Owner自身）

- `pnpm mobile-sync pull`が実際にcloud側のレコードを取得できるか
- スマホのブラウザから`https://xxx.workers.dev/`を開くと、
  Version39で実装したQuick Capture UI（Reflection/MealLog/
  NutritionLog/WeightLog/FinanceLog明示選択）がそのまま使える
  （Miniflareで実機検証済み）。初回はtoken欄が空欄なので、
  `DEVICE_TOKEN`（手順5で生成した値）を毎回手入力するか、
  明示的にopt-inした場合のみこの端末に保存できる（既定は非永続）
- 送信後、画面に自動でsubmission statusが表示されることを確認する
