# Version35 Decision Packet — Owner確認事項

Version35（Program B Mobile Ingressローカルモデル）の中で、
Claude Codeが自律的に判断できず、Ownerの決定が必要な事項のみを
短くまとめたもの。詳細な設計根拠は`docs/reports/Version35_Report.md`・
`docs/developer-feedback/Version35_Developer_Feedback.md`・
ADR 0064・0065を参照。

**このPacketに書かれていないことは、すべてClaude Codeが判断済み・
実施済みで、Ownerの確認を待たずに進めてよい範囲**（設計・調査・
文書化・ローカル実装・無料で可逆なテスト）。

---

## 確認事項1：「現在退避中の16件」とは何か

Owner指示に「現在退避中の16件を将来取り込めるimport形式の設計」と
あったが、リポジトリ内（コード・docs・data）を検索しても該当する
データ本体・件数の根拠・形式仕様を発見できなかった。

- **今回の対応**：取り込み経路自体は設計済み（Mobile Ingressの
  `payloadType`は既存Bridge Layerの型を再利用するため、新形式でも
  追加設計なしで対応できる）。実体だけが不明。
- **Ownerに必要な確認**：16件がどこにある・どんな形式の・何の
  データなのか（例：スマホのメモ、別アプリのエクスポート、紙の
  メモ等）を教えてもらえれば、Version36以降で具体的な取り込みを
  設計する。
- **急ぎ度**：低い。判明するまでMobile Ingressのローカル完成度向上
  （Version36）は並行して進められる。

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

---

## 実施していないこと（明示的な禁止事項、確認）

- クラウド契約・アカウント作成
- 課金・費用発生を伴う操作
- 本番URLの公開
- 秘密情報（APIキー等）の新規発行・設定
- DevelopmentGrant本番発行・OAuth本番有効化（Program Bとは別件、
  従来通りOwner確認事項として保留中）

以上、いずれも今回のVersion35では一切実施していない。
