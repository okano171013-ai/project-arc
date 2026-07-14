# Version14 Report: ARC Integration

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：ARC Integration — 「ARCがProject ARCを安全に読み、
Ownerの承認のもとで書き込めるようにする。」Version13完了報告に
対するOwnerからのメッセージとして届いた指示書に基づく（原文は
`docs/handoff/archive/Version14_ARC_Brief.md`に保管）。

**指示書の特徴**：Owner自身が、以前提案していた「ARCが直接POSTする」
案を明示的に撤回し、`ARC → Write Proposal → Owner承認 → Project ARC`
というWrite Proposal Layerを挟む方針へ修正した点が最大の特徴。
Version1から一貫する「Systemは判断しない」原則を、初めて「読み書きの
入口」というガバナンス層の設計問題として扱うVersionであり、指示書
自身も「Version1〜13は機能を積み上げるVersionだったが、Version14は
Project ARCとARCを結ぶガバナンス層である」と位置づけていた。

## 2. 今回実装した機能（理由も含めて説明）

### ReadGateway（`ReadGatewayUseCase`）

ARCが会話の中で必要最小限のデータだけを取得できる読み取り専用の
入口。`readReflection`/`readTimeline`/`readExternal`/`readDecision`
の4メソッドを持ち、いずれも`limit`を必須とする。既存の
`GetTimelineUseCase`（Version8）・`RetrieveKnowledgeUseCase`
（Version11）・`DecisionEngineUseCase`（Version12）へ委譲するだけの
薄いディスパッチャで、新しい判断ロジックは持たない（ADR 0030）。
`DecisionEngineUseCase`自体は`limit`を持たないため、
`retrievedKnowledge`をReadGateway側で`slice()`することで制約を
追加適用している。

### Write Proposal Layer（`WriteProposalGatewayUseCase`）

`createProposal`→Owner承認→`approveProposal`（または`rejectProposal`）
という2段階の書き込み経路。`createProposal`はProposal（Value Object）
を組み立てて返すだけで、**一切保存しない**。Ownerが内容を確認し、
同じProposalを`approveProposal`へ再送して初めて、対応する既存
UseCase（`RecordDailyReflectionUseCase`/`AddMemoryEntryUseCase`/
`AddExternalKnowledgeUseCase`/`AddAppearanceLogUseCase`/
`AddManagementFeedbackUseCase`）が1回呼び出される。`rejectProposal`は
何も永続化しない（ADR 0031）。payloadの構造検証はzodスキーマで
行うが、これは「必須フィールドの有無・型が正しいか」という構造
チェックに留まり、内容の当否は判定しない。

### Proposal（Value Object）

`type`/`target`/`payload`/`reason`/`createdAt`の5フィールドを持つ、
Repositoryを持たないプレーンなinterface。Proposal種別は5つ
（Reflection/Memory/ExternalKnowledge/Appearance/ManagementFeedback）。

### ManagementFeedback（新Entity）

ARC視点のProject ARC運用改善提案を表すEntity。Reflection
（Owner視点の振り返り）とは別Entityとした（ADR 0032）。
`resolution`（Open→Accepted→Implemented→Closed、または
Open/Accepted→Rejected）という状態機械を持ち、`transitionTo()`が
不正な遷移を例外にする。Timelineには含めない（ADR 0033）。

### CLI（`pnpm propose`）

引数なしで対話式にProposalを作成→表示→Approve確認まで実行する
（`readline/promises`ベース、複数`rl.question()`の逐次実行という
既存CLIと同じパターン）。`list-feedback`でManagementFeedbackの
一覧、`resolve <id> <resolution>`でresolutionの遷移を行う。

### HTTP API

- `GET /read/reflection` `/read/timeline` `/read/external`
  `/read/decision`（`limit`未指定・不正値は400）
- `POST /proposal/create` `/proposal/approve` `/proposal/reject`

## 3. 実装しなかった機能（延期理由も記載）

- **MCP・ChatGPT Actions・Claude API・Gemini API接続**：指示書18章で
  明示的に対象外。ReadGateway/WriteProposalGatewayはUseCase層の
  インターフェースとして完成させ、将来これらの接続経路を追加する
  際は新しいInfrastructureアダプタを1つ足すだけで対応できる設計に
  留めた（ADR 0030の「影響」節参照）。
- **自動Approve・自動保存**：指示書18章で明示的に対象外。
  `WriteProposalGatewayUseCase`はOwnerが明示的に呼んだ
  `approveProposal`以外の経路でRepositoryに書き込む手段を持たない。
- **Reflection/Memory/Externalの自動更新、AI推論**：指示書18章で
  明示的に対象外。
