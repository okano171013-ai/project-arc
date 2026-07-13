# ADR 0010: Bridge Layer（Import/Export）

## ステータス

承認済み

## 関連Principle

- Principle 1（人間が最終意思決定者である）
- Principle 5（推測は推測として扱う）
- Principle 8（長期保守性）
- Principle 9（段階的拡張／YAGNI）
- Principle 10（責務は交換可能ではなく分担する）

## コンテキスト

Version7でARC Connector（HTTP API）、Version8でTimelineを実装したが、
ARC（ChatGPT）自身がProject ARCを直接利用できる経路はまだなかった。
ARCのVersion9ブリーフは、この「最初の接続点」として、(1)将来CLI・
REST API・MCP・SDKのどこからでも同じUseCaseを利用できるBridge
Layer、(2)複数Logを一括登録できるImport Interface、(3)各Logを
JSON出力できるExport Interfaceを求めた。完全自動化は目指さず、
「Ownerが手動でARCの提案をProject ARCへ渡せる状態」を作ることが
ゴールとされた。

## 決定

### Bridge LayerはApplication層のUseCase（ImportLogsUseCase/ExportLogsUseCase）として実装する

「同じUseCaseをCLI/REST API/MCP/SDKから利用できるようにする」という
ブリーフの要求を素直に読むと、Bridge Layer自体をInfrastructure層の
新しい抽象化（例えば独自のプロトコル層）として作るのではなく、
**Application層に置かれた2つのUseCase**として実装するのが正しい設計
である。CLIもHTTP APIも、今まで通り薄いアダプタとしてこのUseCaseを
呼ぶだけでよい。将来MCPサーバーやSDKを追加する場合も、同じ
UseCaseを呼ぶアダプタを追加するだけで済む（ARCフィードバックの
質問①「MCPへ移行しやすいか」に対する回答そのものでもある）。

### Import：`{ type, data }`の配列を、既存のAdd系・Record系UseCaseへそのまま委譲する

`ImportLogsUseCase`は新しい書き込みロジックを一切持たず、`type`
ごとに既存のUseCase（`AddSkinLogUseCase`等）を呼び出し、`data`を
その`execute()`の入力としてそのまま渡すだけの薄いディスパッチャで
ある。これはVersion6の`RecordCaptureUseCase`と同じ設計思想の踏襲
だが、1点異なる：`RecordCaptureUseCase`は`fields`（部分的な情報）を
各UseCaseの`record`型へマッピングする変換ロジックを持つのに対し、
`ImportLogsUseCase`の`data`は各UseCaseの入力型とそのまま一致する
契約にした。これにより変換ロジックの重複・バグの温床を避け、
「Import JSONのスキーマ＝各UseCaseの入力契約」という自己文書化された
設計になる。

各項目は独立して処理し、1件の失敗が他の項目に影響しない（部分成功を
許容する）。これはOwnerがARCの提案をまとめて渡す運用を想定すると、
1件のタイプミスで全体が失敗するのは体験として不適切なため。

### Export：各Repositoryの`findAll()`をそのままプレーンオブジェクト化する

`ExportLogsUseCase`は集約・要約を行わず、各Logの全フィールドを
そのまま返す。Timeline（Version8、ADR 0009）が「射影・要約」で
あるのに対し、Exportは「完全な読み出し」である点が異なる。両者を
統合しなかった理由は、目的が異なるため（Timelineは横断的な時系列
表示、Exportは特定Logの完全なデータ取得）。

### Captureは対象外とする

Import/Exportの対象は8種別（Reflection/Memory/InventoryItem/
AppearanceLog/SkinLog/PurchaseLog/ChallengeLog/ThirdPersonEvaluation）
とし、Capture（Smart Captureの監査記録）は含めない。Captureは
「記録の結果」であり「記録の材料」ではないため、Importの対象に
含めると「Captureの監査記録をImportで作る」という奇妙な操作が
可能になってしまう。Exportの対象にも含めない理由は、Capture自体は
既存の`/capture`のGETがなく（Version9時点でCapture一覧の専用
エンドポイントは`pnpm capture -- list`のみ）、Bridge Layerの
対象範囲を「入力可能なLog」に統一するため。

### シリアライズ関数をApplication層の共有モジュールに統合する

Version7では`src/infrastructure/http/serializers.ts`にHTTP専用の
シリアライズ関数を置いていたが、Version9でCLI（`pnpm bridge --
export`）とHTTP API（`GET /bridge/export`）の両方が同じシリアライズ
結果を必要とするようになったため、`src/application/serializers.ts`
へ移動し、Memory・InventoryItem・ThirdPersonEvaluation用の関数を
追加した。これもBridge Layerの一部と位置づけられる——「CLIとAPIが
同じロジックを共有する」という要求は、UseCaseだけでなくその
出力整形にも及ぶ。

## 根拠

- ADR 0007・ADR 0008で確立した「Systemは判断しない」という原則を、
  Import/Exportでも維持した。`type`は呼び出し側が確定済みの値として
  渡す必要があり、UseCase自身がデータの中身から`type`を推測する
  ことはない。
- 既存UseCaseへの委譲のみで実装したことで、新しいバリデーション
  ロジックの重複を避けられた（Domain層の`create()`が唯一の検証
  ロジック）。

## 影響

- **ARCフィードバック①（MCP移行のしやすさ）**：MCPサーバーを追加
  する場合、`ImportLogsUseCase`/`ExportLogsUseCase`をそのまま呼ぶ
  MCPツール定義を追加するだけで済む。Application層の変更は不要。
- **ARCフィードバック②（ChatGPT連携時に差し替える箇所）**：ADR 0008
  と同じく、認証・公開範囲（現状`127.0.0.1`のみ）が差し替え対象。
  UseCase・エンドポイントのロジック自体は変更不要。
- **ARCフィードバック③（Version10 Health Integrationへの準備）**：
  新しい外部データソース（Apple Health等）を取り込む場合も、
  `BridgeLogType`に新種別を追加し、対応するEntity・UseCase・
  `ImportLogsUseCase`のswitch分岐を1つ追加するだけで対応できる
  設計になっている。ただし認証・データ量（Health系は件数が多い）に
  関する検討はVersion10で別途必要になる。
