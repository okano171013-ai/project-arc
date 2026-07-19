# Documentation Structure Plan

## 推奨構造

```text
docs/
  README.md
  constitution/
  architecture/
  adr/                    # INDEX + TEMPLATEを含む
  roadmap/
  project-management/    # STATUS / OPEN_ISSUES / milestones
  reports/
  developer-feedback/
  handoff/
  operations/
  security/
  setup/
  decisions/
  archive/
```

| 情報 | 正本 |
|---|---|
| 現在状態 | PM Status |
| 将来順序 | Roadmap |
| 設計理由 | ADR |
| 完成機能・検証 | Version Report |
| 判断・副作用 | Developer Feedback |
| 未解決 | Open Issues |

## 段階移行

Phase 1は新PM文書、`docs/README.md`、ADR index、Historical / Superseded labelを追加し、既存fileを動かさない。link検査をCIへ入れる。Phase 2で1 commit 1 categoryとして移動し、参照を機械更新する。

過去Report / Feedback / Handoff / Superseded ADRは監査証跡なので削除しない。DoDは現行gateだけに縮小し、歴史checkはReportへ、HISTORYはrelease indexへ寄せる。