- **ManagementFeedbackのHTTP一覧・解決エンドポイント**：指示書6章の
  API一覧に含まれないため、CLI（`pnpm propose list-feedback`/
  `resolve`）のみで完結させた（YAGNI、ADR 0033参照）。
- **Timelineへのmanagementfeedback統合**：ADR 0033で「載せない」と
  結論した（継続的な管理対象であり「ある瞬間の出来事」ではない
  ため）。

## 4. Architecture Review

### 新規Value Object（Domain層）

- `src/domain/value-objects/Proposal.ts`（`Proposal`/`ProposalType`）

### 新規Entity（Domain層）

- `src/domain/entities/ManagementFeedback.ts`
  （`ManagementFeedback`/`ManagementFeedbackRecord`/
  `ManagementFeedbackResolution`）

### 新規Port（Application層）

- `src/application/ports/ManagementFeedbackRepository.ts`

### 新規UseCase（Application層）

- `src/application/use-cases/management-feedback/`
  （`AddManagementFeedback.ts`/`ListManagementFeedback.ts`/
  `ResolveManagementFeedback.ts`）
- `src/application/use-cases/read-gateway/ReadGateway.ts`
  （`ReadGatewayUseCase`）
- `src/application/use-cases/write-proposal-gateway/
  WriteProposalGateway.ts`（`WriteProposalGatewayUseCase`）

### 新規Repository（Adapters層）

- `src/adapters/repositories/JsonFileManagementFeedbackRepository.ts`

### 新規Infrastructure

- `src/infrastructure/cli/propose.ts`（新規CLI、`pnpm propose`）

### 変更したファイル

- `src/application/serializers.ts`：`serializeProposal`/
  `serializeManagementFeedback`追加
- `src/infrastructure/http/server.ts`：`readGateway`/
  `writeProposalGateway`/ManagementFeedback系UseCaseの配線、
  `GET /read/*`・`POST /proposal/*`ルート追加、
  `serializeApproveResult`ヘルパー追加（7章参照）
- `src/infrastructure/http/server.test.ts`：新規ルートのテスト追加
- `package.json`：`propose`スクリプト追加、バージョン0.14.0

## 5. ADR（追加・変更したADR、追加しなかった理由）

指示書15章が明示的に求めた4件をすべてADR 0030〜0033として新規
作成した。

- **ADR 0030**: ReadGatewayとWriteProposalGatewayを分離した理由
- **ADR 0031**: Write Proposal Layerを追加した理由（「ARCが直接
  POSTする」案からの方針転換の経緯を含む）
- **ADR 0032**: ManagementFeedbackをReflectionと分離した理由
- **ADR 0033**: ManagementFeedbackをTimelineへ載せない理由

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**217件**全て緑（Version13完了時点181件から36件
  増加。ManagementFeedback Entity 7件、AddManagementFeedback 1件、
  ListManagementFeedback 1件、ResolveManagementFeedback 3件、
  ReadGateway 6件、WriteProposalGateway 9件、HTTP server 9件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：
  - HTTP API：一時的な検証用サーバー（`dataDir`を分離）を起動し、
    Node `fetch`で`GET /read/reflection`（`limit`未指定時に400を
    確認）→Reflection作成→`limit=1`で最新1件のみ返ることを確認。
    `GET /read/timeline` `/read/external` `/read/decision`も同様に
    `limit`必須・委譲結果を確認。`POST /proposal/create`（構造
    不正なpayloadで400になることも含む）→`/proposal/approve`→
    `/proposal/reject`の一連を確認
  - CLI：`pnpm propose`（対話式、擬似expectドライバで駆動）で
    ManagementFeedbackのProposal作成→表示→Approve→保存までを
    確認。続けて`pnpm propose list-feedback`で一覧に表示される
    ことを確認し、`pnpm propose resolve <id> Accepted`でOpen→
    Acceptedへの遷移を確認
  - 検証に使った一時サーバースクリプト・データは確認後に削除済み

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

### バグ: `POST /proposal/approve`のレスポンスがEntityの内部フィールドを漏らす

- **検出方法**：HTTP APIの実機確認中、`POST /proposal/approve`の
  レスポンスをNode `fetch`で確認したところ、`result.feedback`に
  `_id`・`_record`・`_createdAt`・`_resolution`という、TypeScriptの
  `private`フィールド名がそのまま含まれていた。
