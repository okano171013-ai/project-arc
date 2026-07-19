# ADR 0062: Cloud Provider, Cost Ceiling and Exit Strategy（比較・推奨のみ）

## ステータス

Proposed（比較・推奨のみ。実際の選定・契約はOwner判断待ち、
Architecture Gate）

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- 安全ガイドライン（アカウント作成・外部サービスへの契約・費用発生を
  伴う判断はClaude Codeが代行できない）
- ADR 0042（HTTPS公開方式比較、本ADRと同じ「比較のみ・契約はOwner」
  の型を踏襲）・ADR 0059（Mobile Ingress設計）

## コンテキスト

Program B（Mobile Daily Capture）は、PC停止中でも記録を受け付ける
常時稼働のMobile Ingress（ADR 0059）を必要とする。
`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`
Program Bの「Technology選定条件」に基づき、候補を比較する。**いずれの
選択肢も費用発生・アカウント契約を伴うため、実際の選定・契約は
Claude Codeでは行わず、Architecture GateでOwner自身が判断する。**
本ADRは判断材料の提示のみを目的とする。

## 比較（事前調査に基づく、2026年7月時点）

| | Managed Serverless（Cloudflare Workers + D1/KV、Supabase Edge Functions等） | 専用VPS（さくらVPS、Vultr等） | 常時稼働home device（既存PC or 追加の小型機） |
|---|---|---|---|
| 月額（低trafficな個人利用想定） | 無料枠内に収まる可能性が高い（Cloudflare Workersは10万req/日無料等） | 月額500〜1500円程度が下限 | 0円（電気代のみ）だが、Version20の教訓通り常時稼働運用の手間がかかる |
| cold start | あり（数百ms、serverless特性） | なし（常時起動プロセス） | なし |
| availability | provider依存（SLA有） | 自己管理（自分で監視が必要） | 自宅回線・電源に依存、最も不安定 |
| data residency | provider次第（東京リージョン選択可否を要確認） | 契約時に選択可能 | 自宅（国内、完全に制御可能） |
| vendor lock-in | 中〜高（Workers独自API等に依存しうる） | 低（標準的なLinux VPS） | 無し |
| secret管理 | providerの secret store機能を利用可能 | 自前で`.env`等を管理 | 自前で`.env`等を管理（既存の運用と同じ） |
| 監視負荷 | provider側でuptime監視が一部提供される | 自己管理 | 自己管理（Version20 Runner Control Planeの経験が使える） |
| free tier終了時の挙動 | 要確認——providerによっては無料枠超過で自動課金、または停止 | 契約プランなので発生しない（最初から有料） | 該当なし |

## 決定

**現時点では選定しない。** Architecture GateでOwnerが以下を確認して
から、本ADRを更新し正式に選定する。

### Owner確認が必要な事項（Architecture Gate）

1. **月額上限**：0円運用（home device）を選ぶか、少額（例：月
   1,000円程度まで）のmanaged serverlessを許容するか
2. **data保管地域**：国内リージョン必須か
3. **可用性への期待**：「PC停止中でも数分の遅延は許容する」のか
   「秒単位で確実に受信されてほしい」のか——後者ほどmanaged
   serverlessが有利
4. **free tier終了時の挙動を許容できるか**：無料枠を超えた場合に
   自動課金されると困るなら、課金上限（budget alert / hard cap）を
   provider側で設定できることが前提条件になる

### Exit Strategy（撤退・移行のしやすさ、選定前に確認する共通条件）

どの選択肢を選ぶ場合も、以下を契約前提条件とする。

- 保存データを標準形式（JSON）でexportできること
  （vendor固有のバイナリ形式に依存しない）
- 解約・停止時に、蓄積されたAccepted状態の記録（ADR 0059の
  Transport層データ）を確実に取り出せること
- 別のproviderへの切り替えが、Sync Worker側（ADR 0059の
  Canonicalize処理）の実装を書き換えるだけで完結し、local
  canonical storeのデータ形式に影響しないこと（ADR 0059の
  「TransportとCanonical Storeを区別する」設計が、この切り替え
  容易性を構造的に担保する）

## 根拠

- ADR 0042が既に確立した「比較・推奨はClaude Codeが行うが、
  契約行為はOwnerに委ねる」という型を、より高額・継続的な費用を
  伴う判断へ一貫して適用した。
- 3カテゴリの比較軸を、Program B文書が要求した「月額・従量cost、
  data residency、暗号化・backup・export容易性、cold start・
  availability・vendor lock-in、auth実装・secret管理・監視負荷、
  free tier終了時の挙動」にそのまま対応させた。

## 影響

- 本ADRはコード変更を伴わない。
- Architecture Gate完了後、選定結果を本ADRの改訂として記録し、
  実装（Sync Worker・Ingress）に着手する。
