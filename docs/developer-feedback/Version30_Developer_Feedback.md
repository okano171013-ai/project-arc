# Developer Feedback — Version30

## メタデータ

- Version / 日付: Version30 / 2026-07-19
- 担当エンジン: Claude Code
- Git commit / tag: `f3cb3e6`
- 対応Issue / 関連Report: ARC-PM-001, ARC-PM-003（解決） / `docs/reports/Version30_Report.md`
- 状態: Complete

## 1. 目的

PM Reviewが指摘したARC-PM-001（公開Remote MCPが無認証）を、新規実装
ではなく既存実装（Version22 OAuth 2.1）の検証・記録整合・安全な
移行準備によって閉じる道筋をつける。完了条件：security review完了、
ADR 0051の記録訂正、PM Status更新、activation checklist整備。

## 2. 実装

- 追加：`src/infrastructure/security/rateLimiter.ts`
  （固定窓レート制限、外部依存なし）
- 変更：`src/infrastructure/mcp/remoteServer.ts`
  （`/authorize/confirm`にレート制限を適用）
- テスト追加：`remoteServer.oauth.test.ts`に否定テスト1件
- Before：`/authorize/confirm`は無制限に総当たり可能だった
- After：同一IPから15分あたり10回を超えると429を返す

## 3. 設計判断

- **採用案**：既存の`LocalOAuthProvider`設計はそのまま維持し、発見した
  欠落（レート制限）のみをピンポイントで追加する。
- **見送り案**：Passcode方式自体を見直す（例：TOTP等の多要素化）は、
  Owner指示のスコープ（既存実装の本番移行準備）を超えるため見送った。
- **見送り案**：`apiKeyAuth.ts`のtiming-safe化も同様に見送り、
  ARC-PM-013として記録するに留めた。
- 境界・データモデル・API契約への影響：なし
  （`/authorize/confirm`のレスポンスに429という新しいステータスが
  増えた以外、既存の契約は無変更）。

## 4. 理由

- ADR 0049時点の脅威モデルの想定（SDKのIPレート制限で十分）が、
  `/authorize/confirm`という自前ルートには適用されていないという
  コードレベルの事実によって覆されたため、対応が必要と判断した。
- Passcode強度（16文字以上推奨）に運用を委ねるだけでなく、
  多層防御としてレート制限を追加する方が、Owner運用の実際の
  強度に依存しない設計になる。

## 5. 副作用

- 互換性：既存の正規フロー（正しいPasscode1回）には影響しない。
- 性能：無視できる（Mapベースのin-memoryカウンタ、O(1)）。
- セキュリティ：`/authorize/confirm`への総当たり耐性が向上。
- 運用：レート制限に達した場合、Owner自身がPasscodeを何度も
  打ち間違えると15分待たされる可能性がある——チェックリストの
  「うまくいかないときは」表に明記した。
- 新たな保守コスト：`rateLimiter.ts`は状態をプロセス内メモリに
  保持するのみで、永続化やクリーンアップの追加コストはない
  （プロセス再起動で自然にリセットされる）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- 結果：typecheck/lint/test（512件）は合格。buildはVersion30とは
  無関係な既存不具合（TS2742、ARC-PM-005）で不合格——Version30の
  変更を`git stash`した状態でも同じエラーが出ることを確認済み
  （Version30起因ではないことの確認）。
- 追加テスト：`remoteServer.oauth.test.ts`
  「returns 429 once the same source exceeds the attempt limit」
  （実HTTPリクエストで10回失敗→11回目で429を検証）。
- 未実行の検証：本番`.env`でのOAuth有効化そのものは未実施
  （Owner専権のためスコープ外）。

## 7. 未解決

- ARC-PM-001（P0）：実装済み・テスト済みだが、本番`.env`反映は
  Owner Action待ちのまま。判断者：Owner。
- ARC-PM-002・005〜010：Version30スコープ外、変化なし。
- ARC-PM-013（P2、新規）：`apiKeyAuth.ts`の非timing-safe比較。
  次回機会があれば対応。

## 8. 次Version

1. Owner自身が`docs/setup/remote-mcp-oauth-migration.md`のchecklist
   を実行し、ARC-PM-001をクローズする（依存：Owner本人の作業時間）
2. ARC-PM-005（build失敗、TS2742）の解消
   （依存：`generateOpenApi.ts`への型注釈追加、着手条件なし）
3. `CODEX_RECOVERY_PLAN.md`の実運用検証（依存：実際にCodexとの
   合流が発生すること）
4. ARC-PM-002（データ耐久性）着手（依存：Stability Gateの優先順位、
   Owner確認）
5. ARC-PM-013（apiKeyAuthのtiming-safe化）（依存：なし、着手条件なし）

## 9. Owner確認事項

- **本番`.env`へのOAuth有効化**：`docs/setup/
  remote-mcp-oauth-migration.md`のchecklistに沿って、Owner本人が
  実行するかどうかの判断・実施が必要。費用なし、秘密情報
  （Passcode）はOwner自身が生成・保管。
- それ以外の設計・テスト・文書更新はOwner確認を待たずに実施済み
  （通常タスクの範囲、DEVELOPMENT_RULES.md準拠）。

## 10. 関連ADR

- 新規：ADR 0057（Version30のスコープと決定）
- 更新：ADR 0051（末尾に訂正節を追記、本文は不変）
- ADR不要と判断した理由：レート制限の追加自体は認証方式の変更では
  なく、既存の認証境界（`/mcp`全体を保護する`requireBearerAuth`）
  への防御層追加であり、ADR 0049が既に確立した設計方針の範囲内の
  実装判断のため、個別ADRは不要と判断した。

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録した
- [x] 未実行テストを成功扱いしていない（本番`.env`反映は「未実施」と明記）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章で分離）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
