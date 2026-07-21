# ADR 0074: Notionを当面の個人情報記録の母体とし、Project ARCは開発継続するが日常使いから一時的に外す

## ステータス

Accepted（Owner本人の判断、2026-07-21）

## 関連Principle・ADR

- Constitution第4条（Ownerが最終決定する）
- ADR 0070（Cloud Quick Capture UI・PC停止中の「保存」の分解、
  Capability/Gap表）
- ADR 0071（Canonical Store所在比較：cloud全面移行・現行案・hybrid）

## コンテキスト

Version39〜41の一連のセッションで、Owner本人が実際にChatGPT
Developer Mode経由でProject ARCへ複数回にわたり読み書きを試みた
結果、次の問題が繰り返し発生した。

- ChatGPT側のチャットごとに、Project ARCコネクタの接続・ツール
  可視性が不安定で、同じ手順でも使えたり使えなかったりする
  （原因の切り分けを何度も試みたが、ChatGPT側のクライアント実装に
  起因する部分が大きく、Project ARC側のコードでは制御できない
  領域だった）。
- Remote MCPサーバーはOwnerのPCに依存しており（ADR 0044、認証なし
  ローカルプロセス＋ngrokトンネル）、**PCが起動していない間は
  一切使えない**。これはADR 0070が明らかにした「PC-off保存」の
  Capability/Gap（段階a・b・cのうち、b・cは未達のまま）が、実際の
  日常利用の中で具体的な不便として顕在化した実例である。

これらの結果、Owner本人が「結局使いものになっていない」と判断し、
日常の個人情報記録における実務ツールを見直すことにした。

## 決定

1. **Notionを、当面の個人情報記録（生活ログ・Memory・ほしい物リスト
   等）の母体とする**。ChatGPT側のNotionコネクタは安定して動作して
   おり、日常的な記録にはこちらを使う。
2. **Project ARCの開発自体は継続する**——本ADRはコードの停止・
   ロールバックを意味しない。Version1〜41（本ADR時点で665件の
   テストが合格、`AgentDelegationGrant`・保存信頼性契約・
   StudySession対話型ライフサイクル等を含む）はそのまま維持する。
3. **Project ARCは、当面の「日常使い」からは外れる**。Owner主権・
   Systemは判断しない・local-firstというConstitution上の設計思想
   自体は変更しない——今回の決定は運用上の選択であり、Constitution・
   Principlesの改定は伴わない。
4. **将来、Project ARC側の課題（Remote MCP接続の安定性、PC-off
   Gap、あるいはcloud化）が実際に解決し「使い物になる」と判断
   できた時点で、Notionに蓄積したデータを一括でProject ARCへ
   移行し、現在の形のProject ARCへ運用を戻す**。

## 根拠

- ADR 0071が既に整理していた通り、「PC停止中でも安全に生活ログを
  保存・参照できる」という要件を完全に満たすには、canonical ARCの
  cloud residency（案A）かhybrid案（案C）のいずれかへ進む必要が
  あり、これはConstitution/Principlesレベルの合意を要する重い判断
  として保留されていた。今回のOwner体験は、この保留の代償
  （PC-off Gapが残ったままでは日常使いに耐えない）を具体的に示す
  実例であり、将来この判断へ進む際の重要な参考データになる。
- Notionへ一時的に移行することは、Project ARCのコード・設計判断を
  無効化するものではなく、単に「今どちらのツールに実際の記録を
  蓄積するか」という運用上の選択に過ぎない。将来の移行を見据え、
  Project ARC側のコードは意図的に変更・後退させない。

## 影響

- コード変更：なし。
- 運用：Owner本人が、当面Notion側で生活ログ・Memory等を記録する。
- ロードマップ：Project ARCの次の技術的な焦点は、「Notionからの
  一括移行を受け入れられる状態」を見据えつつ、Remote MCP接続の
  安定性・PC-off Gapの解消（ADR 0071の案A・Cの実施要否を含む）を
  Owner/ARCと改めて相談することになる——ただし本ADR時点では
  実施しない（実移行・実装は行わない）。

## 見送った案

- **Project ARCのコードを巻き戻す・作り直す**：Owner本人が明確に
  「コードはこのまま」と確認したため見送った。今回の問題は接続の
  安定性・PC依存という運用上の制約であり、Version1〜41で構築した
  Domain/Application/Infrastructureの設計自体に欠陥があったわけ
  ではない。
- **今すぐNotion連携のコードを書く**：Owner指示は「当面は運用で
  対応する」という判断であり、Notion Importer等の実装は今回の
  スコープに含めない。将来、実際に一括移行する段階になったら
  改めて設計・実装する。
