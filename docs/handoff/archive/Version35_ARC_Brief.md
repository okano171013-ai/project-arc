# Version35–36 ARC Brief

## Theme

Program B Mobile Ingressローカルモデル（日常ログ優先指示、2026-07-20）

## Goal

Ownerは優先順位を明確化した。最優先は、スマホからアーク（Project
ARC）の日常ログを参照・保存でき、PC停止中でも動作すること。完全
自動開発は第2優先とする。

Version34完了後、技術的負債の細部ではなくProgram Bを進めること。
まずVersion34の「576件中573件green（新規3件）」が全576件成功を
意味するか確認し、失敗・skip・未実行があれば解消または明記する。
ただし確認だけで停止しない。

Version35では、Program B Architecture Gate、無料枠優先のcloud候補
比較、月額上限0円を初期既定とした構成案、Mobile IngressのローカルMVP、
read/write/idempotency/待機/失敗のデータ契約、退避中16件を将来
取り込むimport形式、脅威モデル・ADR・テスト・Report・Developer
Feedback・STATUS・Roadmapを整備する。

クラウド契約・課金・本番公開・秘密情報設定は行わず、Owner判断事項を
短いDecision Packetに集約する。設計・調査・文書化・ローカル実装・
無料かつ可逆な検証は返答待ちで停止せず進める。Version35完了後は
同条件でVersion36のローカルMVP完成まで続行してよい。DevelopmentGrant
本番発行とOAuth本番有効化はOwner確認事項として保留する。

## Acceptance criteria

- テスト件数の表現（573件中573件 vs 576件中573件）を確認・解消する
- ADR 0064（Architecture Gate）・ADR 0065（Mobile Ingressデータ契約）
- Mobile Ingressの完全ローカルMVP（受信・sync・競合検出・解決）
- クラウド契約・課金・本番公開・秘密情報設定を一切実施しない
- Owner向け判断事項を1つのDecision Packetに集約する

## Result

テスト件数の表現は誤りで、実際は573件中573件全合格だったことを確認
（Version35着手前に解消）。ADR 0064（Architecture Gate、cloud比較、
$0/月既定）・ADR 0065（Mobile Ingressデータ契約）を策定し、
`IngressRecord` Entity・`pnpm mobile-ingress`（受信サーバー）・
`pnpm mobile-sync`（Sync Worker）の完全ローカルMVPを実装、実機で
受信→再送無視→sync→競合検出→Owner解決の一連を確認した
（Version35、commit `0b7db63`）。

Version36として、ブラウザから送信できるQuick Capture UI（`GET /`）と
PC起動中の自動sync（`ProjectARC-MobileSync`、15分間隔）を追加し、
ローカルMVPの完成度を上げた。スマホからの実送信に必要なLAN公開は
`MOBILE_INGRESS_HOST`環境変数のopt-inとして実装のみ済ませ、有効化は
Owner確認事項とした（Version36、commit `45bcba9`）。

「現在退避中の16件」は実体不明のため、リポジトリ全体を検索したが
発見できず、Owner確認事項として`docs/project-management/
Version35_Decision_Packet.md`へ集約した（取り込み経路自体はBridge
Layer経由で設計済み）。クラウドvendor選定（ADR 0064はCloudflare
Workersを暫定候補として仮置きのみ）も同Packetへ確認事項として記載。

クラウド契約・課金・本番公開・秘密情報設定はVersion35・36を通じて
一切実施していない。詳細は`docs/reports/Version35_Report.md`・
`docs/reports/Version36_Report.md`・`docs/project-management/
Version35_Decision_Packet.md`参照。
