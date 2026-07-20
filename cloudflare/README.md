# Cloudflare Workers（ローカルエミュレータで検証済み、未デプロイ）

**このディレクトリの`.ts`ファイルは、ルートの`pnpm build`・
`pnpm test`・CIには含まれない**（別tsconfig・別vitest configで
独立して検証する、下記参照）。`wrangler`によるアカウント作成・
デプロイは一度も実行していない。

## 状態（Version38時点）

- Cloudflareアカウントは作成していない・`wrangler login`もしていない
- `wrangler dev`・`wrangler deploy`は一度も実行していない
- **実際のWorkerコード（`src/worker.ts`・
  `src/kvIngressRecordRepository.ts`）は実装済み**——`../../src/`の
  既存Application/Domain層（`ReceiveIngressRecordUseCase`・
  `ListIngressRecordsUseCase`・`IngressRecord`）をそのままimportして
  再利用している（ADR 0068「新しい抽象を追加しない」の実証）
- **Cloudflareの公式local emulator（Miniflare、実際の`workerd`
  ランタイムをローカルプロセスとして起動）で実機検証済み**
  ——アカウント・ログイン・ネットワークアクセス一切不要。
  `pnpm cloudflare:test`で実行できる（`src/worker.test.ts`、13件、
  全件合格）

## 検証方法

```
pnpm cloudflare:typecheck   # cloudflare/tsconfig.json（Workers型定義）でtsc --noEmit
pnpm cloudflare:test        # Miniflare上でworker.tsを実際に起動し、実HTTPリクエストで駆動
```

`worker.test.ts`はesbuildで`worker.ts`（と相対importする`../../src/`
以下のファイル）を単一のESMバンドルへ事前bundleし、Miniflareへ渡す。
`node:crypto`等の`node:`importはbundleに含めず外部化し、Workers
runtime自身の`nodejs_compat`機能（`wrangler.toml.example`の
`compatibility_flags`）に解決させる。

## 実装内容の要約（ADR 0069）

- 2種類のtoken（`DEVICE_TOKEN`：スマホ、`POST /ingress`・
  `GET /ingress?idempotencyKey=`のみ／`PULL_TOKEN`：OwnerのPC側
  `pnpm mobile-sync pull`専用、全件list・ack）による最小権限設計
- KVベースのrate limit（固定ウィンドウ、既知の限界：`get`+`put`が
  原子的でないため高並行下では不正確——個人利用規模では許容、
  真の正確性が必要ならDurable Objectsへの移行を検討）
- `POST /ingress/:id/ack`によるretention（ローカルpull成功後にcloud
  側のKVエントリを削除、cloud queueを肥大化させない）
- 監査ログは`console.log`（Cloudflare Workers Logs/dashboardで参照、
  ローカル版の`data/logs/*.log`ファイルとは異なる方式）

## Owner確認が必要な事項

`docs/project-management/Version37_Decision_Packet.md`・
`Version38_Activation_Packet.md`参照。vendor確定・月額上限・data
保管地域・実際のアカウント作成/デプロイの実行はいずれも未確定・
未実施。

## 実際にデプロイする際の見取り図（未実施、Owner確認後）

1. Owner自身がCloudflareアカウントを作成する（Claude Codeは代行
   できない）
2. `wrangler.toml.example`を`wrangler.toml`へリネームし、
   `account_id`・KV namespace idを設定する（`wrangler kv:namespace
   create`）
3. `wrangler secret put DEVICE_TOKEN`・`wrangler secret put
   PULL_TOKEN`で2つのtokenを設定する
4. `wrangler dev`で（今度は実CLI経由で）ローカル動作を再確認してから
   `wrangler deploy`する
5. ローカルの`.env`へ`CLOUD_INGRESS_URL`（deploy後に発行される
   `*.workers.dev`のURL）・`CLOUD_INGRESS_PULL_TOKEN`を設定し、
   `pnpm mobile-sync pull`で疎通確認する
