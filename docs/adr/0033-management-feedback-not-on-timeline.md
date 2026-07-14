# ADR 0033: ManagementFeedbackをTimelineへ載せない理由

## ステータス

承認済み

## 関連Principle

- ADR 0009（Timelineの対象範囲）
- ADR 0017（ExternalKnowledgeをTimelineに含めExternalSourceを除外した先例）
- Principle 9（段階的拡張／YAGNI）

## コンテキスト

Version14指示書15章は「ManagementFeedbackをTimelineへ載せるか」を
判断が必要な論点として明示的に挙げていた。ADR 0009の基準
（「日付キーを持ち、ある瞬間の出来事を表す記録」がTimeline対象）に
照らして検討する。

## 決定

Version14では`ManagementFeedback`を`GetTimelineUseCase`の対象に
**含めない**。`TimelineSource`型への追加を行わない。

## 根拠

- **「ある瞬間の出来事」ではなく「継続する状態」**：
  `ManagementFeedback`は`createdAt`という一時点は持つが、その本質は
  `resolution`が時間をかけて遷移していく継続的な管理対象
  （Open→Accepted→Implemented→Closed）である。ADR 0017が
  `ExternalSource`をTimelineから除外した理由（「単一時点の出来事
  ではなく継続的な参照情報に近い性質」）と同種の判断であり、
  `ManagementFeedback`も同じ理由でTimeline対象外とするのが一貫する。
- **性質の異なる2つの時系列を混ぜない**：Timelineは「Ownerの人生の
  出来事」を横断する一覧（ADR 0009）である。ManagementFeedbackは
  「Project ARCというシステム自体の改善提案」の記録であり、対象が
  Owner自身の人生ではなくプロダクトの運用である。両者を1つの
  Timelineに混在させると、「今日何があったか」を見たいだけの
  Ownerに、システム改善提案という無関係な情報が混ざってしまう
  （ADR 0005がMemory/Inventory/Reflectionの検索対象を分離した
  理由と同種の懸念）。
- **YAGNI**：`GetTimelineUseCase`は既に9個のRepositoryに依存する
  巨大なコンストラクタを持つ。ManagementFeedbackをここに追加すると
  依存がさらに増える一方、指示書側にも「Timelineに統合したい」という
  具体的なOwnerのユースケースはまだ示されていない。現時点では
  `pnpm propose -- list-feedback`による専用の一覧表示で十分であり、
  将来Owner側から「Timelineでも見たい」という具体的な要望が出た
  時点で追加を検討する。

## 影響

- `ManagementFeedback`の一覧は`ListManagementFeedbackUseCase`
  （CLI: `pnpm propose list-feedback`）でのみ提供する。HTTP APIにも
  一覧・解決エンドポイントは追加しない（指示書6章のAPI一覧に
  含まれないため、CLIのみで完結させる——これもYAGNI）。
- 将来Timelineへの統合が必要になった場合、`TimelineSource`に
  `'ManagementFeedback'`を追加し、`GetTimelineUseCase`のコンストラクタに
  `ManagementFeedbackRepository`を追加する変更で対応できる
  （ADR 0017が確立したパターンをそのまま再利用できるため、
  設計変更のコストは小さい）。
