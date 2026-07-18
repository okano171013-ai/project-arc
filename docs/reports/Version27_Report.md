# Version27 Report: Study Session Ingestion

`docs/reports/TEMPLATE.md`の14章構成に準拠。

**コミットハッシュ**：`c5e0896`（`feature/v4-v6-smart-capture`ブランチ）

## 1. Version概要

**テーマ**：ARC Study Timer（Owner本人が使う外部の学習タイマーアプリ）
から学習セッションのログを安全に受信・保存する専用HTTPS APIの実装。
指示はAgentMessage（id `9ea53178-587f-4287-81f7-3b3a68634d90`、
relatedVersionタグは`Version21`だが、実際にはVersion21完了後に届いた
別件の依頼）による——`POST /api/study-sessions`・`GET /api/study-
sessions/summary`、専用Bearer token認証、CORS制限、既存のWrite
Proposal Layerとは別の書き込み経路を求めた。この指示はVersion22〜26で
見落とされ続けており、今回のセッションで`agent_message_list`の
全件確認により発見・着手した。

## 2. 今回実装した機能（理由も含めて説明）

### `StudySession` Entity

`sessionId`（クライアント側が発行する冪等化キー）・`subject`・
`task`・`startedAt`・`endedAt`・`durationMs`・`source`・
`clientCreatedAt`を保持する。`create()`で構造的に検証する：

- `sessionId`/`subject`/`source`は必須（空文字・欠損を拒否）
- `durationMs`は正の数かつ12時間以内（`MAX_DURATION_MS`、1セッション
  として非現実的な長さを拒否）
- `startedAt`/`endedAt`/`clientCreatedAt`は5分のクロックスキュー
  許容幅を超える未来時刻を拒否（`FUTURE_TOLERANCE_MS`）
- `endedAt`は`startedAt`より後でなければならない

### 公開エンドポイントの配置：`remoteServer.ts`側

Project ARCには2つのHTTPプロセスがあり、`scripts/start-all.ps1`が
実際にngrokでトンネルするのは`remoteServer.ts`（Remote MCP、port
3940）のみ——`server.ts`（ARC Connector HTTP API、port 3939）は
127.0.0.1限定のまま変更していない。外部のARC Study Timerが到達できる
のは`remoteServer.ts`側だけであるため、実際のUseCase・Repository・
検証ロジックは既存慣習どおり`server.ts`に実装しつつ、`remoteServer.ts`
には認証・CORS・内部転送のみを行う薄い層（`studySessionRoute.ts`）を
追加した。転送は既存の`Connector`（Version15）経由で行い、MCP Tool層
と同じ「Connectorのみに依存し、Application/Domain層を直接importしな
い」原則（ADR 0038）をこの非MCPな新規ルートにも適用した（詳細はADR
0054参照）。

### 専用のfail-closed認証

`STUDY_TIMER_API_TOKEN`という、`ARC_API_KEY`・`MCP_OAUTH_OWNER_
PASSCODE`とは独立した新しい環境変数を導入した。`ARC_API_KEY`
（Version15）は未設定時に無認証で開く設計だが、これは`server.ts`が
127.0.0.1限定だからこそ許容されていた。`/api/study-sessions`は常時
公開トンネル上に存在するため、`STUDY_TIMER_API_TOKEN`が未設定なら
このルートは常に401を返す（fail-closed）——他の環境変数と設計思想が
逆転している点をADR 0054に明記した。CORS許可オリジン
（`STUDY_TIMER_ALLOWED_ORIGINS`）も同様に、未設定なら一切のCORS
ヘッダーを付与しない。

### 書き込み経路を増やさない既存方針との関係

ADR 0039・ADR 0053（Version26）は「無認証のRemote MCPに新しい書き込み
可能エンドポイントを増やさない」という文脈だった。今回のエンドポイント
は指示書自身が意図的にProposal Layerの外側に別経路を作ることを要求
している点が異なる——ただし無認証ではなく専用のfail-closedな Bearer
tokenという独立した認証境界を持つ。ARC自身（MCP Tool経由）はこの経路
を呼び出す手段を持たない——対応するMCP Toolは意図的に用意していない。
これにより「Reflection/Memory等の汎用書き込みには使えない」という
指示書の要件を、ARCが原理的に別の書き込みに転用できない形で満たして
いる。

### 冪等化：`sessionId`によるdedup

Version25のidempotencyKey方式（`MealLog`等）と同型——Repository自体に
一意制約を持たせず、UseCase層で`findAll()`から`sessionId`一致を探す。
重複時は新規保存せず既存レコードを返し、指示書の応答仕様通り
`{ok:true, duplicate:true, sessionId}`を返す。

## 3. 実装しなかった機能（延期理由も記載）

