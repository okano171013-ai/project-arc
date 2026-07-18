# ADR 0054: Version27「Study Session Ingestion」

## ステータス

承認済み（AgentMessage id `9ea53178-587f-4287-81f7-3b3a68634d90`、
relatedVersion: Version21のタグだが実際にはVersion21完了後に届いた
別件の指示。Ownerが2026-07-18のセッションで実装を承認）

## 関連Principle

- Constitution第2条（Systemは、判断しない）
- ADR 0022（無認証Remote MCPの脅威モデル）・ADR 0044（Remote MCP
  無認証の理由）・ADR 0049（Remote MCP OAuth 2.1試作）
- ADR 0034〜0036（Connector層の役割、HTTP APIのみを利用する制約）
- ADR 0038（MCP Tool層はConnectorのみに依存し、Application/Domain層を
  importしない）
- ADR 0053（Version26、Interventionの生成を意図的にMCP Tool化・HTTP
  Route化しなかった判断——「無認証の公開エンドポイントに新しい書き込み
  経路を安易に増やさない」という教訓）

## コンテキスト

ARC（ChatGPT）から、Owner本人が使う外部の学習タイマーアプリ（ARC
Study Timer）から学習セッションのログを受信・保存するHTTPS APIの
実装依頼が届いていた（`docs/handoff/archive/Version27_ARC_Brief.md`
参照）。要件は概ね次の通り：

- `POST /api/study-sessions`：`sessionId`・`subject`・`task`・
  `startedAt`・`endedAt`・`durationMs`・`source`・`clientCreatedAt`を
  受け取り、`sessionId`で冪等化する。
- 認証は環境変数で設定するBearer token。CORSは許可オリジンを環境変数
  で制限する。
- 入力検証（最大duration、異常な未来時刻、欠損値の拒否）。
- `GET /api/study-sessions/summary?from=&to=`で期間集計。
- **既存のWrite Proposal Layer（`/proposal/create`→承認→
  `/proposal/approve`）とは別の経路**として、タイマー専用のtokenを
  持つリクエストのみ、この固定スキーマに限定して自動保存を許可する
  ——Reflection/Memory等への汎用書き込みには使えないようにする。

この指示はVersion21完了後に届いていたが、当時見落とされ、Version22〜
26では対応されていなかった（今回のセッションで発見・着手）。

## 決定

### 1. どのプロセスに実装するか：`server.ts`ではなく`remoteServer.ts`側で公開する

Project ARCには2つのHTTPプロセスがある：

- `server.ts`（ARC Connector HTTP API、port 3939）——**127.0.0.1限定**。
  Version15〜26の全機能はここに実装されてきた。
- `remoteServer.ts`（Remote MCP Server、port 3940）——`scripts/
  start-all.ps1`が実際にngrokでトンネルする**唯一の**公開プロセス
  （ADR 0044）。

外部のARC Study Timerが到達できるのは`remoteServer.ts`側のみである。
`server.ts`だけに実装しても、Owner自身が別途もう1本トンネルを立てない
限り外部から到達できず、指示書の目的（外部タイマーからの受信）を
満たせない。

したがって、実際のUseCase・Repository・検証ロジックは既存の慣習
どおり`server.ts`に実装した上で、`remoteServer.ts`に薄い転送レイヤー
（`studySessionRoute.ts`）を追加し、認証を通過したリクエストを
**既存の`Connector`**（Version15、ADR 0034〜0036）経由で`server.ts`
へ内部転送する構成とした。MCP Tool層と同じ「Connectorのみに依存し、
Application/Domain層を直接importしない」原則（ADR 0038）を、この
非MCPな新規ルートにもそのまま適用している。

### 2. 認証：専用token・fail-closed

`STUDY_TIMER_API_TOKEN`という、既存の`ARC_API_KEY`・
`MCP_OAUTH_OWNER_PASSCODE`とは独立した新しい秘密情報を導入した。

`ARC_API_KEY`（Version15、ADR 0036）は未設定時に無認証で開く
（opt-in）——`server.ts`が127.0.0.1限定だからこそ許容される設計
だった。しかし`/api/study-sessions`は**常時公開トンネル上に存在する**
ため、同じ「未設定なら無認証で開く」設計は取れない。`STUDY_TIMER_
API_TOKEN`が未設定なら、このルートは常に401を返す（fail-closed）——
`MCP_OAUTH_ENABLED`のような「既定false」ではなく「既定拒否」である
点が異なる。

