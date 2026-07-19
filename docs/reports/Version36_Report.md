# Version36 Report: Mobile Ingressローカルモデルの完成度向上

commit: `45bcba9`

## 1. Version概要

Version35で実装したMobile Ingressローカルモデル（受信サーバー・
Sync Worker）に対し、Owner指示（「同じ条件でVersion36のローカルMVP
完成まで進めてよい」）に従って残っていた2つの空白を埋めた。(1)
PC起動中の自動sync（従来は手動`pnpm mobile-sync`のみ）、(2)実際に
送信できるクライアント（従来は`curl`等での手動POSTのみ、Version35
Report10章で明示した空白）。あわせてスマートフォン実機からの送信に
必要なLAN公開をopt-inで実装可能にしたが、**有効化はOwner確認事項
として保留**した。クラウド契約・課金・本番公開・秘密情報設定は
一切実施していない。

## 2. 今回実装した機能（理由も含めて説明）

- **Quick Capture HTML UI**（`GET /`、`mobileIngress.ts`）：ブラウザ
  から開けるReflection送信フォーム。外部JS依存なし、`fetch`のみで
  既存`POST /ingress`を呼ぶ薄いUI。新しい書き込み経路は追加して
  いない——既存APIのクライアントを1つ追加しただけ。
- **`MOBILE_INGRESS_HOST`環境変数**（`env.ts`、既定`127.0.0.1`）：
  `ARC_API_KEY`・`MCP_OAUTH_ENABLED`と同じopt-in設計方針を踏襲し、
  Owner自身が明示的に`.env`を変更しない限りVersion35と全く同じ
  公開範囲を維持する。スマホからの実送信に必要なLAN bindを、
  コード変更なしで有効化できる状態にした（実際の有効化はOwner
  確認事項、10章参照）。
- **sync自動化**（`scripts/start-all.ps1`・`stop-all.ps1`・
  `register-scheduled-tasks.ps1`）：既存のCollaboration Runner・
  CheckIn Prompterと同型のパターンで、Mobile Ingress受信サーバーの
  自動起動（`start-all.ps1`）と、`pnpm mobile-sync`の15分間隔定期
  実行（`ProjectARC-MobileSync`タスク）を追加した。
- **`MOBILE_INGRESS_PORT`/`HOST`のzodスキーマ化**：既存の
  `process.env`直接参照ではなく、`env.ts`の`loadEnv()`経由に統一
  した——`.env`ファイルからの読み込み（`dotenv`）が効いていなかった
  実装漏れをこの過程で発見・修正した（7章）。

## 3. 実装しなかった機能（延期理由も記載）

- **`MOBILE_INGRESS_HOST`の実際の有効化**：Owner確認事項として
  `Version35_Decision_Packet.md`（確認事項3）に集約し、Claude Code
  からは`.env`を変更していない。認証なしのままLAN内の他デバイスが
  到達可能になる変更のため、Owner自身の判断を待つ。
- **`resolve accept`の対象payloadType拡張**（Reflection以外）：
  Version35 Reportで次点候補として挙げたが、他のpayloadType
  （MealLog等）は現状の`SyncIngressRecords`が競合検出自体を実装して
  おらず（Reflectionのみ`findByDate`で事前チェック）、`Pending`に
  なる経路が存在しない。拡張の必要性が実際に生じてから設計する
  （YAGNI）。
- **Quick Capture UIでのReflection以外のpayloadType送信**：フォーム
  はReflectionのみに絞った。他の生活ログ種別への対応は、実際の
  利用状況を見てから追加する。

## 4. Architecture Review

- 変更：`src/infrastructure/http/mobileIngress.ts`（`GET /`ルート・
  `QUICK_CAPTURE_HTML`定数追加、`loadEnv()`経由への切り替え）
- 変更：`src/infrastructure/config/env.ts`（`MOBILE_INGRESS_PORT`・
  `MOBILE_INGRESS_HOST`をzodスキーマへ追加）
- 変更：`.env.example`（新規2変数のコメント付き追記）
- 変更：`scripts/start-all.ps1`・`stop-all.ps1`・
  `register-scheduled-tasks.ps1`（Mobile Ingress起動・停止・
  `ProjectARC-MobileSync`定期タスク追加）
- Domain/Application層は無変更——Version36はInfrastructure層の
  配線とUIのみ。

## 5. ADR

新規なし。ADR 0064・0065の設計（Transport/Canonical分離、opt-in
公開方針）の範囲内での実装のため、新しい設計判断を伴わない。

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**603件合格（603件中603件、失敗・skip・pendingなし）**
  （Version35時点602件 + 1件新規：`GET /`のHTMLレスポンステスト）
- **実機確認（ヘッドレスブラウザ）**：プロジェクトの依存関係には
  追加せず、環境にグローバルインストール済みのPlaywright
  （`/opt/node22/lib/node_modules/playwright`）を一時スクリプトから
  呼び出し、実際のChromiumでQuick Capture フォームを開く→
  入力→送信→`#status.ok`表示→`GET /ingress`で反映確認、の一連を
  実行した。検証用スクリプト・データディレクトリは確認後に削除済み
  （対話式CLI検証と同じ「都度作成・確認後削除」の運用、CLAUDE.md
  参照）。
- **`.env`読み込みの実機確認**：`loadEnv()`経由への切り替え後、
  実際にサーバーを起動し`POST /ingress`が正常応答することを確認
  （dotenv経由の設定読み込みが機能することの回帰確認）。
- PowerShellスクリプトの変更（`start-all.ps1`等）はLinux環境のため
  実行不能——Version20・26と同じ制約。構文レベルでの確認のみ
  （既存パターンとの構造比較）に留め、実際のタスク登録・動作確認は
  Owner自身がWindows機で行う。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