1. **実際のngrokトンネル経由・実タイマーアプリからの疎通確認**：
   Claude Codeの実行環境では外部ネットワーク・実デバイスからの到達を
   検証できない。Owner自身が`STUDY_TIMER_API_TOKEN`を`.env`へ設定し、
   タイマーアプリ側にBearer tokenを渡した上での実地確認が必要
   （OAuth本番有効化と同様、秘密情報の設定を伴うためClaude Codeの
   実行環境の安全機構によりブロックされる）。
2. **対応するMCP Tool**：意図的に追加していない（2章参照、ARCが
   この経路を呼び出せないようにする設計上の判断）。
3. **`durationMs`と`endedAt - startedAt`の厳密な整合性チェック**：
   指示書は「最大duration」の拒否のみを求めており、両者の差分が
   厳密に一致することまでは要求していない（クライアント側の丸め・
   一時停止等の余地を残す、YAGNI）。

## 4. Architecture Review

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
  summary`を追加（既存の`ARC_API_KEY`ゲートの対象内、他のルートと
  同じ`ok()`/`fail()`/`route()`パターンを再利用）
- `Connector`：`recordStudySession`・`summarizeStudySessions`を追加
  （既存のRead/Write系メソッドと同型）
- `remoteServer.ts`：`createRemoteMcpApp`が第3引数
  `StudySessionRouteOptions`を受け取れるよう拡張。`/mcp`のOAuth有無
  とは独立に、`/api/study-sessions`系パスを`studySessionRoute.ts`へ
  委譲する（非OAuth分岐・Express/OAuth分岐の両方に配線）
- `env.ts`・`.env.example`：新規環境変数2つを追加

**変更しなかったもの**

- MCP Tool一覧（23件のまま）
- 既存のWrite Proposal Layer・ApprovalDecision・AgentDelegationGrant
  の挙動
- `/mcp`エンドポイント自体の認証挙動（ADR 0044・0049）

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0054**（新規）：プロセス配置の判断（`server.ts`ではなく
  `remoteServer.ts`側で公開する理由）、fail-closed認証の設計理由、
  書き込み経路を増やさない既存方針との関係、検討した代替案3つ。
- 既存ADR（0034〜0036、0038、0039、0053）は変更なし——本Versionは
  これらが確立した設計パターン（Connector経由の内部転送、書き込み
  経路を安易に増やさない判断基準）を新しい文脈へ適用したのみ。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：504件全て緑（Version26完了時点478件から+26件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実HTTPリクエストでの実機確認**（`server.test.ts`・
  `remoteServer.studySession.test.ts`、実際の`node:http`サーバーに
  対する実際の`fetch`）：
  1. 無Authorizationヘッダー・誤tokenでの401拒否
  2. 正しいtokenでの新規保存（201、`{ok:true, sessionId, storedAt}`）
  3. 同一`sessionId`再送時のdedup（200、
     `{ok:true, duplicate:true, sessionId}`）
  4. 不正レコード（`durationMs: 0`等）の拒否（400）
  5. `GET /api/study-sessions/summary`での期間集計（科目別・合計）
  6. 許可オリジンのみへのCORSヘッダー付与、非許可オリジンには
     付与されないことを確認
  7. OPTIONSプリフライトが認証なしで204を返すことを確認
  8. `/mcp`エンドポイントが本機能追加の影響を受けず、無認証のまま
     動作し続けることを確認（ADR 0044の回帰確認）
  9. `STUDY_TIMER_API_TOKEN`未設定時は、いかなるBearer tokenを
     渡しても全リクエストが401になることを確認（fail-closedの直接
     検証）

  Version7以降のHTTP API検証方針（対話式CLIと異なりTTY制約を受けず、
  実サーバー・実`fetch`によるテストがそのまま実機確認を兼ねる）に
  従い、上記はすべて自動テストとして実装・実行済み。検証用の一時
  データディレクトリはテストの`afterAll`で自動削除される。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

- **HTTPレベルのテストで未来時刻扱いになったタイムスタンプ**：
  当初、テストの学習セッション記録に`2026-07-18T10:00:00.000Z`を
  使っていたが、サンドボックスの実システム時刻が同日`03:34 UTC`
  だったため、`StudySession`の「5分を超える未来を拒否」する検証に
  実際に引っかかり400エラーになった（`pnpm test`実行で即座に発覚）。
  HTTP経由のテストは`now`を注入できないため、実行時刻に対して
  安全に過去となる固定日付（前日、`2026-07-17`）に変更して解消した
  ——Entity単体テストは`now`を明示的に注入しているため影響なし。

## 8. 技術的負債（今後改善したい点）

- `remoteServer.ts`の`createRemoteMcpApp`は、非OAuth分岐（生の
  `node:http`）とOAuth分岐（Express）の2箇所に`studySessionRoute`の
  呼び出しを個別に書いている——OAuth機能追加時と同じ二重配線の
  パターン（Version22のOAuth追加時から続く構造）。3つ目の独立した
  認証境界を追加する機会があれば、共通化を検討する価値がある。
- `server.ts`の`/api/study-sessions`系ルートは、他の全ルートと同じ
  `ARC_API_KEY`ゲートの対象内になっている——`remoteServer.ts`からの
  内部転送以外の経路（Owner自身がローカルで直接叩く等）でも到達可能
  なままであり、意図的な設計ではあるが明示的に文書化していなかった
  点をADR 0054で補った。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- `STUDY_TIMER_API_TOKEN`の実運用設定（Owner自身の`.env`編集）と、
  実際のARC Study Timerアプリからの疎通確認。
- StudyLog（学習ログ）は依然として未配線のままである（Version23〜26
  から継続）。`StudySession`（今回追加）はStudyLogとは別のEntityで
  あり、両者の関係（統合するか、別の粒度として併存させるか）を
  Ownerに確認する必要がある。

## 10. StudyLog未配線問題

`StudySession`（今回追加、外部タイマーからの1セッション単位のログ）
と、既存の`StudyLog`（未配線のまま、Version23〜26で繰り返し指摘）は
別のEntityである。今回はStudyLogの配線作業は行っていない——指示書の
主目的（外部タイマーからの受信）に直接関係しないため。両者の統合可否
はOwner確認が必要な次Version候補として残る。

## 11. POへの提案（提案・懸念点・改善案を自由に記載）

- `STUDY_TIMER_API_TOKEN`が実際に設定・運用され始めたら、
  `/api/study-sessions/summary`をMorning Brief等の既存の日次表示へ
  統合するかどうかを検討する価値がある（現状は独立したエンドポイント
  として存在するのみ）。

## 12. ARCへの引き継ぎ

**新しい資産**：`POST /api/study-sessions`・`GET /api/study-sessions/
summary`——ARC Study Timerが専用tokenを使って学習セッションを自動
保存できる。ARC自身（MCP Tool経由）はこの経路を呼び出せない——
既存の`proposal_create`/`approve`フローとは完全に独立している。

**新しい設計パターン**：「公開トンネル上の常時稼働エンドポイントは
fail-closedを既定にする」という原則を、`ARC_API_KEY`のopt-in既定
（127.0.0.1限定だから許容される）と明確に区別した形で確立した
（ADR 0054）。今後、外部サービスからの受信エンドポイントを追加する
際は、この判断基準（到達範囲が127.0.0.1限定かどうか）を踏襲すべき。

**Ownerについて分かったこと**：Version21完了直後に届いていた指示が
Version22〜26の5つのVersionにわたって見落とされ続けていた——
`agent_message_list`の全件確認を怠らず定期的に行うことの重要性が、
今回のセッションで具体的な実例として裏付けられた（`docs/handoff/
README.md`「経路B」の運用ルールを改めて徹底する必要がある）。

## 13. Product Review

**ユーザー体験で改善されたこと**：コードレベルでは、外部学習タイマー
からのログ受信基盤が完成した。ただし`STUDY_TIMER_API_TOKEN`の実運用
設定が完了するまでは、Ownerが実際に「タイマーで測った学習時間が自動で
記録される」体験を得られる状態にはなっていない。

**毎日使う理由**：`GET /api/study-sessions/summary`により、科目別の
学習時間集計を期間指定で取得できる——手入力のReflectionに頼らない、
タイマーアプリ由来の正確な学習時間記録が加わる。

**懸念**：`STUDY_TIMER_API_TOKEN`の設定・実タイマーアプリ側の対応
実装がOwner自身の作業として残っており、それが完了するまでこの機能は
実質的に稼働しない。

**次Versionで最も価値が高い改善**：`STUDY_TIMER_API_TOKEN`の実運用
設定が完了し、実際にARC Study Timerからのログが記録され始めること。
それによって初めて、`StudySession`と既存の`StudyLog`（未配線）との
関係整理という次の課題が現実的な優先度を持つようになる。

## 14. 10年後のProject ARCへの貢献

「未対応のまま複数Versionにわたって見落とされていた指示が、
`agent_message_list`の全件確認によって発見・解消された」という
今回の経緯は、ARC⇄Claude Codeの2経路併存運用（`docs/handoff/
README.md`）における失敗モードの具体例として記録する価値がある——
10年後、指示の経路がさらに増えたとしても、「セッション開始時に
全ての経路を機械的に確認する」という運用ルール自体は変わらず
有効であるべきだと考える。

また、「公開トンネル上の常時稼働エンドポイントはfail-closedを既定に
する」という今回確立した判断基準は、Project ARCが将来さらに多くの
外部連携（Screen Time、Opal等、Version26で調査のみに留めたもの）を
実装する際、認証設計の出発点として繰り返し参照されるべき原則になると
考える。
