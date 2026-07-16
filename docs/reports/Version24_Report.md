# Version24 Report: OAuth Production Activation and Scoped Life-Log Delegation

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：OAuth Production Activation and Scoped Life-Log
Delegation。Owner本人発信のAgentMessage（id `1e02902f-...`）による
指示——Version22 Feedbackの3つの承認事項（OAuth本番有効化、生活記録
限定のLevel1委譲、Constitution第4条の限定改定）を全て承認した上での
実装指示。指示書は実施順序A〜F・安全条件・完了条件を明示していた。

Version番号について：本指示のAgentMessageは`relatedVersion:
Version23`タグだったが、Version23は既に設計ドキュメント（コミット
`73c493a`/`092aef7`）として確定済みだったため、本実装は独立した
Version24として扱った。

## 2. 今回実装した機能（理由も含めて説明）

### Constitution第4条の限定改定（`docs/constitution.md`）

Plan Modeで確定した文言をそのまま反映した——「Ownerが最終決定する」
という原則本体は変えず、`AgentDelegationGrant`として明示発行された
範囲内でのみARCの即時保存を許す例外を明文化した。「条文間の関係」
節に、この改定がなぜ第2条（Systemは判断しない）と矛盾しないかの
説明を追記した。

### `AgentDelegationGrant`（新Entity）

`src/domain/entities/AgentDelegationGrant.ts`。状態機械は
`Active`⇄`Paused`→`Revoked`（`Revoked`は最終状態）。指示書の
「Claude Code・ARC自身がGrantを...復活させることを禁止する」を、
`resume()`が`Revoked`状態から呼ばれると例外を投げる、という
Entityの不変条件としてコードレベルで構造的に強制した——運用規約では
なく、型システムとテストで保証される制約。

### 型ベースの二重の安全装置

1. `ClassifyApprovalLevelUseCase`：`proposalType ===
   'AgentDelegationGrant'`は`signals`の内容に関わらず常にLevel2。
2. `WriteProposalGatewayUseCase`の自動承認対象を`AUTO_APPROVABLE_
   TYPES = ['Reflection', 'ChallengeLog']`に固定し、
   `AgentDelegationGrant`は絶対に含めない。

どちらか一方が将来誤って崩れても、もう一方が「Grant自体の作成・変更が
Owner`do`を迂回できない」ことを担保する設計とした。

### 自動承認フロー（`WriteProposalGatewayUseCase.createProposal`）

Level2でなく、かつ`AUTO_APPROVABLE_TYPES`に含まれる型のみ、有効な
Grant（`isValidFor(type, now)`——scope/expiresAt/usageLimit/status
の全条件を都度再評価）があれば即座に`executeApproval`を呼び、
`grant.recordUsage()`→保存、`ApprovalDecision`を`approver:
'auto-save'`付きで記録する。Grantが無ければ従来通りOwner`do`待ち
——**分岐が増えただけで、既存のOwner承認パス自体は1行も変更して
いない**。

### 重複防止

`approveProposal()`は、渡された`Proposal.autoApproved`が`true`なら
即座に例外を投げる——`createProposal`が既に自動保存した内容を、
クライアントの実装ミスや再送で二度書き込むことを防ぐ。指示書の
「重複防止」要件に対応。

### 推定値フィールド

`ReflectionRecord`/`ChallengeLogRecord`に`estimated`/
`estimationBasis`/`confidence`（全てoptional）を追加した。

### インフラ配線

新規MCP Tool `agent_delegation_grant_list`（読み取り専用）、新規HTTP
`GET /agent-delegation-grants`。書き込みは既存の`proposal_create`/
`approve`が`type: 'AgentDelegationGrant'`を受け付けるだけで完結
（ADR 0039の「書き込み経路を増やさない」方針を継続）。

## 3. 実装しなかった機能（延期理由も記載）

1. **OAuth本番有効化の実行そのもの**：Claude Codeの実行環境が持つ
   安全機構（auto mode classifier）により、本番`.env`への秘密情報
   書き込み・本番サービス再起動という操作がブロックされた——Owner
   本人が明示的に指示した内容であっても、セッション内での間接的な
   承認（AgentMessage経由の指示）だけではこの種の変更を実行させない
   設計になっている。具体的な設定内容とPasscodeはOwnerへチャットで
   直接伝達済みで、Owner自身の手作業として`docs/setup/
   remote-mcp-oauth-migration.md`の手順に従って実施する。詳細は
   10章「運用上の重要な発見」参照。
2. **訂正・削除UseCase**：Reflection/ChallengeLogにはそもそも
   `update`/`delete`UseCaseが存在せず、指示書の完了条件にも含まれて
   いなかったため、次Versionへ持ち越した。
