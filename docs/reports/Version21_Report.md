# Version21 Report: Approval Policy Engine

**コミットハッシュ**：`4ebde7d`（`feature/v4-v6-smart-capture`ブランチ）

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：Approval Policy Engine。ARCからAgentMessage
（id `6b78f23d-...`）で届いた正式指示に基づく。目的は「Claude Codeの
承認要求を可能な限りARCが代行し、Ownerには重要事項のみを上げる」こと。
Level0（Claude Code）・Level1（ARC）・Level2（Owner）の3段階承認
レベル、判定の監査可能な記録、境界事例のエスカレーション、Level2の
迂回不能性、Constitution第2条との整合確認（矛盾するなら実装せず
Ownerへ提案）が必須要件として明示されていた。

指示書自身が「実装前に現行Constitution・ADR・Proposal境界を確認し、
Level分類表と例外一覧を提示してください」と求めていたため、Plan Mode
で governance分析→分類表→実装範囲をOwnerへ提示し、承認を得てから
実装した（詳細は3章）。

## 2. 今回実装した機能（理由も含めて説明）

### Approval Policy Engine本体

- **`ApprovalSignals`**（`src/domain/value-objects/ApprovalLevel.ts`）：
  Owner指示書が列挙した6カテゴリ（有料サービス・外部公開拡大・
  認証変更・破壊的操作・個人情報の外部送信・Constitution変更）に
  そのまま対応する構造化boolean フラグ。
- **`ClassifyApprovalLevelUseCase`**：`signals`のみを入力とする
  決定的な分類関数。いずれかのsignalがtrueならLevel2、`signals`
  省略時はLevel1へエスカレーション（境界事例の安全側処理、指示書
  要件2）、明示的に全てfalseならLevel0。`target`/`reason`等の自由
  記述テキストの意味は一切解釈しない——ADR 0022（CandidateBuilder）・
  ADR 0029（IntentDetector）が確立した「決定的パターンマッチングは
  Constitution第2条の『判断』にあたらない」という前例をそのまま
  踏襲した。
- **`ApprovalDecision`**（新Entity）：`AgentMessage`と同型の追記のみの
  監査ログ。`WriteProposalGatewayUseCase`のcreate/approve/rejectの
  たびに機械的に1件記録される（指示書要件1）。Proposal自体とは異なり
  Write Proposal Layerを経由しない——決定的な計算結果の記録であり、
  Owner承認の対象にはならない（ADR 0048）。
- **サーバー側再計算**：`approveProposal`/`rejectProposal`は、渡された
  `Proposal.approvalLevel`（表示用フィールド）を信用せず、
  `Proposal.signals`から必ず再計算する。クライアントが表示用
  フィールドだけを書き換えて再送しても、監査ログには常に本当の
  Levelが記録される。

### 配線（Interface Adapters / Infrastructure層）

- `JsonFileApprovalDecisionRepository`（`AgentMessage`用Repositoryと
  同型）
- `Connector.listApprovalDecisions()`、`CreateProposalInput`/
  `ConnectorProposal`への`signals`/`approvalLevel`追加
- `POST /proposal/create`が`signals`を受け付け、新規`GET
  /approval-decisions`ルートを追加
- MCP Tool `approval_decision_list`（読み取り専用）を新規追加。
  `proposal_create`/`proposal_approve`/`proposal_reject`は
  `proposalShape`への追加のみで自動的に`signals`/`approvalLevel`へ
  対応（新規の書き込みツールは追加していない、ADR 0039の「書き込み
  経路を増やさない」方針を継続）
- `docs/openapi.json`生成スクリプトに`/approval-decisions`を追加

## 3. 実装しなかった機能（延期理由も記載）

着手前の governance確認（Constitution・ai-roles.md・ADR 0031/0039/
0044/0045/0046）で、指示書を字義通り実装すると既存の設計保証と
衝突する箇所を2点発見し、指示書要件4「変更が必要なら実装せずOwnerへ
提案する」に従い、いずれも実装しなかった（Plan ModeでOwner承認済み、
詳細はADR 0048）。

1. **「Level1: ARCがProposal承認を代行する」の文字通りの実装**：
   ADR 0031の「Ownerの再送が承認の証」という設計保証、および
   `docs/ai-roles.md`のContinuous Collaborationループが明記する
   「Ownerが『do』で承認」を、一部のProposalについて外すことになる
   ——Constitution第4条に直接影響する運用変更のため見送った。
