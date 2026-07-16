# ADR 0050: 生活記録自動保存はConstitution改定を要しないという結論

## ステータス

**却下・ADR 0051に置き換え**（Owner本人がAgentMessage
`1e02902f-...`で「Constitution改定不要」という本ADRの結論を採用せず、
明示的な限定改定を指示した。実際に採用された設計はADR 0051参照）。
本ADRは「なぜOwnerが異なる判断をしたかを理解する記録」として残す
——結論部分（4章）はもはや有効ではない。

## 関連Principle

- Constitution第2条（Systemは、判断しない）・第4条（Ownerが、
  最終決定する）
- Principle 9（段階的拡張／YAGNI）
- ADR 0005（Memory/Inventory/Reflectionの境界）
- ADR 0031（Write Proposal Layer）・ADR 0039（AgentMessageパターン）・
  ADR 0045（Version19スコープ境界）・ADR 0048（Approval Policy
  Engine）・ADR 0049（Version22認証方式比較・スコープ）

## コンテキスト

AgentMessage `f81e9141-...`（2026-07-16T00:18:52.837Z、Owner本人が
発信した決定）は、Owner本人がChatGPT上で明示的に入力・送信した通常の
生活記録（食事・栄養・睡眠・体重・運動・勉強・授業・支出/収入・
日次振り返り・挑戦行動）について、記録ごとのOwner`do`を不要とする
自動保存を許可した。同時に「Version22の権限委譲設計にこのOwner決定を
限定scopeの委譲ユースケースとして反映」「現行Constitutionとの整合に
変更が必要な場合は、必要最小限の変更案と影響を提示」することを
求めた。

Version22で設計した`AgentDelegationGrant`（`docs/proposals/
level1-arc-approval-delegation.md`）は「ARCが任意のProposalを
Owner`do`なしに承認してよい」という一般的な委譲を扱っており、
Constitution第4条の改定を要する未決定の提案だった。今回のOwner決定は
これとは異なる、範囲を限定した既決定の指示である——両者を混同しない
よう、詳細な設計は別ドキュメント（`docs/proposals/
life-log-auto-save-delegation.md`）に切り出した。本ADRは、そちらの
4章で示した「Constitution改定は不要」という結論の根拠を記録する。

## 決定（提案）

### Constitution/Principlesの改定は不要と判断する

1. **第4条（Ownerが最終決定する）との整合**：本Owner決定自体が
   「この範囲は自動保存してよい」という最終決定である。これは
   決定権限そのものの委譲（誰が決めるかを変える）ではなく、
   Ownerが既に下した決定の実行手段の変更（毎回`do`で再確認させるか、
   まとめて先に許可するか）に過ぎない。
2. **第2条（Systemは判断しない）との整合**：自動保存の対象が
   「Owner本人が明示的に送信した内容のみ」「推測・補完した事実は
   確定記録として保存しない」というOwner決定自身の制約の範囲内で
   ある限り、Project ARC（System）は依然として「何が重要か」「何が
   事実か」を判断しない。この制約はSystem側の実装で機械的に強制
   できる（自由記述の解釈を要さない）。
3. **ADR 0031との関係**：Owner自身のCLI/HTTP直接書き込み
   （`pnpm skin -- add`等）は元々Write Proposal Layerを経由して
   いない——Owner自身の意思による直接書き込みに、Owner自身の再承認は
   要求されていない。今回の変更は、この既存の「Owner自身の直接
   書き込み」という扱いを、「Owner本人の発言をARC経由で書き写す」
   という限定的なケースへ拡張するものであり、ADR 0031が防ごうと
   していた対象（ARC自身の独自判断がProposalとして紛れ込むこと）とは
   性質が異なる。

## 根拠

- Constitution・ai-roles.mdの解釈は本来ARCまたはOwnerの領域に属する
  （Claude Codeの役割は「技術実装の裁量権のみ」、`docs/ai-roles.md`）。
  本ADRはClaude Codeが独自にConstitutionを改定する権限を持たない
  ことを踏まえ、あくまで「なぜこの実装がConstitutionと矛盾しないと
  考えるか」という技術的な整理を提示するに留め、最終的な妥当性の
  確認はOwner・ARCに委ねる（ステータスが「提案中」である理由）。
- 既存の直接書き込みパターン（`pnpm skin -- add`等がProposal層を
  経由しない）という前例が既にコードベースに存在するため、今回の
  設計はゼロから新しい例外を作るのではなく、既存の設計パターンを
  限定的に拡張するものと位置づけられる。

## 影響

- 本ADRが確認されれば、`docs/proposals/
  life-log-auto-save-delegation.md`5章の技術設計（`LifeLogAutoSaveGrant`、
  Phase 1/2分割）に基づき、次Version（Version23想定）で実装を進める。
- 本ADRが確認されなければ（Owner・ARCが「やはり改定が必要」または
  「この解釈は採用しない」と判断すれば）、実装は行わず、Owner決定の
  再確認を待つ。
- 調査の副産物として、`StudyLog` Entity（Version1で先行定義された
  ものの、Repository・UseCase・Routeが一切配線されていない）が
  発見された。今回のOwner決定の対象外の技術的負債として記録するに
  留め、廃止するか配線するかはOwnerの判断を仰ぐ（`docs/proposals/
  life-log-auto-save-delegation.md`3章参照）。