- **`MOBILE_INGRESS_PORT`/`HOST`が`.env`から読み込まれない実装漏れ**：
  実装直後は`process.env.MOBILE_INGRESS_PORT`を直接参照していたが、
  プロジェクトの他の全エントリポイント（`server.ts`・
  `remoteServer.ts`）が`dotenv`経由で`.env`を読み込む`loadEnv()`を
  必ず呼んでいることに気づき、自分の実装がこのパターンから外れて
  いることを実装中に発見した（実機確認で問題が起きる前に、既存
  コードとの一貫性チェックで検出）。`env.ts`のzodスキーマへ2変数を
  追加し、`loadEnv()`経由に統一して修正した。これにより`.env`で
  設定しない限り常に安全な既定値（`127.0.0.1`）になることも
  型レベルで保証された。

## 8. 技術的負債（今後改善したい点）

- `resolve accept`がReflectionのみ対応（3章）。他payloadTypeの
  競合検出は未設計のまま。
- PowerShellスクリプトの変更はLinux環境で実行確認できないという
  制約が今回も残った（Version20以来の既知の制約、実害は限定的
  ——Owner自身が最終確認する運用が既に確立している）。
- 既存の技術的負債（ARC-PM-005〜014）はVersion36のスコープ外の
  まま。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner確認事項3（`MOBILE_INGRESS_HOST`の有効化）の回答を受けて、
  実際にスマートフォンから接続できるかを実地確認する。
- Owner確認事項1（16件の実体）・2（クラウドvendor方向性）は
  引き続き保留のまま。
- `ProjectARC-MobileSync`タスクの実登録・動作確認はOwner自身が
  Windows機で行う必要がある（`register-scheduled-tasks.ps1`実行）。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- Quick Capture UIはReflectionのみに絞ったことで実装は小さく保てた
  一方、実際に「日常ログを送る」体験としては物足りない可能性がある
  ——食事・体重等も送りたくなった時点で、フォームの拡張を検討したい。
- LAN公開のopt-in化は「安全側のデフォルトを保ったまま、Owner確認
  後すぐに使える状態」を両立できたと考えている。Owner確認が下りれば
  `.env`の2行変更だけで実際にスマホから使い始められる。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version35で「受け皿は完成したが送る側がない」と明記した空白を、
過剰な実装（ネイティブアプリ等）に頼らず、既存の技術スタック
（素のHTML+fetch）だけで最小限に埋められたのが今回の成果。
LAN公開という一段階リスクの高い変更を、既存のopt-in設計規約
（`ARC_API_KEY`等）にそのまま従わせることで、実装のブレなく
Owner確認へ橋渡しできた。

## 12. ARCへの引き継ぎ（Owner追加指示、2026年7月）

- **新しい資産**：ブラウザから開けるQuick Capture送信フォーム
  （PCから`http://127.0.0.1:3941/`）。ARCから直接は使えない
  （ローカルツールのため）が、Ownerの日常的な入力導線として案内
  できる。
- **新しいルール**：新しい公開範囲の拡張（LAN公開等）は、既存の
  `ARC_API_KEY`・`MCP_OAUTH_ENABLED`と同じ「既定は最も閉じた状態、
  Owner明示変更のみでopt-in」という設計規約に必ず従う、という
  パターンが今回また確認された。
- **新しい思想**：「完全ローカル」という制約は、機能を作らない
  理由にはならず、むしろどこまでを安全な既定値としてコード化し、
  どこからをOwner判断に委ねるかの境界線を明確に引く設計原則として
  機能した。
- **Ownerについて分かったこと**：「Version35完了後は同じ条件で
  Version36まで続行してよい」という先渡しの許可を与えることで、
  節目ごとの確認往復を減らしつつ、真にOwner判断が必要な点
  （LAN公開の可否）は個別に切り分けて聞く、という運用が機能する
  ことが確認できた。

## 13. Product Review（Owner追加指示、2026年7月）

- **ユーザー体験で改善されたこと**：Before：Mobile Ingressへの送信は
  `curl`等のコマンドラインでしかできなかった。After：ブラウザで
  フォームを開いて入力するだけで送信できる（現状はPCのブラウザから
  のみ、スマホからはOwner確認後）。
- **毎日使う理由**：PC起動中の自動sync（15分間隔）により、
  `pnpm mobile-sync`を手動実行する必要がなくなった——「送ったら
  勝手に反映される」という日常的な使用感に近づいた。
- **懸念**：スマホからの実送信はまだ試せていない（LAN公開が
  Owner確認待ちのため）。実際に「PC不在時に送って、後で反映される」
  という核心体験の実地検証はまだ済んでいない。
- **次Versionで最も価値が高い改善**：Owner確認事項3の回答を得て、
  実際にスマホから1回送信してみること——これができて初めて
  Program Bの核心的な価値（PC不在時の記録）が実証される。

## 14. 10年後のProject ARCへの貢献（Owner追加指示、2026年7月、Version9より）

opt-inによる露出範囲の段階的拡大という設計パターンが、Version15
（`ARC_API_KEY`）・Version22（`MCP_OAUTH_ENABLED`）・Version36
（`MOBILE_INGRESS_HOST`）の3回にわたって一貫して適用されたことが、
10年後も効いてくると考える。新しい公開面を追加するたびにこの
パターンへ従うだけで、「デフォルトで安全、必要な時だけ露出を
広げる」という原則を毎回ゼロから設計し直さずに済む。

「人生OS」というVisionから逆算すると、今Versionは接続点
（Version35）を実際に使える形に仕上げる磨き込みの石だった。
派手な新機能ではなく、「受け皿はあるが送る手段がない」という
具体的な空白を1つ埋めたことが、次のOwner確認（LAN公開）を経て
実際の日常利用へつながる最後の一段になる。