2. **Level2の迂回を暗号学的に防ぐ仕組み（認証の再導入）**：ADR 0044で
   Remote MCPのBearer認証は撤回済みであり、現状Project ARCは
   リクエストの発信者を技術的に区別できない。真の「迂回不能」には
   認証機構が必要だが、これは指示書自身の分類でLevel2（認証変更）に
   該当し、自己参照的に実装できないため見送った。

代わりに、「迂回を難しくする・迂回を検出可能にする」レベルの対策
（サーバー側再計算、監査ログ）に留めた。

## 4. Architecture Review

**新規**
- Entity: `ApprovalDecision`
- Value Object: `ApprovalLevel`/`ApprovalSignals`
- UseCase: `ClassifyApprovalLevelUseCase`、`RecordApprovalDecisionUseCase`、
  `ListApprovalDecisionsUseCase`
- Port: `ApprovalDecisionRepository`
- Adapter: `JsonFileApprovalDecisionRepository`
- MCP Tool: `approval_decision_list`

**変更**
- `Proposal`（VO）：`signals?`/`approvalLevel?`追加（後方互換）
- `WriteProposalGatewayUseCase`：`approvalDecisionRepository`を
  コンストラクタに追加。`createProposal`/`rejectProposal`が同期から
  非同期（`Promise`を返す）へ変更——呼び出し元3箇所
  （`propose.ts`・`http/server.ts`・テスト）を`await`するよう更新
- `Connector`：`CreateProposalInput`/`ConnectorProposal`へ`signals`/
  `approvalLevel`追加、`listApprovalDecisions()`追加
- `serializers.ts`：`serializeProposal`が`signals`/`approvalLevel`を
  含むよう変更、`serializeApprovalDecision`追加
- `http/server.ts`：`GET /approval-decisions`追加、`/proposal/create`
  が`signals`を読み取り
- `generateOpenApi.ts`：`/approval-decisions`追加、`Proposal`スキーマに
  `signals`/`approvalLevel`追加

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0048**（新規）：Approval Policy Engineのスコープを「構造化
  signalsの機械的分類」に限定する理由、および実装しなかった2点の
  記録。

新規のアーキテクチャ層・抽象化は追加していないため（既存の
ManagementFeedback/AgentMessageパターンをそのまま踏襲）、他のADRは
不要と判断した。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：276件全て緑（Version20時点256件から+20件。
  `ApprovalDecision`・`ClassifyApprovalLevelUseCase`・
  `RecordApprovalDecisionUseCase`・`ListApprovalDecisionsUseCase`の
  新規テストと、`WriteProposalGatewayUseCase`への追加テスト
  （signals分類・エスカレーション・level詐称の無効化・監査記録）を
  含む）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認（MCP、実プロトコル経由）**：`src/infrastructure/mcp/
  server.test.ts`に、実HTTPサーバー・実Connector・実MCP Client
  （`InMemoryTransport`、JSON Schema検証込み）を介して`signals`付き
  `proposal_create`→`approval_decision_list`→`proposal_approve`→
  `approval_decision_list`を駆動するテストを追加し、Level2分類・
  監査記録の一連を確認した。MCP Tool一覧が9→10件になったことを
  `server.test.ts`・`remoteServer.test.ts`（10→11件）で更新済み。
- **実機確認（HTTP、実プロセス経由）**：`scripts/start-all.ps1`で
  実際に`pnpm run api`/`pnpm run mcp:remote`を再起動し、`node -e
  fetch`（Bearer認証込み、CLAUDE.mdの既存方針どおりcurlは使わず）で
  `POST /proposal/create`（signals付き）→`GET /approval-decisions`→
  `POST /proposal/approve`→`GET /approval-decisions`の一連を実際の
  HTTPリクエストで確認した。Level2分類・サーバー側再計算・監査ログの
  積み上がりを確認済み。検証用データ（`data/memory.json`・`data/
  approval-decisions.json`）は確認後に削除済み。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

なし。今回は新規追加のみで、既存機能の修正は発生しなかった。

## 8. 技術的負債（今後改善したい点）

- `signals`は呼び出し側の自己申告であり、虚偽の宣言を技術的に防ぐ
  手段がない（ADR 0048に明記済みの既知の限界）。監査ログとの突き合わせ
  による事後発覚に留まる。
- `ApprovalDecision`はBridge Layer（Import/Export、ADR 0010）に
  統合していない——監査ログという性質上、他の生活記録（Reflection等）
  と同列にExport対象へ含めるべきかは次Version以降の判断課題として
  残した。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- ADR 0048で提起した2つの論点（ARCによるProposal承認代行の是非、
  Level2の暗号学的な迂回不能化＝認証再導入の是非）は、いずれも
  Owner・ARCとの対話を経て次のVersionの指示書に反映されるべき事項。
  特に後者は、Remote MCPが無認証である現状（ADR 0044）そのものの
  再検討につながるため、単独のVersionテーマとして扱う価値がある。