3. **Phase2（食事・栄養・体重・収入）**：Version23で既に次Version
   課題として明示済み、今回も対象外のまま。
4. **Cloudflare Access**：指示書の明示的な指定通り、今回は導入しない。

## 4. Architecture Review

**新規**
- Entity: `AgentDelegationGrant`
- UseCase: `ManageAgentDelegationGrantUseCase`、
  `ListAgentDelegationGrantsUseCase`
- Port: `AgentDelegationGrantRepository`
- Adapter: `JsonFileAgentDelegationGrantRepository`
- MCP Tool: `agent_delegation_grant_list`

**変更**
- `docs/constitution.md`：第4条限定改定
- `Proposal`型：`ChallengeLog`・`AgentDelegationGrant`を
  ProposalTypeへ追加、`autoApproved?`/`result?`フィールド追加
- `ApprovalDecisionRecord`：`approver?: 'Owner' | 'auto-save'`追加
- `ClassifyApprovalLevelUseCase`：型固定ルール追加
- `WriteProposalGatewayUseCase`：コンストラクタに
  `challengeLogRepository`・`agentDelegationGrantRepository`追加
  （10引数に）、自動承認ロジック追加、重複防止ガード追加
- `Connector`・`http/server.ts`・`generateOpenApi.ts`・`propose.ts`：
  上記に対応する配線
- `ReflectionRecord`/`ChallengeLogRecord`：推定値フィールド追加

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0051**（新規）：Constitution改定の差分・効果・取消し方法、
  `AgentDelegationGrant`設計、OAuth本番有効化の実施記録。
- **ADR 0050**（Version23、ステータス更新）：「提案中」→「却下・
  ADR 0051に置き換え」。Owner自身が、ADR 0050の「改定不要」という
  結論を採用せず、明示的な限定改定を選んだため。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：321件全て緑（Version23時点294件から+27件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認（実HTTPリクエスト、`scripts/start-all.ps1`で再起動した
  実際のAPI・Remote MCPプロセスに対して）**：
  1. `AgentDelegationGrant`作成Proposal→Level2分類を確認
  2. Owner承認をシミュレートしてapprove→grant保存を確認
  3. `GET /agent-delegation-grants`でActive・usageCount 0を確認
  4. Reflection Proposal作成→`autoApproved: true`で即時保存される
     ことを確認
  5. `GET /approval-decisions`で`approver: 'auto-save'`の記録を確認
  6. usageCountが1へ増加したことを確認
  7. 同じ自動承認済みProposalを`approveProposal`へ再送→400エラー
     （重複防止）を確認
  8. grantをrevoke→status: Revokedを確認
  9. revoke後、同種のReflection Proposalが自動承認されなくなる
     （Owner do待ちに戻る）ことを確認

  全9ステップが設計通りに動作することを確認した。検証用データ
  （`data/reflections.json`・`data/agent-delegation-grants.json`・
  `data/approval-decisions.json`の該当エントリ）は確認後に削除した。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

なし。今回は新規追加のみで、既存機能の修正は発生しなかった。

## 8. 技術的負債（今後改善したい点）

- Reflection/ChallengeLogに訂正・削除UseCaseがない（3章参照、次
  Version課題）。
- `AgentDelegationGrant`は複数の有効なGrantが同じ`ProposalType`を
  カバーする場合、`Array.find`による最初の1件が使われる（順序は
  実装依存）。現状のユースケースでは問題にならないが、将来複数Grant
  の運用が実際に発生した場合は優先順位のルール化が必要になりうる。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- OAuth本番有効化（Owner自身の手作業）が完了次第、実際のngrok
  トンネル・ChatGPT Connector経由での接続確認を次のセッションで
  行うこと。
- Phase2（食事・栄養・体重・収入）の実装は、Owner確認済みの記録粒度
  （`docs/proposals/life-log-auto-save-delegation.md`6章の質問3）を
  踏まえて設計すること。

## 10. 運用上の重要な発見（Claude Codeの実行環境の安全機構）

Version24で初めて、Claude Codeの実行環境自体が持つ安全機構
（auto mode classifier）が、Owner本人が明示的に指示した操作の実行を
複数回ブロックするという事象が発生した——具体的には、本番`.env`への
`MCP_OAUTH_ENABLED`・秘密情報（Passcode）の書き込みと、それに伴う
本番サービスの再起動。

ブロックの理由は「セッション内でのやり取り（AgentMessage経由の指示
＋Ownerの短い『do』応答）だけでは、この種の本番影響・秘密情報を
伴う変更の同意根拠として不十分」というもの——`agent_message_list`
ツール経由で取得した指示内容は、この安全機構にとって「検証済みの
直接的なユーザー意図」とは扱われない。Owner本人がチャット上で当該
操作を直接名指しして再確認した後も、`.env`への秘密情報書き込み自体は
再びブロックされ、サービス再起動（秘密情報を伴わない操作）のみが
実行できた。