- **原因**：`serializers.ts`冒頭のコメントが明記する通り、
  `private`フィールドを持つEntityは必ずpublicなgetter経由で
  シリアライズする必要がある（TypeScriptの`private`は実行時の
  制約ではないため）。他のすべてのルートは`serializeReflection`等の
  ヘルパーを経由していたが、`/proposal/approve`ルートだけは
  `WriteProposalGatewayUseCase.approveProposal()`が返す生の
  UseCase出力（`{ feedback: ManagementFeedback }`等、Entityインスタンス
  を含む）をそのまま`ok()`に渡していたため、シリアライズを経由
  していなかった。
- **対応方法**：`server.ts`に`serializeApproveResult(type, result)`
  ヘルパーを追加し、Proposal種別ごとに対応する既存の
  `serialize*`関数（`serializeReflection`/`serializeMemoryEntry`/
  `serializeExternalKnowledge`/`serializeAppearanceLog`/
  `serializeManagementFeedback`）を呼び分けるようにした。
- **再発防止**：`server.test.ts`の`POST /proposal/approve`テストで
  レスポンスの`type`フィールドを確認しているが、今後Proposal種別を
  追加する際は、`approveProposal()`の戻り値を必ず
  `serializeApproveResult()`の`switch`に追加することを
  `WriteProposalGateway.ts`のコメントと合わせて徹底する。

## 8. 技術的負債（今後改善したい点）

- **`serializeApproveResult`のswitch文がProposal種別の追加のたびに
  手動更新が必要**：TypeScriptの網羅性チェック（`switch`の
  exhaustiveness）に頼っているが、`ProposalType`に新しい種別を
  追加した際にこの関数の更新を忘れるリスクは残る。
- **ReadGatewayUseCaseのコンストラクタが9個のRepositoryを受け取る**：
  `GetTimelineUseCase`の依存をそのまま引き継いだ結果であり、
  Timelineが対象とするLogが増えるたびにReadGateway側の依存も
  増える構造になっている。
- **CLI（`propose.ts`）のReflection/ExternalKnowledge/Appearance
  payload入力が最小限のフィールドのみ**：対話式CLIとしての
  使いやすさを優先し、各Entityが持つ全フィールドを網羅していない
  （例：Reflectionの`mood`/`sleepHours`等は未対応）。将来Owner側から
  要望が出た場合に拡張する。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- ReadGateway/WriteProposalGatewayはUseCase層のインターフェースとして
  完成しているため、将来MCP・ChatGPT Actions等の接続経路を追加する
  際は、`ConversationGatewayUseCase`と同様に新しいInfrastructure
  アダプタを1つ追加するだけで対応できるはずである（ADR 0030）。
  ただしWrite側は「Owner承認のUI」が別途必要になる点に注意
  （現状はCLIのy/n確認、またはOwnerが手動でHTTPを2回呼ぶことで
  承認を表現している）。
- `MAX_READ_LIMIT`（100件、`ReadGateway.ts`）は暫定値。実運用で
  不足する具体的なユースケースが出た場合に見直すこと。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- Version14時点でも、ARCが`POST /read/*`・`POST /proposal/*`を自分の
  判断で直接呼び出すことはまだできない（認証未実装、ARC Connectorは
  引き続き127.0.0.1限定）。ただしWrite Proposal Layerの設計上、
  仮に将来ARCが`createProposal`まで直接呼べるようになったとしても、
  「Ownerが内容を確認してから`approveProposal`を呼ぶ」という
  承認ステップはUseCaseのインターフェース自体が強制するため、
  認証実装を急がなくても「ARCが誤って書き込む」リスクは構造的に
  生じない。この点はPOとして安心材料として共有したい。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version14は、Owner自身が「以前の自分の提案（ARCが直接POST）」を
Constitutionの観点から再検討し、より厳格な設計（Write Proposal
Layer）へ修正したという経緯自体が特徴的だった。実装上もっとも
注意を要したのは、「Proposalを保存しない」という一見単純な制約を
崩さずに、`createProposal`と`approveProposal`という2つの独立した
API呼び出しの間でどうやってProposalの中身を受け渡すか、という点
だった——結論として「呼び出し側がProposal全体を保持し、そのまま
再送する」というステートレスな設計に落ち着いたが、これは
Constitution第2条・第4条を、UIやドキュメントの合意ではなく
アーキテクチャのレベルで担保する設計判断になったと考える。

## 12. ARCへの引き継ぎ

### 新しい資産

- **Read Layer**（`GET /read/reflection` `/read/timeline`
  `/read/external` `/read/decision`）— ARCが会話の中で必要最小限の
  データだけを取得できる読み取り専用の入口。`limit`が必須。
- **Write Proposal Layer**（`POST /proposal/create` `/proposal/approve`
  `/proposal/reject`、`pnpm propose`）— ARCが「これを保存したい」と
  提案し、Ownerが承認したときだけ実際に保存される仕組み。ARCは
  Proposalを組み立てるところまでで、保存の可否はOwnerが決める。