CORS許可オリジン（`STUDY_TIMER_ALLOWED_ORIGINS`）も同様に、未設定
なら一切のcrossoriginヘッダーを付与しない（ブラウザからの
クロスオリジン呼び出しは常に失敗する）。Shortcuts等の非ブラウザ
クライアントはCORSの対象外のため、この既定でも動作する。

### 3. 書き込み経路を増やさない、という既存方針との関係

ADR 0039（書き込み経路を増やさない方針）・ADR 0053（Version26で
Interventionの生成をHTTP Route化しなかった判断）は、いずれも
「無認証のRemote MCPに新しい書き込み可能エンドポイントを増やさない」
という文脈だった。今回のエンドポイントは**指示書自身が意図的に
Proposal Layerの外側に別の書き込み経路を作ることを要求している**
点が異なる——ただし無認証ではなく、専用のfail-closedなBearer token
という独立した認証境界を持つ。ARC自身（MCP Tool経由）はこの経路を
呼び出す手段を持たない——`connector.recordStudySession`/
`connector.summarizeStudySessions`に対応するMCP Toolは意図的に
用意しなかった。これにより「Reflection/Memory等の汎用書き込みには
使えない」という指示書の要件を、ARCが原理的に別の書き込みに転用
できない形で満たしている。

### 4. 検証：最大duration・未来時刻・欠損値

`StudySession.create()`で以下を構造的に強制する：

- `sessionId`・`subject`・`source`は必須（空文字・欠損を拒否）。
- `durationMs`は正の数かつ12時間以内（`MAX_DURATION_MS`）。
- `startedAt`・`endedAt`・`clientCreatedAt`はいずれも有効なISO8601
  日時であり、サーバー時刻から5分（`FUTURE_TOLERANCE_MS`、クロック
  スキュー許容幅）を超える未来を拒否する。
- `endedAt`は`startedAt`より後でなければならない。

### 5. 冪等化：`sessionId`によるdedup（既存パターンの再利用）

Version25のidempotencyKey方式（`MealLog`等）と同じ設計——
Repository自体に一意制約を持たせず、UseCase層で`findAll()`から
`sessionId`一致を探す。重複時は新規保存せず既存レコードを返し、
`{ok:true, duplicate:true, sessionId}`を返す（指示書の応答仕様通り）。

## 影響

**新規**

- Entity: `StudySession`
- Port: `StudySessionRepository`
- Adapter: `JsonFileStudySessionRepository`
- UseCase: `RecordStudySessionUseCase`・`SummarizeStudySessionsUseCase`
- Infrastructure: `studySessionRoute.ts`（`remoteServer.ts`専用の
  認証・CORS・転送ロジック）
- 環境変数: `STUDY_TIMER_API_TOKEN`・`STUDY_TIMER_ALLOWED_ORIGINS`

**変更**

- `server.ts`：`POST /api/study-sessions`・`GET /api/study-sessions/
  summary`を追加（既存の`ARC_API_KEY`ゲートの対象内）
- `Connector`：`recordStudySession`・`summarizeStudySessions`を追加
- `remoteServer.ts`：`createRemoteMcpApp`が第3引数
  `StudySessionRouteOptions`を受け取れるよう拡張。`/mcp`のOAuth有無
  とは独立に、`/api/study-sessions`系パスを`studySessionRoute.ts`へ
  委譲する

**変更しなかったもの**

- MCP Tool一覧（23件のまま）——この機能に対応するMCP Toolは意図的に
  追加していない
- 既存のWrite Proposal Layer・ApprovalDecision・AgentDelegationGrant
  の挙動

## 検討した代替案

1. **`server.ts`側だけに実装し、Ownerに2本目のトンネル運用を依頼する**
   ——却下。無料ngrokの制約・運用の複雑化に対し、既存の公開プロセス
   （`remoteServer.ts`）に薄い転送層を足すだけで済む本採用案の方が
   低コストで、新たな公開ポート・DNS・証明書の管理も増えない。
2. **`remoteServer.ts`に直接UseCase/Repositoryを実装する**——却下。
   ADR 0038の「Connectorのみに依存する」境界を破り、`server.ts`との
   間でRepository実装・データディレクトリ設定が二重管理になる。
3. **既存のWrite Proposal Layer（`AgentDelegationGrant`）を拡張して
   タイマーにも使わせる**——却下。指示書が「既存Proposal承認経路とは
   別に」と明示しており、`AgentDelegationGrant`はOwnerがChatGPT経由で
   発行・取消しする委譲であって、外部タイマーアプリが直接保持する
   token とは性質が異なる（クレデンシャルの所在・失効経路が別物）。
