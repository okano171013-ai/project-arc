# Version35 Decision Packet — Owner確認事項

Version35（Program B Mobile Ingressローカルモデル）・Version36
（ローカルMVPの完成度向上）・Version37（セキュリティ強化・JSONL
Importer・Cloud Adapter境界）を通じて、Claude Codeが自律的に判断
できず、Ownerの決定が必要な事項のみを短くまとめたもの。確認事項1は
Version37で解決済み、確認事項3はVersion37で前提（認証）が変わった。
Cloud Activationの手作業・無料枠・rollbackは`docs/project-
management/Version37_Decision_Packet.md`（1枚、本Packetとは別）
にまとめた。詳細な設計根拠は`docs/reports/Version35_Report.md`〜
`Version37_Report.md`・対応する`docs/developer-feedback/`・
ADR 0064〜0068を参照。

**このPacketに書かれていないことは、すべてClaude Codeが判断済み・
実施済みで、Ownerの確認を待たずに進めてよい範囲**（設計・調査・
文書化・ローカル実装・無料で可逆なテスト）。

---

## 確認事項1：「現在退避中の16件」とは何か【Version37で解決】

Owner指示書（2026-07-20）で判明した：16件は実在し、Owner本人の
Codex workspaceに`project-arc-pending-life-logs-2026-07-20.jsonl`
として保管されている（公開GitHubには置かない方針）。取り込み形式・
重複防止規則をADR 0067として確定し、汎用Importer
（`pnpm import-pending-logs`）を実装・合成データでテスト済み。

- **残る作業**：実際の16件の取り込みは、Owner自身がファイルパスを
  指定して`pnpm import-pending-logs -- <path> --dry-run`で内容確認 →
  問題なければ`--dry-run`を外して本実行、という手順で行う
  （Claude Codeからは実データが見えないため代行不可）。
  MealLog/FinanceLog/Reflection/AppearanceLog等は取り込めるが、
  RewardSystem/BudgetRule/Wishlist等、対応するEntityが存在しない
  型は`unsupported_type`として報告されるのみで取り込まれない
  ——新しいEntityを設計するかはOwner/ARCの今後の判断（ADR 0067）。
- **急ぎ度**：低い。Ownerの都合の良いタイミングで実行してよい。

## 確認事項2：クラウドvendorの方向性

ADR 0064で無料枠優先のcloud比較を行ったが、**vendorは確定させて
いない**。Cloudflare Workers（Workers+KV/D1）を暫定候補として仮置き
したのみで、Supabase Edge Functions・Vercel Functionsも無料枠内では
候補になり得る。

- **今回の対応**：月額上限0円をデフォルトとし、ローカルMVPで
  Program Bの価値をまず実現した。クラウドは未使用・未契約。
- **Ownerに必要な確認**：
  1. ローカルMVP（PC起動時sync）の運用で当面十分か、それとも
     PC起動を待たずに使いたい（＝クラウドActivation Gateへ進む）か
  2. 進める場合、月額上限0円のままか、それとも少額の予算（例：
     数百円/月）を許容するか
  3. data保管地域（無料枠だと選択肢が制限される場合がある）に
     こだわりがあるか
- **急ぎ度**：低い。クラウド未使用のまま、ローカルMVPの完成度向上
  だけでもProgram Bの価値は積み上げられる（Version36の方針）。

## 確認事項3（Version37で更新）：スマホからの実送信にはLAN公開＋トークン設定が必要

Version36で、PCのブラウザから開けるQuick Capture送信フォーム
（`GET /`）を追加した。ただし現状は`127.0.0.1`限定のままのため、
**スマートフォン実機からはまだ送信できない**——スマホから届かせる
には`MOBILE_INGRESS_HOST`を`0.0.0.0`等へ変更する必要がある。

Owner指示書（2026-07-20）は「認証なしのLAN公開は承認しない」と
明確に却下した。Version37で、`MOBILE_INGRESS_HOST`を既定値以外へ
変更する場合`MOBILE_INGRESS_API_TOKEN`の設定を**構造的に必須化**
した（未設定だと起動時エラーで拒否、fail-closed、ADR 0066）。
rate limit・入力上限・監査ログも実装済み。

- **今回の対応**：認証機構自体は実装・テスト済み。実際に
  `MOBILE_INGRESS_HOST`を変更してLAN公開を有効化する判断はまだ
  していない。
- **Ownerに必要な確認**：(1) `MOBILE_INGRESS_HOST=0.0.0.0`（または
  実機のLAN IP）への変更、(2) `MOBILE_INGRESS_API_TOKEN`に設定する
  トークン文字列の決定（Owner自身が任意の値を選んでよい）。設定後、
  スマホのブラウザで`http://<PCのLAN IP>:3941/`を開き、Quick
  Capture UIのトークン欄に同じ値を入力すれば送信できる。手順は
  `.env.example`のコメント・`docs/security/
  remote-mcp-threat-model.md`10章参照。
- **急ぎ度**：中。スマホからの実送信を試すには必須だが、PCの
  ブラウザからの送信・`pnpm mobile-sync`の定期実行によるlocal反映
  自体はこの確認を待たずに機能する。

---

## 実施していないこと（明示的な禁止事項、確認）

- クラウド契約・アカウント作成
- 課金・費用発生を伴う操作
- 本番URLの公開
- 秘密情報（APIキー等）の新規発行・設定
- DevelopmentGrant本番発行・OAuth本番有効化（Program Bとは別件、
  従来通りOwner確認事項として保留中）

以上、いずれもVersion35〜37では一切実施していない
（`MOBILE_INGRESS_HOST`のLAN公開・`MOBILE_INGRESS_API_TOKEN`の
設定もコード上可能・必須化しただけで、実際に`.env`へ設定・有効化
してはいない。「16件」の実データもこのリポジトリには含めていない）。
