# Developer Feedback — Version33

## メタデータ

- Version / 日付: Version33 / 2026-07-19
- 担当エンジン: Claude Code
- Git commit / tag: 後続コミットでhashを追記
- 対応Issue / 関連Report: Program A基盤（ADR 0060・0061実装） / `docs/reports/Version33_Report.md`
- 状態: Complete

## 1. 目的

ADR 0060・0061で設計したDevelopmentGrant・AgentTaskを、Domain〜
Adapters層まで実装し、Program Aの「安全な基盤」を作る。MCP Tool・
HTTP Route配線は次Versionへ持ち越す。

## 2. 実装

- 追加：`DevelopmentGrant`・`AgentTask`Entity、対応するPort・
  JsonFile Repository・UseCase（計12ファイル + テスト4ファイル）
- Before：Program Aの権限モデル・task管理はADRの文書のみ
- After：状態機械・lease機構が動くコードとして存在し、43件のテストで
  検証済み

## 3. 設計判断

- **採用案**：「1 branch 1 writer」の強制をUseCase層に置く
  （Entity単体では他taskの状態を見られないため）。
- **採用案**：leaseの対象をClaimed/InProgressのみに限定し、
  Review/ChangesRequestedは対象外とする——Review中のtaskが時間経過
  だけで勝手に解放されてしまう方が危険（レビュー結果を待たずに
  他Agentが同じbranchで作業を始めてしまう）と判断した。
- **見送り案**：MCP Tool・HTTP Route配線の同時実装——本Versionの
  「安全な基盤」というスコープを超えるため、次Versionへ明示的に
  分離した。

## 4. 理由

Entityとレイヤーの責務分離（Domain=状態機械のルール、UseCase=
複数Entityをまたぐ整合性）を厳密に保つことで、将来AgentTaskの
lease機構だけを再利用する別の文脈（例：他のリソースの排他制御）が
必要になった場合も、UseCase層のパターンをそのまま転用できる。

## 5. 副作用

- 互換性：既存23 Entity・Repository・UseCaseは無変更、影響なし。
- 性能：AgentTaskのbranch競合チェックは`findAll()`で全task走査——
  現状のtask数（数十〜数百想定）では無視できるコスト。task数が
  大きく増えた場合は`branch`でindexするRepositoryクエリへの変更を
  検討する（現時点ではYAGNI）。
- セキュリティ：DevelopmentGrantの`costCeiling`は型・実行時の両方で
  `0`固定——JSON経由でも改ざんされて非ゼロ値が保存されることは
  `create()`のバリデーションで防がれるが、`restore()`は検証しない
  （既存パターン踏襲、Repositoryが保存した内容は信頼する設計）。
  手動で`data/development-grants.json`を直接編集すれば理論上
  `costCeiling`以外の値を注入できるが、これは既存の全Repositoryに
  共通する信頼境界であり、本Versionで新たに導入したリスクではない。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：570件合格（新規43件）
- 実装中に1件のバグを発見・修正（`Review → Closed`遷移の許可漏れ、
  Report7章参照）
- 未実行の検証：MCP Tool・HTTP Route未実装のため、実際のARC
  接続経由での動作確認はまだ行っていない（次Version）。

## 7. 未解決

なし（本Versionのスコープ内では全て解決）。次Versionへの持ち越しは
8章参照。

## 8. 次Version

1. `agent_task_list`・`development_grant_list`のMCP Tool・HTTP Route
   実装（依存：なし、着手可能）
2. DevelopmentGrantの初回発行（依存：Owner確認）
3. Claude Worker設計・実装（依存：1・2の完了、実運用データがあった
   方が精度が上がる）

## 9. Owner確認事項

- **DevelopmentGrantの初回発行**：scope（repositories・
  branchPrefix）・maxVersionCount・reasonをOwnerに決めてもらう必要が
  ある。本Versionでは実装のみで発行していない。

## 10. 関連ADR

- 新規ADRなし。ADR 0060・0061をそのまま実装（両ADRはProposedの
  ステータスを維持——実運用開始まではAccepted化しない方針、
  Report12章参照）。

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [ ] commit / tagを記録した（本コミット後、follow-upコミットでhashを追記）
- [x] 未実行テストを成功扱いしていない（MCP Tool経由の動作確認は「未実施」と明記）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章で分離）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
