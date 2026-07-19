# Version33 Report: Program A基盤（DevelopmentGrant・AgentTask Entity）

commit: `aa7e004`

## 1. Version概要

Owner指示「ADR完了後はProgram Aの安全な基盤工程から着手」に基づき、
ADR 0060・0061で設計した`DevelopmentGrant`・`AgentTask`をDomain〜
Adapters層まで実装した。MCP Tool・HTTP Route配線・実際の
DevelopmentGrant発行はこのVersionのスコープ外とし、Entity・
UseCase・Repositoryという「安全な基盤」に限定した——外部から呼び
出せない段階でまず状態機械とlease機構の正しさを固める判断。

## 2. 今回実装した機能（理由も含めて説明）

- **`DevelopmentGrant`Entity**（`src/domain/entities/
  DevelopmentGrant.ts`）：ADR 0060の設計をそのまま実装。
  `costCeiling`は型`0`に加え実行時検証でも0以外を拒否、
  `FORBIDDEN_OPERATIONS`はRecordではなくモジュール定数として固定。
- **`AgentTask`Entity**（`src/domain/entities/AgentTask.ts`）：
  ADR 0061の8状態機械、lease（claim/heartbeat/失効時Ready差し戻し）、
  circuit breaker（`MAX_RETRY`=3で自動Closed）を実装。
- **UseCase**：`ManageDevelopmentGrantUseCase`
  （create/pause/resume/revoke、`ManageAgentDelegationGrantUseCase`
  と同型）、`ManageAgentTaskUseCase`
  （create/markReady/claim/heartbeat/start/recordCommit/
  submitForReview/requestChanges/resumeAfterChanges/accept/close）。
  **「1 branch 1 writer」はEntity単体では判定できないため
  `ManageAgentTaskUseCase.assertBranchIsFree()`で実装**——同じbranchの
  他taskについてlease失効チェックを先に走らせ自動的にReadyへ差し戻し
  てから、残る競合を検出する。
- **Repository**：`JsonFileDevelopmentGrantRepository`・
  `JsonFileAgentTaskRepository`（既存23 Repositoryと同じ
  `jsonStore.ts`ベースのパターン）。

## 3. 実装しなかった機能（延期理由も記載）

- **MCP Tool・HTTP Route**：`agent_task_list`等の読み取り専用MCP
  Toolの追加は次Versionへ持ち越す——ADR 0038「MCP Toolは薄い
  アダプタ」の方針に沿って実装するには、`Connector`・`http/
  server.ts`への変更も伴い、本Versionのスコープ（安全な基盤=
  外部から到達できない層）を超えるため。
- **DevelopmentGrantの初回発行**：Owner専権事項（ADR 0060）。実装が
  Version終了時点で存在するだけで、実際の発行はOwnerが行う。
- **Claude Worker（task-polling runner）**：AUT-001（Owner Priority
  Programsの問題点）は未着手。AgentTask自体が先に必要なため。
- **JSON Repositoryの単体テスト**：既存23 Repositoryと同じ慣習に
  従い、UseCase層でのFake Repositoryテストに留めた（実際のJSON
  I/Oはjsonstore.tsの既存テストでカバー済み）。

## 4. Architecture Review

- 新規Entity：`DevelopmentGrant`、`AgentTask`
- 新規Port：`DevelopmentGrantRepository`、`AgentTaskRepository`
- 新規Adapter：`JsonFileDevelopmentGrantRepository`、
  `JsonFileAgentTaskRepository`
- 新規UseCase：`ManageDevelopmentGrantUseCase`、
  `ListDevelopmentGrantsUseCase`、`ManageAgentTaskUseCase`、
  `ListAgentTasksUseCase`
- 既存23 Entity・Repository・UseCaseは無変更

## 5. ADR

新規なし。ADR 0060・0061をそのまま実装した（両ADRのステータスは
Proposedのまま——「実装着手時にAccepted化」としていたが、Grantの
実発行・実運用開始まではProposedを維持し、実際にProgram Aの運用が
始まった時点でAcceptedへ更新する）。

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**570件合格**（Version32時点527件 + 43件新規：
  DevelopmentGrant Entity 15、AgentTask Entity 13、
  ManageDevelopmentGrant UseCase 5、ManageAgentTask UseCase 10）
- 実装中に発見・修正したバグ：`AgentTask`の状態機械で、circuit
  breakerが`Review`状態から直接`Closed`へ遷移しようとして
  `LEGAL_TRANSITIONS`に無い遷移としてテストが失敗した
  （`Review → Closed`を許可リストに追加して解消、7章参照）。
- `ManageAgentTaskUseCase`のlease失効・Review非対象という2つの
  境界条件を、それぞれ専用のテストケースで検証した
  （「lease失効後の再claim」「Reviewはlease対象外」）。

## 7. 修正したバグ

