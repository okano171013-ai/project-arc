# Developer Feedback — Version41

## メタデータ

- Version / 日付: Version41 / 2026-07-21
- 担当エンジン: Claude Code
- Git commit / tag: `3650250`
- 対応Issue / 関連Report: MemoryをAgentDelegationGrant scopeへ追加 / `docs/reports/Version41_Report.md`
- 状態: Complete

## 1. 目的

Owner本人がChatGPT接続チャットで実際にMemory型の内容（ほしい物
リスト・方針）を保存しようとした際、Proposal個別確認の往復を
「不便」と感じ、チャット上で「個別確認無しで保存して」と明示指示
した。Version40の項目3が示した「Memoryは個別確認を維持する」方針を
Owner本人の現在の意思で上書きし、AgentDelegationGrantのscopeへ
Memoryを追加する。

## 2. 実装

- 変更：`AgentDelegationGrant`（scope型に`Memory`追加）、
  `WriteProposalGatewayUseCase`（`AUTO_APPROVABLE_TYPES`更新、
  `verifyPersisted`にMemoryケース追加）、`propose.ts`
- Before：Memoryは常にProposal個別確認が必要だった。
- After：Memory scopeを含む有効なGrantがあれば、他の低リスク型と
  同様に即時保存される。

## 3. 設計判断

- **採用案**：新規ツールを追加せず既存`proposal_create`の
  auto-approve機構を拡張する。理由：Version40（ADR 0072）と全く
  同じ状況・同じ理由（書き込み経路を増やさない）。
- **見送り案**：`ExternalKnowledge`も同時に追加する。理由：Owner
  指示はMemoryのみに言及しており、指示の範囲を勝手に広げない
  （Constitution第2条）。

## 4. 理由

Constitution第4条・AgentDelegationGrantのscope変更を含むため、
ADR 0073を新規作成した。

## 5. 副作用

- 互換性：既存のGrant・Proposal挙動には影響なし（Memory scopeを
  含まない既存Grantの動作は無変更）。
- セキュリティ：Memory scopeを含むGrantを実際に発行するかどうかは
  引き続きOwner自身の判断（Constitution第4条により発行はClaude
  Code・ARCが代行できない）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：**661件合格**（92 test files、Version40時点660件+1件）
- ARC-PM-005は本変更と無関係であることを`git stash`比較で再確認した。

## 7. 未解決

なし。

## 8. 次Version

1. Owner自身がMemory scopeを含むGrantを発行する（依存：Owner操作）
2. 保留中の「ほしい物リスト・方針」をそのGrant発行後に保存する

## 9. Owner確認事項

- **Memory scopeを含むAgentDelegationGrantの発行**：発行は
  Constitution第4条によりOwner自身の`proposal_create`
  （type: AgentDelegationGrant）→`do`→`proposal_approve`という
  既存フローが必要——Claude Codeは代行できない。急ぎ度：中
  ——保留中の記録（ほしい物リスト等）を保存するために必要。

## 10. 関連ADR

- 新規：ADR 0073（Memory scope自動承認を追加した理由）

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録した（`3650250`）
- [x] 未実行テストを成功扱いしていない（661件全件実行・全件合格を実機で確認）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章に明記）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
