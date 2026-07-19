# Version37 Decision Packet — Cloud Activation手作業・無料枠・データ保管・rollback

Owner指示書（2026-07-20）の(f)「cloud activationに必要な手作業・
無料枠・データ保管・rollbackを1ページのDecision Packetへ整理する」
に対応する。`Version35_Decision_Packet.md`（Owner確認事項1〜3）を
差し替えるものではなく、Cloud Activation Gateに絞った追加の1枚。

## 前提：まだ何も契約・デプロイしていない

Version35〜37を通じて、クラウド契約・アカウント作成・課金・
秘密情報発行・本番/LAN公開は一切実施していない。ローカルMVP
（`pnpm mobile-ingress` + `pnpm mobile-sync`、fail-closed認証つき、
ADR 0066）のみが動作している。

## 1. Owner自身が行う必要がある手作業（Claude Codeは代行不可）

| 手順 | 内容 |
|---|---|
| 1 | Cloudflareアカウント作成（暫定第一候補、ADR 0062・0064） |
| 2 | `wrangler`でのログイン・`account_id`取得 |
| 3 | KV/D1 namespace作成（`cloudflare/wrangler.toml.example`参照） |
| 4 | `wrangler secret put`でMOBILE_INGRESS_API_TOKEN相当を設定 |
| 5 | `IngressRecordRepository`のCloudflare実装をClaude Codeが書いた後、`wrangler dev`でローカル動作確認 → `wrangler deploy`で初回デプロイ |

Claude Codeが実装できるのはコード（4を除く3・5の実装部分）のみ。
1・2・4はOwner本人のアカウント・秘密情報操作が必須。

## 2. 無料枠の目安（2026年7月時点の事前調査、契約内容は要最終確認）

Cloudflare Workers：10万リクエスト/日まで無料。個人の生活ログ用途
（1日数件〜数十件）であれば十分に収まる見込み。KV/D1にも無料枠が
あるが、書き込み回数の上限が読み取りより低いため、書き込み頻度が
増えた場合は要再確認（ADR 0062参照）。

## 3. データ保管地域

Cloudflareのregionを未確認。国内リージョン必須かどうかはOwner確認
事項（`Version35_Decision_Packet.md`確認事項2で既出、未回答）。

## 4. Rollback（撤退・戻し方）

- クラウド実装はローカル実装（`JsonFileIngressRecordRepository`）と
  並存させる設計にする——切替えは環境変数1つ（例：
  `INGRESS_REPOSITORY_BACKEND=local|cloudflare`）にする方針
  （実装時に確定）
- クラウド側に書き込んだデータは、Canonicalize前の`IngressRecord`
  （Transport層）のみ——Canonical Store（`data/reflections.json`等）
  はローカルのまま変更しない。クラウド側を止めても人生の記録
  そのものは失われない
- 万一クラウド側を廃止する場合、`wrangler delete`でWorker削除、
  KV/D1 namespaceは手動削除（Owner操作）

## 5. Owner確認が必要な事項（まとめ、急ぎ度: 低〜中）

`Version35_Decision_Packet.md`の確認事項1（16件の実体）は解決済み
（ADR 0067）。残るもの：

- 確認事項2：vendor確定・月額上限・data保管地域（本Packet1〜3章の
  情報を踏まえて判断可能）
- 確認事項3：`MOBILE_INGRESS_HOST`のLAN公開有効化可否
  （Version37でfail-closed化済み、ADR 0066——設定さえすれば
  有効化できる状態だが、実施はOwner確認後）

いずれも今すぐの回答を要さない。ローカルMVPは既に完成しており、
Program Bの価値（PC不在時の記録の受け皿）はクラウド化なしでも
一定程度実現されている。