- **検出方法**：`AgentTask.test.ts`のcircuit breakerテストを実行した
  ところ、`Illegal AgentTask status transition: Review -> Closed`で
  失敗。
- **原因**：`requestChanges()`が`MAX_RETRY`到達時に`Closed`へ直接
  遷移しようとするが、`LEGAL_TRANSITIONS['Review']`が
  `['ChangesRequested', 'Accepted']`のみで`'Closed'`を含んでいな
  かった（ADR 0061の文章では「ChangesRequestedのまま停止」という
  やや曖昧な表現だったため、実装時に見落とした）。
- **対応**：`LEGAL_TRANSITIONS['Review']`に`'Closed'`を追加。
- **再発防止**：状態機械を持つEntityを実装する際は、ADRの自然言語
  記述だけでなく、実際に全ての到達可能な遷移パスをテストで網羅する
  ことで、今回のように実装直後に機械的に検出できる
  （`docs/HISTORY.md`2章の「実機確認でしか見つからない不具合」と
  同種の教訓——今回はtestという形の「実機確認」で発見できた）。

## 8. 技術的負債

- MCP Tool・HTTP Route未配線（次Versionで対応）
- Claude Worker（AUT-001）未着手

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Version34として、`agent_task_list`・`development_grant_list`
  （読み取り専用MCP Tool）と対応するHTTP Routeを追加し、ARCが
  AgentTaskの状態を確認できるようにする。
- DevelopmentGrantの初回発行はOwner専権のため、Owner確認の機会に
  提示すること。
- Claude Worker（task起動の自動化）は、AgentTask・DevelopmentGrantの
  実運用を1件試してから設計する方が、机上のみより精度が高い。

## 10. POへの提案

Program Aの基盤が「動くコード」として存在するようになったので、
次のOwner対話の機会に、DevelopmentGrantの初回発行条件
（scope・maxVersionCount・reason）を相談したい。

## 11. CEOへのコメント

状態機械の実装で見つけたバグ（Review→Closedの遷移漏れ）は、まさに
ADRの自然言語記述と実装の間にギャップが生まれうることを示す実例
だった。テストを書く過程でこのギャップを機械的に検出できたのは、
「実機確認」文化がユニットテストのレベルでも機能した例だと思う。

## 12. ARCへの引き継ぎ

**新しい資産**：`DevelopmentGrant`・`AgentTask`という、Program Aの
土台となる2つのEntityが動く状態で存在する。

**新しいルール**：「1 branch 1 writer」は、Entity単体ではなく
UseCase層（複数taskを横断する必要があるため）で強制する、という
実装パターンを確立した。今後、複数Entityをまたいだ整合性チェックが
必要な場面では同じ配置（UseCase層）を踏襲する。

**新しい思想**：leaseの対象をClaimed/InProgressに限定し、
Review/ChangesRequestedを対象外としたのは、「アクティブに作業中の
状態」と「判断待ちで止まっている状態」を区別する新しい設計判断
——前者は時間経過で自動解放してよいが、後者はOwner/ARCの明示的な
判断でしか動かない。

**Ownerについて分かったこと**：ADRのステータスを「実装したら即
Accepted」ではなく「実運用開始まではProposedを維持する」という
判断は、今回Claude Code自身の判断で行った——Version30で発見した
「ADR 0051の記録が実態と食い違っていた」という教訓を踏まえ、
「記録した」と「実際に運用されている」を混同しないよう、より
慎重にステータスを扱うようになった。

## 13. Product Review

**ユーザー体験で改善されたこと**：直接の体験変化はない
（MCP Tool未配線のため、まだARC・Owner本人からは触れられない）。

**毎日使う理由**：変化なし。

**懸念**：基盤ができてから実際にProgram Aとして機能するまでの
距離（MCP Tool配線、Claude Worker、実際のGrant発行）がまだ長い。
次Versionで最低限の「見える化」（MCP Tool経由の読み取り）を優先
すべき。

**次Versionで最も価値が高い改善**：`agent_task_list`をMCP Tool化
し、ARCが「今どんなtaskが動いているか」を確認できるようにすること
——これがProgram Aの体験の最初の一歩になる。

## 14. 10年後のProject ARCへの貢献

Version33は、Project ARC自身の開発プロセスをコードとして表現した
最初のVersionである。これまでのVersionはOwnerの生活記録・意思決定を
支援するためのEntityだったが、`AgentTask`はProject ARC自身の開発
work-itemを表現する。10年後、Project ARCがどれだけ多くのAI
エージェント（Claude Code・Codex・将来登場する別のAI）によって
開発され続けているとしても、「1 branch 1 writer」「costCeiling
固定」「circuit breaker」という、今回コードに落とし込んだ境界が、
開発プロセス自体の暴走を防ぐ土台であり続けることを期待する。
