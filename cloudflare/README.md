# Cloudflare Workers（参照専用、未デプロイ）

**このディレクトリのファイルは実行されない。** `pnpm build`・
`pnpm test`・CI等、いかなるビルド・テストパイプラインにも含まれない。
ADR 0064（Program B Architecture Gate、Zero-Cost Default）・
ADR 0068（Cloud Adapter境界）に基づく参照資料のみを置く。

## 状態

- Cloudflareアカウントは作成していない
- `wrangler`によるデプロイは一度も実行していない
- 実際のWorkerスクリプト（TypeScript実装）はまだ書いていない
  （ADR 0068「未実行検証を成功と書かない」方針）

## Owner確認が必要な事項

`docs/project-management/Version35_Decision_Packet.md`参照。
vendor（Cloudflare Workers＋D1/KVを暫定候補として比較したのみ、
ADR 0062・0064）・月額上限・data保管地域が確定していない。

## 実際に着手する際の見取り図（未実施）

1. Owner自身がCloudflareアカウントを作成する（Claude Codeは代行
   できない）
2. `wrangler.toml.example`を`wrangler.toml`へリネームし、実際の
   binding名・account_idを設定する
3. `IngressRecordRepository`（`src/application/ports/
   IngressRecordRepository.ts`）を実装する
   `CloudflareKvIngressRecordRepository`（または D1版）を
   `src/adapters/repositories/`へ新規作成する——Application/Domain層
   の変更は不要（ADR 0068）
4. Mobile Ingress用のWorkerエントリポイントを新規作成し、
   `ReceiveIngressRecordUseCase`等の既存UseCaseをそのまま呼び出す
5. `wrangler dev`でローカルemulator（Miniflare）上での動作確認から
   始め、実デプロイ（`wrangler deploy`）はOwner確認後に行う

## なぜコードを書かなかったか

Cloudflare Workersランタイム上で実際に動作確認できない状態で
「動作する」ふりをしたコードを書くと、後で着手する際に誤った前提
になりうる。ADR 0068参照。