- **ManagementFeedback**（`pnpm propose list-feedback`）— ARCが
  Project ARC自体の運用について指摘・改善提案を残せる新しい記録先。
  Reflection（Ownerの振り返り）とは別の場所であり、Constitution
  第6条（マネジメントは、遠慮しない）に基づく率直な指摘を、Owner
  自身の記録と混ぜずに残せる。

### 新しいルール

- ARCがProject ARCへ何かを書き込みたい場合、必ず
  `createProposal`相当の形（type/target/payload/reason）で提案し、
  Ownerの承認を経由する必要がある。ARCが直接Repositoryへ書き込む
  経路は存在しない。
- Read Layerを使う場合は`limit`を必ず指定すること。全件取得は
  できない（上限100件）。
- ManagementFeedbackはTimelineには表示されない。専用の一覧
  （`pnpm propose list-feedback`）で確認する必要がある。

### 新しい思想

Version14は、Version1から積み上げてきた「Systemは判断しない」
という原則を、初めて「入口の設計」という形で明示的に構造化した
Versionである。これまでの各機能（Reflection・Memory・External
Brain等）はそれぞれの内部で判断境界を守ってきたが、Version14では
「読み取り」と「書き込み」という行為そのものの構造を分離すること
で、個々の機能の実装が今後どれだけ増えても、Constitutionの境界が
アーキテクチャレベルで保たれる土台を作った。

### Ownerについて分かったこと

Version14の指示書は、Owner自身が「以前の自分の提案を撤回し、より
厳格な設計へ修正する」という形で始まった。これはVersion1〜13の
指示書がすべてARCからの提案をそのまま実装対象としていたのと異なり、
Owner自身がProject ARCのConstitutionに照らして能動的に設計判断を
行った初めての事例である（事実ベースの観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version13までは、ARCとProject ARCの間の情報のやり取りは
すべてOwnerによる手動コピペだった。書き込みについては、Owner自身が
CLIやHTTP APIを直接操作する必要があった。

After：ARCが「これを保存したい」という提案を、Ownerが一度確認して
Approve/Rejectするだけで済む形に整理された。特にManagementFeedback
（ARCからの運用改善提案）は、`pnpm propose`一つで作成・一覧・
解決までの一連の流れが完結するようになった。

### 毎日使う理由

Version14自体は日々のReflection記録等の体験を直接変えるものでは
ないが、22時のDaily Review等でARCが気づいた改善提案を、
ManagementFeedbackとして構造的に残せるようになったことで、
「その場で言われて終わり」だった指摘が、Resolution状態で追跡
できる形に変わった。

### 懸念

現状、Write Proposal Layerを実際に使うにはOwnerがCLIまたはHTTP API
を手動で操作する必要があり、ARCとの会話からシームレスに
Proposalを作成できるわけではない。この「最後の一歩」は次Version
以降の接続経路の課題として残る。

### 次Versionで最も価値が高い改善

Daily Review（22時）でARCが実際に気づいた改善提案を、
ManagementFeedback Proposalとして半自動的に生成できるようにする
仕組み（指示書11章が構想していた内容）。Version14では「保存経路」
の整備までに留めたため、次のVersionでこの生成フローそのものを
検討する価値が高い。

## 14. 10年後のProject ARCへの貢献

Version14で10年後も効いてくるのは、「保存を決定するのはOwnerのみ」
という原則を、UIの運用ルールではなくアーキテクチャの構造（Proposal
を保存しない・Approve時に全体を再送する）として実装したことだと
考える。将来Project ARCがMCPやChatGPT Actions経由でARCと直接接続
されるようになっても、この構造そのものは変える必要がない——
「ARCが直接呼べる範囲」がReadGatewayとcreateProposalまでに限られ、
実際の書き込みは常にOwnerの承認操作を経由する、という境界線が
UseCaseのインターフェースレベルで固定されているためである。

「人生OS」というVisionから逆算すると、Version14はPhase 2
（External Brain）の総仕上げであると同時に、Project ARCが今後
「AIエージェントと安全に協調するシステム」として拡張され続ける
ための土台（ADR 0030の「影響」節が明記する、将来の接続経路追加が
UseCase層の変更なしで可能という設計）に位置する石である。機能の
見た目は「新しいコマンド1つ、新しいエンドポイント7つ」と地味だが、
「Systemは判断しない」という第一原則を、初めて「読み書きの入口の
構造」として明文化できたことは、今後Project ARCがどれだけ多くの
AIエージェント・接続経路と協調するようになっても揺らがない土台に
なると考える。
