# ADR 0017: TimelineへのExternalKnowledge組み込みとExternalSourceの除外

## ステータス

承認済み

## 関連Principle

- ADR 0009（Timelineの対象範囲）
- ADR 0013（ExternalSource/ExternalKnowledgeの分離）

## コンテキスト

Version10指示書は、External BrainのTimeline（Version8、ADR 0009）
への組み込みを求めていた。ADR 0009は「日付キーを持ち、ある瞬間の
出来事を表す記録」をTimelineの対象基準として確立している。

## 決定

`ExternalKnowledge`は`capturedAt`（記録した日付）をTimelineの日付
として使い、Timelineに含める。`ExternalSource`自体はTimelineに
**含めない**。

Timelineエントリの内容は要約に留める：`title`はKnowledgeの
タイトル、`summary`は`"[sourceType] 出典タイトル"`形式、
`metadata`にid/status/topics/出典情報を含める。`content`
（本文そのもの）はTimelineエントリに一切含めない。

## 根拠

**ExternalKnowledgeを含める理由**：`capturedAt`はADR 0009の基準
（日付キーを持ち、ある瞬間の出来事を表す）を満たす——「いつこの
知識を記録したか」は明確な一時点の出来事である。

**ExternalSourceを含めない理由**：Sourceは「この出典が存在する」
という管理用の記録であり、Memory・Life Inventory（ADR 0009で
除外済み）と同じく、単一時点の出来事ではなく継続的な参照情報に
近い性質を持つ。

**contentを含めない理由**：Timelineは「各Logを横断した時系列
"一覧"」であり、詳細情報の置き場ではない（ADR 0009の性質を踏襲）。
External Brainの`content`は長文になりうるため、Timelineエントリに
含めると一覧の可読性を損なう。全文が必要な場合は
`pnpm external -- show <id>`または`GET /external-knowledge/:id`
で個別に取得する。

## 影響

- `TimelineSource`型に`'ExternalKnowledge'`を追加（`'ExternalSource'`
  は追加しない）。
- `GetTimelineUseCase`は`ExternalSourceRepository`にも依存するが、
  それは各Knowledgeエントリの`summary`用にSourceのtitle/typeを
  引くためだけであり、Source自体を独立したエントリとしては
  生成しない。
