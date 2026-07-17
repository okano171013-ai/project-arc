# Authority Table（Version22、Version24・Version25で更新）

Approval Policy Engine（Version21、ADR 0048）が定義したLevel0/1/2の、
実行主体・許可操作・禁止操作・エスカレーション条件を単一の表に
まとめたもの（AgentMessage `e5728efb-...`要件1）。判断に迷ったら、
まずこの表を確認する。詳細な設計根拠はADR 0048・ADR 0049・ADR 0051・
ADR 0052、脅威モデルは[`docs/security/remote-mcp-threat-model.md`](./security/remote-mcp-threat-model.md)参照。

| Level | 実行主体 | 許可操作 | 禁止操作 | エスカレーション条件 |
|---|---|---|---|---|
| **Level0** | Claude Code | 可逆的・局所的・仕様内の通常実装、読取、テスト、文書更新、ローカルのコード変更・commit | 本番認証の有効化、外部公開範囲の変更、有料契約、秘密情報の設定・外部送信、破壊的操作、Constitution/Principles変更 | `ApprovalSignals`のいずれかがtrue、または未申告 → Level1へ |
| **Level1** | ARC（一般的なProposal承認代行は未実装、[委譲案](./proposals/level1-arc-approval-delegation.md)参照）。**ただし有効な`AgentDelegationGrant`（Constitution第4条限定改定、Version24、ADR 0051、Version25でscope拡張、ADR 0052）の範囲内でのみ、Reflection・ChallengeLog・MealLog・NutritionLog・WeightLog・FinanceLogの保存は個別`do`なしで実行できる** | 複数モジュールに跨る設計判断の提案、通常Proposalの内容レビュー・起案、有効なGrant範囲内の生活記録保存 | **`proposal_approve`の実行**（`AgentDelegationGrant`型自身を除き現状維持、Owner`do`必須）、Level2に該当する操作全般 | 委譲`scope`外の操作、委譲の`expiresAt`超過・`usageLimit`到達・`revokedAt`設定後 → Level2へ |
| **Level2** | Owner本人のみ | 有料サービス契約、外部公開範囲の変更、認証方式の本番有効化、秘密情報の登録、破壊的操作、Constitution/Principles変更、不可逆または高影響な判断、**`AgentDelegationGrant`の作成・変更（型固定ルール、常にLevel2）** | ARC単独・Claude Code単独・クライアント入力単独では実行不可（後述の認可境界） | — |

## Level2操作の認可境界

Level2操作（本番認証の有効化、外部公開範囲の変更、有料契約、秘密情報
登録、破壊的操作、Constitution変更）は、いずれも以下のいずれかの
性質を満たすことで「ARC/Claude Code/クライアント入力だけでは成立
しない」構造になっている（ADR 0049）。

1. **Claude Codeの行動規範として、これらのカテゴリに触れる操作は
   必ず実行前に停止しOwnerへ確認する**（`CLAUDE.md`「執行する行動の
   注意」節、本セッションの行動規範）。これはコードによる強制では
   なく、Claude Code自身の運用規約による自己抑制である。
2. **`ApprovalDecision`監査ログ**（Version21）により、Level2に
   機械的に分類された`Proposal`の全履歴が記録され、Owner・ARCが
   事後に検証できる。
3. **Write Proposal Layer**（ADR 0031）により、`proposal_approve`の
   実行自体が「Ownerが`createProposal`の戻り値を実際に再送する」
   という行為でしか成立しない——ARCやClaude Codeが単独でRepositoryへ
   書き込む経路は存在しない。

**既知の限界**（ADR 0044・0048・0049・0051で繰り返し明記している
事項）：上記1は技術的な強制ではなく規範である。上記3も、
**Version24でOAuth 2.1を本番有効化した**（ADR 0051）ことにより
「トンネル公開URLを知る誰でも」という無認証時代のリスクは閉じたが、
「認証済みセッション内でOwner本人とARC/Claude Codeを区別する」こと
は依然としてできない——OAuthは接続の可否を制御するものであり、
接続済みセッション内の主体を識別するものではない。`AgentDelegationGrant`
（Version24）は、この限界を前提に「Owner本人が明示的に発行した
範囲内でのみ」という別の防御線を追加するものであり、認証の限界を
解消するものではない。