この挙動は「本番影響のある操作は、間接的な承認の連鎖ではなく、その
場での明示的な確認を要する」という、本プロジェクトが元々Owner指示
（`CLAUDE.md`）で定めてきた方針と一致しており、Claude Code自身の
安全設計がこの方針を実行環境レベルで裏付けている、と理解している。
今回はこの制約を回避しようとせず、Ownerへ具体的な手順とPasscodeを
提示して手作業を依頼する形で対応した。次Version以降も、同種の
「本番`.env`・秘密情報を伴う変更」が必要になった場合は、同じ制約に
再度遭遇する可能性が高いことを申し送る。

## 11. POへの提案（提案・懸念点・改善案を自由に記載）

- 今回、OAuth本番有効化の最後の一手（`.env`編集・再起動）がOwnerの
  手作業として残った。次回同種の変更が必要になる場合に備え、
  「Claude Codeが用意した設定値をOwnerがコピー&ペーストするだけで
  済む」形に事前整理しておく運用（今回で言えば、2行の`.env`追記＋
  1回の再起動コマンド）を標準パターン化することを提案する。

## 12. ARCへの引き継ぎ

**新しい資産**：`AgentDelegationGrant`——Owner決定に基づく生活記録の
自動保存が、コードレベルで実装・実機確認済み（本番有効化はOwnerの
最後の一手待ち）。

**新しいルール**：Constitution改定は、Owner本人が明示的に文言まで
確認した上でのみ実装する（Plan Mode承認）。「委譲」という言葉が
指す内容が「決定権限の委譲」か「決定の実行手段の効率化」かの区別
（Version23で確立）に加え、今回は「Entityの状態機械による構造的な
制約」が、規約だけでは保証できない「復活禁止」のような要件を実際に
コードで担保できる、という設計パターンを確立した。

**新しい思想**：Claude Codeの実行環境自体が、本番影響・秘密情報を
伴う操作について、セッション内の間接的な承認だけでは実行を許さない
という安全機構を持つことが今回初めて明らかになった。これは
Constitution第4条（Ownerが最終決定する）を、Project ARCのコードの
外側、実行環境のレベルでも一貫して支える構造だと理解している。

**Ownerについて分かったこと**：今回、2度のブロック後にOwnerへ状況を
説明し、次の行動（そのまま進めるか、Owner自身が手作業で行うか）の
選択を委ねたところ、「do」という短い応答で「示された選択肢のうち
実行可能な方で進めてよい」という意思決定を下した。安全機構による
中断であっても、Owner・ARCとの対話のパターン（状況説明→選択肢
提示→短い承認）は崩れなかった。

## 13. Product Review

**ユーザー体験で改善されたこと**：コードレベルでは、ChatGPTで
日々の振り返り・挑戦行動を話すだけで自動的にProject ARCへ保存される
仕組みが完成した。ただし本番有効化（Owner自身の手作業）が完了する
までは、Ownerが実際にこの体験を得られる状態にはなっていない。

**毎日使う理由**：本番有効化完了後は、Reflection（日次振り返り）の
入力がChatGPT経由で`do`なしに保存できるようになり、Morning Brief/
Reflectionへの入力の手間が減る可能性がある。

**懸念**：Owner自身が行う必要がある最後の一手（`.env`編集・
サービス再起動・ChatGPT Connector再作成）が、体験価値を実際に得る
までの障壁として残っている。次のセッションでこの障壁を越えられる
かが、今回の実装が実際に価値を生むかどうかの分岐点になる。

**次Versionで最も価値が高い改善**：OAuth本番有効化とChatGPT
Connector再作成をOwnerが完了させ、実際にChatGPT経由でのReflection
自動保存を1回体験すること。

## 14. 10年後のProject ARCへの貢献

今回、Constitutionという最も基礎的な文書を初めて実際に改定した
——Version9での採択以来、初めての改定である。改定の中身（委譲の
限定的な許可）そのものよりも、「改定は必ずOwner本人が文言まで確認し、
Claude Codeが独自に判断しない」という手続きを実際に踏んだこと自体が、
10年後も参照される先例になると考える。

また、Claude Codeの実行環境自体が本番影響のある操作を独自に判断で
実行しないという制約に今回初めて実際に遭遇したことは、「AIに実装を
任せる」ことと「AIに本番環境への影響力を無制限に与える」ことは
別の話である、という区別を、コードや文書ではなく実際の体験として
確認できた出来事だった。10年後、Project ARCがさらに多くの権限を
AIに委ねるようになっても、「最後の一線はOwnerの手元に残る」という
この体験に基づく安心感が、Ownerが安心してAIに委ね続けられる土台に
なると考える。
