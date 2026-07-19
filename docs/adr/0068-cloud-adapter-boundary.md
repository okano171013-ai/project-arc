# ADR 0068: Cloud Adapter境界（provider-neutral）

## ステータス

Accepted

## 関連Principle・ADR

- Clean Architecture（依存方向は常にDomain/Applicationへ向かって内側）
- ADR 0059（Mobile Ingress as Transport vs Canonical Store）
- ADR 0062（Cloud Provider比較、選定は未確定）
- ADR 0064（Program B Architecture Gate、Zero-Cost Default）
- ADR 0065（Mobile Ingressデータ契約）

## コンテキスト

Owner指示書（2026-07-20）は、Version37の実装項目として「(d)
provider-neutralなCloud Adapter境界とCloudflareローカル開発用構成」
を求めた。同時に、cloud vendor（Cloudflare Workers等）は依然として
確定しておらず（ADR 0062・0064、契約・アカウント作成は禁止）、
実際のクラウド実装は行えない。

## 決定

### 1. 新しい抽象は導入しない——既存の`IngressRecordRepository`が既にprovider-neutralな境界である

`IngressRecordRepository`（`src/application/ports/
IngressRecordRepository.ts`、Version35・ADR 0065）は、
`save`/`findById`/`findByIdempotencyKey`/`findAll`/`findByStatus`
という5メソッドのみで構成されるApplication層のポートであり、
実装（`JsonFileIngressRecordRepository`）は現在ローカルJSONファイル
だが、Cloudflare Workers KV/D1・Supabase・その他providerを使う
将来の実装も**同じインターフェースを実装するだけで差し替え可能**
——これはClean Architectureの標準的なRepository patternそのもの
であり、新しい`CloudSyncProvider`のような並行する抽象を追加する
必要はない（追加すると同じ責務の抽象が重複し、Principle 9
（YAGNI）・「3行の重複は早すぎる抽象化より良い」という開発規約に
反する）。

将来Activation Gateでvendorが確定した際に必要になるのは：

1. `IngressRecordRepository`を実装する新しいAdapterクラス
   （例：`CloudflareKvIngressRecordRepository`）を`src/adapters/
   repositories/`へ追加する
2. `src/infrastructure/http/mobileIngress.ts`（またはCloudflare
   Workers向けの新しいエントリポイント）で、`JsonFileIngress
   RecordRepository`の代わりにこのAdapterを注入する

の2点のみ。Application/Domain層（`ReceiveIngressRecordUseCase`等）は
一切変更不要——これがVersion35時点でADR 0059・0065が既に設計して
いた「Transport/Canonical分離」の直接的な効果であり、本ADRは
その事実を明文化するに留める。

### 2. Cloudflareローカル開発用構成は「契約・実行を伴わない参照資料」として提供する

`cloudflare/`ディレクトリへ、実際にデプロイ・アカウント作成を
一切行わない前提の参照ファイルを追加した：

- `cloudflare/README.md`：状態（未デプロイ、参照専用）・Owner自身が
  今後アカウント作成する際の手順の見取り図
- `cloudflare/wrangler.toml.example`：D1/KV bindingの命名例。
  `.example`拡張子とし、`pnpm`のビルド・テストの対象には一切含めない
  （実行されない、ドキュメントとしてのみ存在する）

**実際のWorkerスクリプト（TypeScript実装）は今回書かない**——
実際のCloudflare Workersランタイム上で動作確認できない状態で
「動作する」ふりをしたコードを書くと、後で実際に着手する際に
誤った前提になりうるため（未実行検証を成功と書かない、という
プロジェクトの一貫した方針）。実装するタイミングは、Activation Gate
でvendorが確定し、Owner自身がCloudflareアカウントを作成した後と
する。

## 影響

- コード変更なし（既存の`IngressRecordRepository`の位置づけを
  明文化しただけ）。
- `cloudflare/`ディレクトリ追加（設定テンプレート・READMEのみ、
  ビルド・テスト対象外）。

## 見送った案

- **`CloudSyncProvider`のような新しい抽象の追加**：既存の
  `IngressRecordRepository`と責務が重複するため見送った。
- **実際のCloudflare Workersスクリプトの先行実装**：実行環境がなく
  動作確認できないコードを書くことは、プロジェクトの実機確認文化
  （`docs/HISTORY.md`）に反するため見送った。