- `approval_decision_list`が返す監査ログを、Morning Brief/Timeline等
  既存の「毎日触れる」導線にどう統合するかは未検討。現状はARC/Owner が
  能動的に`approval_decision_list`を呼ばない限り可視化されない。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- Level0/1/2の分類自体は今回で機械的に機能するようになったが、
  「ARCが実際にどのLevelでどれだけの意思決定を代行しているか」を
  Ownerが定期的に振り返れる仕組み（例：週次の`approval_decision_list`
  サマリ）があると、Owner・ARCの信頼関係の育成に役立つと考える。
  現時点ではAPI呼び出しでしか見えないため、次Versionで検討候補として
  挙げたい。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

指示書自身が「実装前にLevel分類表と例外一覧を提示する」ことを
求めていたことで、実装より先にgovernance確認を行う構造になり、
結果として2つの重要な設計上の緊張（Owner決定権とARC代行の境界、
無認証環境下での「迂回不能」の実現可能性）を、コードを書く前に
言語化できた。これはVersion19・20で確立した「字義通りの実装より
上位ドキュメントを優先する」というパターン（ADR 0045・0046）の
継続であり、Approval Policy Engine自体がこのパターンを体現する
最初の実例になったとも言える。

## 12. ARCへの引き継ぎ

**新しい資産**：`signals`を伴う`proposal_create`と、
`approval_decision_list`による監査ログ参照。ARCが今後Proposalを
起案する際、`costImpact`等のフラグを申告することで、Ownerが
Proposalの重大度を一目で把握できるようになった。

**新しいルール**：承認レベルの分類は「構造化フラグの機械的lookup」
のみで行い、`target`/`reason`の文面解釈では行わない。ARCがProposalを
書く際、重大度を伝えたければ文章ではなく`signals`で明示的に申告する
必要がある（申告しなければLevel1として扱われる）。

**新しい思想**：「承認プロセスを効率化する」という要求であっても、
それがConstitution第4条（Ownerが最終決定する）の実質を変えるかどうかを
先に問う、という判断パターンがVersion19（ADR 0045）・Version20
（ADR 0046）に続き今回も機能した。効率化の要求と、決定権限の所在は
別の軸であるという整理が、Project ARC全体で一貫しつつある。

**Ownerについて分かったこと**：Plan Modeで「実装しない2点」を含む
governance分析を提示した際、追加の質疑なく承認された。Version20の
AskUserQuestion（Runnerのスコープ）と同様、Claude Codeが根拠を示して
保守的な選択をする判断には、細部を問い直さず信頼する傾向が見られる。

## 13. Product Review

**ユーザー体験で改善されたこと**：直接的なUI変化はない（Approval
Policy Engineはインフラ層の機能のため）。間接的には、Owner・ARCの
やり取りにおいて「これはどのくらい重要な提案か」が`signals`という
明示的な形で伝わるようになった。

**毎日使う理由**：既存の毎日使う機能（Morning Brief/Reflection等）に
変化はない。

**懸念**：`approval_decision_list`は能動的に呼ばない限り見えない
ため、実際にOwnerがこの監査ログを見る機会が少ないと機能が形骸化する
リスクがある。

**次Versionで最も価値が高い改善**：ADR 0048が提起した2つの論点
（ARC代行の是非、認証再導入の是非）についてOwner・ARCと対話し、
方向性を確定させること。技術的な追加機能よりも、この意思決定が
次の実装の前提を左右する。

## 14. 10年後のProject ARCへの貢献

Approval Policy Engineという名前だけを見ると「AIの自律性を広げる
機能」に見えるが、今回実際に実装したのは「AIの自律性を広げる前に、
どこまでが本当に安全に自動化できるかを機械的に切り分ける土台」
だった。10年後、Project ARCがより多くの判断をAIに委ねるようになった
としても、「Ownerの再送が承認の証」という単純な仕組み（ADR 0031）が
アーキテクチャレベルで守られ続ける限り、Ownerは常に最終防衛線を
持ち続けられる。

今回の最大の設計判断は、機能を作らなかったこと——ARCによる承認代行や
認証の再導入という、便利だが不可逆な判断を、コードではなくADRという
言葉で次のOwnerの意思決定に委ねたことにある。「人生OS」という
Visionにとって、便利さより先に「誰が最終決定者であり続けるか」を
守り抜く判断ができたことが、10年後にも参照される土台になると考える。
