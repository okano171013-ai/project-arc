# Developer Feedback — Version35

## メタデータ

- Version / 日付: Version35 / 2026-07-19
- 担当エンジン: Claude Code
- Git commit / tag: `0b7db63`
- 対応Issue / 関連Report: Program B Mobile Ingressローカルモデル / `docs/reports/Version35_Report.md`
- 状態: Complete（ローカル安全範囲）

## 1. 目的

Owner優先順位（2026-07-19）に従い、Program B（Mobile Daily
Capture）を最優先で進める。PCが停止していてもスマホから生活ログを
受け取れる仕組みを、クラウド契約・課金なしのローカルMVPとして
実装し、Architecture Gateの論点（vendor比較・cost上限）を整理する。

## 2. 実装

- 追加：`IngressRecord`Entity・5 UseCase（受信/sync/解決/retry/一覧）・
  Repository・`pnpm mobile-ingress`（受信サーバー）・
  `pnpm mobile-sync`（Sync Worker CLI）
- 追加：Bridge Layer拡張（MealLog/NutritionLog/WeightLog/
  FinanceLog/StudySessionのImport/Export対応、Version9〜27間の
  ギャップ解消）
- Before：スマホで気づいた出来事はPCを開くまで記録できなかった。
  Program Bの実装はArchitecture Gate（cloud候補・cost上限のOwner
  確認）待ちのまま止まっていた。
- After：スマホ→ローカル受信サーバー→PC起動時sync→既存Canonical
  Store、という一連が実機で動作する。クラウド未使用のため$0/月。

## 3. 設計判断

- **採用案**：クラウドvendorを今すぐ確定させず、まず完全ローカルの
  MVPを作る（ADR 0064）。理由：「PC停止中の可用性」と「$0コスト」を
  自宅デバイスで両立させることは原理的に不可能なため、この矛盾を
  Owner確認なしに技術で誤魔化さない。
- **採用案**：`IngressRecord`の`payloadType`は新しい型を作らず既存
  `BridgeLogType`を再利用する（ADR 0065）。理由：Canonicalize処理を
  既存`ImportLogsUseCase`へそのまま委譲でき、「16件」のような将来の
  未知形式にも同じ経路で対応できる拡張性を優先した。
- **採用案**：競合検出は事前チェック（`findByDate`等）方式とし、
  UseCase内でのエラー文字列パターンマッチは使わない（ADR 0065）。
  理由：エラーメッセージの文言変更に対して壊れやすい実装を避けた。
- **見送り案**：Cloudflare Workers等へ即デプロイする案は、Owner
  指示の明示的な禁止（クラウド契約・課金・本番公開の禁止）により
  見送った。

## 4. 理由

Domain層のPublic API（新規Entity`IngressRecord`）追加に該当するため
ADR必須（DEVELOPMENT_RULES.md）。ADR 0065として先に設計を固めてから
実装した。Architecture Gateという新しい判断領域（vendor選定基準）も
ADR 0064として独立文書化した——後から見直す際に実装コードではなく
ADRを見れば判断根拠が分かるようにするため。

## 5. 副作用

- 互換性：既存Bridge Layer（Reflection等10型）は無変更のまま5型
  追加のみ。既存の`ImportLogsUseCase`/`ExportLogsUseCase`呼び出し元
  （`server.ts`・`cli/bridge.ts`）はコンストラクタ引数が増えたため
  修正が必要だった（3章のcascading breakageとして7章に詳細なし・
  Report7章参照）。
- セキュリティ：Mobile Ingress受信サーバーは`127.0.0.1`限定で外部
  公開なし。認証は未実装（脅威モデル8章、ローカル限定のため許容と
  判断）。
- 運用：新しいJSON file（`data/ingress-records.json`）が増える——
  Version31のbackup機構（ファイルレベルで汎用）が自動的にこれも
  カバーすることを実機で確認した（追加対応不要）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：**602件合格（602件中602件、失敗・skip・pendingなし）**
  （Version34時点573件 + 29件新規）
- 実機確認：受信→再送無視→sync→競合検出→Owner解決
  （accept/discard）→backup自動対象化、の一連をコマンドラインから
  実際に動かして確認した（Report6章）。

## 7. 未解決

- ARC-PM-014（新規）：「現在退避中の16件」の実体不明。9章参照。
- Mobile Ingressの定期sync自動化は未実装（手動`pnpm mobile-sync`の
  み）。
- クラウドActivation Gate（vendor確定・実デプロイ）はOwner確認事項
  待ちのまま。

## 8. 次Version

1. Version36として、Mobile Ingressローカルモデルの完成度を上げる
   （sync自動化、resolve accept対象のpayloadType拡張等）
   （依存：なし、Owner指示により着手可能）
2. 「16件」の実体判明後の取り込み（依存：Owner確認）
3. クラウドActivation Gate（依存：Owner確認、`Version35_Decision_
   Packet.md`参照）

## 9. Owner確認事項

- **「現在退避中の16件」とは具体的に何を指すか**：Owner指示に
  あったが、リポジトリ内を検索しても該当データ・形式仕様が見つから
  なかった。取り込み経路（Bridge Layer経由）は設計済みのため、
  実体（ファイル・形式・保管場所）が分かればVersion36以降で追加
  設計なしに対応できる見込み。
- **クラウドvendorの方向性確認**：ADR 0064はCloudflare Workersを
  暫定候補として仮置きしたのみで確定していない。Activation Gateへ
  進める際は、vendor・cost上限（初期既定$0/月の見直し要否）・data
  保管地域についてOwner確認が必要。
- 上記2点は`docs/project-management/Version35_Decision_Packet.md`
  にも集約した。いずれも今すぐの返答を必要とせず、ローカルMVPの
  完成度向上（Version36）は並行して継続できる。

## 10. 関連ADR

- 新規：ADR 0064（Program B Architecture Gate、Zero-Cost Default）
- 新規：ADR 0065（Mobile Ingressデータ契約）
- 参照：ADR 0059（Mobile Ingress as Transport vs Canonical Store、
  Version31）——今回のMVPで初めて実装により裏付けられた

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録した（`0b7db63`）
- [x] 未実行テストを成功扱いしていない（602件全件実行・全件合格を実機で確認）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章に明記、Decision Packetへも集約）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
