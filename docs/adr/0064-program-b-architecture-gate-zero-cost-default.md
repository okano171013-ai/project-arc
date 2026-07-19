# ADR 0064: Program B Architecture Gate — 無料枠優先・月額上限0円を初期既定とする

## ステータス

Proposed（Version35。ベンダー確定はArchitecture Gateの残り論点
（data保管地域・可用性への期待）確定後）

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- 安全ガイドライン（アカウント作成・外部サービスへの契約・費用発生を
  伴う判断はClaude Codeが代行できない）
- ADR 0062（Cloud Provider比較、本ADRが更新）・ADR 0059（Mobile
  Ingress設計）

## コンテキスト

Owner指示（2026-07-19）により、Program Bの最優先度が確定した。
ADR 0062は3カテゴリを比較したが選定を保留していた。今回、Ownerから
「無料枠を優先したcloud候補比較」「月額上限0円を初期既定とした
構成案」という具体的な制約が示されたため、この制約のもとで比較を
更新する。

**重要な制約**：Program Bの核心要求は「PCが停止中でも受信できる」
ことである。ADR 0062の3カテゴリのうち「home device」案が
Owner自身のメインPCを指すなら、PC停止中は当然そのhome deviceも
停止しており、要求を満たさない。したがって、月額上限0円を維持し
つつPC停止中の可用性を満たすには、**メインPC以外の常時稼働先**が
必要であり、現実的な選択肢はManaged Serverlessの無料枠のみに
絞られる。

## 決定

### 無料枠優先の比較（更新）

| | Cloudflare Workers + KV/D1 | Supabase Edge Functions | Vercel Functions |
|---|---|---|---|
| 無料枠（個人利用規模） | 10万リクエスト/日、KV 10万読み取り/日 | Edge Function 50万呼出/月、DB 500MB | Function 10万呼出/月（Hobby） |
| 無料枠超過時の挙動 | 既定でリクエスト拒否（自動課金なし、要確認） | 自動課金の可能性あり（要確認） | 自動課金の可能性あり（要確認） |
| 東京リージョン | あり（エッジ、レイテンシ低） | 選択可能 | 選択可能 |
| DBとの統合 | D1（SQLite互換）またはKV（key-value） | PostgreSQL標準搭載 | 外部DB必須（Vercel自体は非搭載） |
| vendor lock-in | 中（Workers独自API） | 低〜中（標準PostgreSQL、Edge Function部分は依存） | 低（Function自体は標準的） |
| 個人アカウントでの契約容易性 | クレジットカード登録なしで開始可能な無料プランあり（要最新確認） | 同上 | 同上 |

### 決定：月額上限0円を初期既定とする構成案

1. **初期MVP（Version35〜36）は完全ローカル**：実際のクラウド
   ベンダーには一切デプロイしない。Mobile Ingressのロジック
   （Domain・Application層、状態機械、idempotency）を、
   `127.0.0.1`限定のローカルHTTPサーバーとして実装し、実機で
   動作確認する。これは費用ゼロ・契約不要・秘密情報不要で、
   Owner確認を待たずに進められる（既存のADR 0058〜0063と同じ
   「安全な基盤」パターン）。
2. **本番デプロイ時の既定候補はCloudflare Workers**：無料枠の
   規模・実績・東京エッジの近さから、Program B実装のVersion32以降
   ADR 0042（HTTPS公開方式比較）でも既にCloudflare Tunnelが
   「恒久運用の推奨」だった実績があり、Workersも同一ベンダー内で
   完結できる。ただし**実際の契約・デプロイはOwner自身が実施**
   （Activation Gate）。
3. **費用上限の運用**：Cloudflareダッシュボードの使用量アラート
   （無料）を設定し、無料枠の80%到達で通知を受ける運用を、
   Activation Gateの手順書に含める（実装はOwnerのアカウント作成後）。

### Exit Strategy（ADR 0062から継続）

ADR 0062が定めた「標準形式でexport可能」「解約時にAccepted状態の
記録を確実に取り出せる」という条件は維持する。ローカルMVPの時点で
既にこの条件を型で担保する——`IngressRecord`（ADR 0065）は
JSON形式でRepositoryに保存され、`pnpm backup`（ADR 0058）の対象に
自動的に含まれる。

## 根拠

- 「PC停止中の可用性」という核心要求と「月額上限0円」という制約は、
  「メインPCへのhome device」案では両立しない——この矛盾を明示的に
  解消したことが、ADR 0062からの主要な更新点。
- ローカルMVPを先に作ることで、実際のベンダー選定・契約という
  Owner専権事項を待たずに、Mobile Ingressの設計・実装の大部分
  （状態機械、idempotency、conflict resolution）を検証できる
  ——ADR 0058（Data Durability）・Version33（Program A基盤）と同じ
  「まず安全な基盤を作り、外部公開は最後にする」パターン。

## Owner確認が必要な事項（Architecture Gate、本ADRの対象外）

- Cloudflare Workersを実際に選定するか（他候補との最終比較）
- data保管地域の希望（東京リージョン必須か）
- 可用性への期待（数分の遅延許容か、秒単位で確実か）
- 無料枠超過時に自動課金されるプランを避けたい場合、契約時に
  クレジットカード登録なしのプランを選べるかの最終確認

## 影響

- ADR 0062の「決定：現時点では選定しない」を、「ローカルMVPは
  即座に着手、本番ベンダーはCloudflare Workersを既定候補として
  Activation Gateで確定する」に更新する。
- Version35以降のMobile Ingress実装は、本ADRの「完全ローカル」
  制約に従う——実際のHTTPS公開・トンネル・ベンダーアカウントは
  一切扱わない。
