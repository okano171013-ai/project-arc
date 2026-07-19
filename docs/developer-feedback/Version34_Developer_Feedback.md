# Developer Feedback — Version34

## メタデータ

- Version / 日付: Version34 / 2026-07-19
- 担当エンジン: Claude Code
- Git commit / tag: `39e446a`
- 対応Issue / 関連Report: Program A読み取り専用公開 / `docs/reports/Version34_Report.md`
- 状態: Complete

## 1. 目的

Version33で実装したDevelopmentGrant・AgentTaskをARCから確認できる
ようにする。Owner指示に従い読み取り専用に厳密に限定し、write操作は
別工程として権限境界・脅威モデルを再確認してから設計する。

## 2. 実装

- 追加：MCP Tool 2件（`development_grant_list`・`agent_task_list`）、
  HTTP Route 2件（`GET /development-grants`・`GET /agent-tasks`）、
  Connectorメソッド2件
- Before：DevelopmentGrant・AgentTaskはコード上は存在するが、
  外部（ARC・Remote MCP経由）からは一切確認できなかった
- After：ARCが会話の中で`agent_task_list`等を呼び、Program Aの
  状態を確認できる（現時点では空リスト）

## 3. 設計判断

- **採用案**：既存の`agent_delegation_grant_list`と完全に同型の
  パターン（Connector→HTTP Route→UseCase→Repository、MCP Toolは
  薄いアダプタ）を踏襲。新しいパターンを持ち込まなかった。
- **採用案**：write操作は今回一切追加しない。Owner指示を厳密に
  守り、「無料・可逆」の境界の中で完結する読み取りのみに留めた。
- **見送り案**：write toolも一緒に実装してテストだけ別にする案は
  検討したが、Owner指示の「同じVersionへ混在させない」という明示的
  な要求と衝突するため採らなかった。

## 4. 理由

DEVELOPMENT_RULES.mdの「public API...の変更」はADR必須条件に該当
するが、既存ADR 0060・0061が既にこの読み取り専用公開を「影響」節で
予告していたため、新規ADRは不要と判断した（10章参照）。

## 5. 副作用

- 互換性：既存23+2 Repositoryのlist route・MCP Toolは無変更。
- セキュリティ：Remote MCPが無認証運用のままである限り
  （ARC-PM-001未解決）、この2 Toolも第三者から読める状態になる。
  脅威モデル7章で評価した通り、公開される情報は開発プロセスの
  メタデータに限られ、生活データへは到達しない。
- 運用：新しいJSON file（`data/development-grants.json`・
  `data/agent-tasks.json`）が増える——Version31のbackup機構
  （ファイルレベルで汎用）は自動的にこれらもカバーする（追加対応
  不要、Version31の設計がここで効いた）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：573件合格（新規3件）
- 実装中に2件の既存テスト失敗を検出・修正（Report7章）：ツール数の
  ハードコード、`PROJECT_ARC_VERSION`のハードコード
- `PROJECT_ARC_VERSION`が29のまま5Version分放置されていたことも
  今回発覚（Report7章・8章）

## 7. 未解決

- `PROJECT_ARC_VERSION`の手動更新忘れが今回発覚（P2、Report8章）。
  release identity自動化（ARC-PM-010）と合わせて次回検討。

## 8. 次Version

1. Write操作（claim/heartbeat/状態遷移等）の権限境界設計
   （依存：ARC-PM-001＝OAuth本番有効化の完了、Owner Action）
2. DevelopmentGrantの初回発行（依存：Owner確認）
3. `PROJECT_ARC_VERSION`更新をVersion終了チェックリストへ明示
   （依存：なし、着手可能）

## 9. Owner確認事項

なし（読み取り専用の公開のみで、費用・秘密情報・本番変更・外部
公開範囲の拡大・不可逆操作・Constitution変更のいずれにも該当しない
——公開面が2 Tool分広がった点は「拡大」ではなく、Owner指示の
スコープ内の想定された変更）。

## 10. 関連ADR

- 新規ADRなし。ADR 0060・0061が既に読み取り専用公開を予告していた
  ため、実装のみで対応した。ADR不要と判断した理由：両ADRの
  「影響」節に「MCP Tool（読み取り専用）は既存UseCaseへの委譲のみ」
  と明記済みで、新しい設計判断を伴わないため。

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録した
- [x] 未実行テストを成功扱いしていない
- [x] Owner確認事項を通常タスクへ埋没させていない（9章で「なし」と明記）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
