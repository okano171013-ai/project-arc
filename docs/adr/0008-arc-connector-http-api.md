# ADR 0008: ARC Connector（HTTP API化）

## ステータス

承認済み

## 関連Principle

- Principle 8（長期保守性）
- Principle 9（段階的拡張／YAGNI）
- Principle 10（責務は交換可能ではなく分担する）

## コンテキスト

Version6までのProject ARCは、CLI（`pnpm <command>`）からのみ利用
できる設計だった。ARC（ChatGPT）のVersion7ブリーフは、「Ownerが
写真や一言を送るだけで自然に記録される」という体験を実現するため、
Project ARCをCLI専用のツールから「ARCが利用できるデータ基盤」へ
進化させることを求めた。具体的には、Application層をCLI以外からも
呼び出せるインターフェース（HTTP APIまたはCLI Bridge、どちらでも
よい）を用意すること。

## 決定

### HTTP APIを採用する（Node.js標準の`http`モジュールのみ、新規依存追加なし）

`src/infrastructure/http/server.ts`にHTTP APIサーバーを追加した。
CLI BridgeではなくHTTp APIを選んだ理由：

- 将来ARCとの正式連携（ChatGPT Actions、MCP等）を検討する際、
  いずれもHTTP/JSONベースのインターフェースを前提とすることが多く、
  親和性が高い。
- CLI BridgeはCLIプロセスの起動オーバーヘッドと、対話式CLIが抱える
  非TTY入力時の既知の制約（Version6 Report参照）を引き継いでしまう。
  HTTP APIはリクエスト/レスポンス型で完結するため、この制約と無縁
  である（実際、Version7のテストは全てNode標準の`fetch`で自動化
  でき、CLIのような対話式検証の手間がない）。

新規の外部依存（Express等のWebフレームワーク）は追加していない。
6エンドポイント程度の規模では、Node標準の`http`モジュール＋手製の
軽量ルーターで十分に保守可能であり、フレームワーク導入は現時点では
speculative generality（過剰な一般化）と判断した（Principle 9）。
将来エンドポイントが大幅に増える、あるいはミドルウェア（認証・
バリデーション等）の共通化が必要になった時点で、フレームワーク
導入を再検討する。

### System（Project ARC自身）は判断しない、という原則を維持する

ADR 0007で確立した「Systemは判断しない、忠実に記録するだけ」という
制約は、API化しても変わらない。

- `POST /capture`は、呼び出し側（ARC、またはARCとの対話を経た
  Owner）が確定した`destinations`（どのLogに何を書くか）を必須
  パラメータとして要求する。Server側で自動的に分類・書き込みする
  経路は存在しない。
- `POST /capture/suggest`は、`RuleBasedCaptureClassifier`による
  機械的なキーワード提案を返すのみで、何も書き込まない（既存の
  UseCase設計をそのまま再利用、ADR 0007参照）。
- 他のエンドポイント（`/reflection` `/skin` `/purchase` `/appearance`）
  も、渡された`record`をそのままDomain層のバリデーションを通して
  保存するだけで、値の推測・補完は行わない（Principle 5）。

### 認証は実装しない（意図的な先送り）

Version7時点でこのAPIを呼び出す実際の外部主体は存在しない
（ARCとのライブ連携はまだ確立されていない、`docs/handoff/README.md`
参照）。そのため：

- サーバーは`127.0.0.1`（ローカルホスト）にのみバインドし、
  ネットワーク上に公開しない。
- 認証・認可の仕組みは実装しない（Principle 9: 具体的な必要性が
  確認できるまで先取りしない）。

**再検討の条件**：実際にリモートから（同一マシン外、あるいは
ChatGPT等の外部サービスから直接）呼び出す具体的な要件が生じた
時点で、本ADRを見直し認証方式（APIキー、OAuth等）を設計すること。
それまでは`127.0.0.1`バインドのみが正しい安全策である。

### UseCase層の構成について（CLIとの重複調査）

ブリーフは「CLIから直接Repositoryを触る設計が残っているなら整理
する」ことを求めていたが、調査の結果、既存のCLI実装（`src/
infrastructure/cli/*.ts`）はいずれも Repository を UseCase 経由でのみ
利用しており、Repositoryのメソッドを直接呼び出す箇所はなかった。
そのため、Clean Architectureの層構造自体に是正すべき違反はない。

新設した`buildUseCases()`（`server.ts`内）は、HTTP APIが必要とする
UseCase/Repositoryの組み立てをまとめたものであり、CLI側の各
エントリポイントは今回リファクタリングしていない（重複した組み立て
コードは残るが、動作しているコードを具体的な必要性なく変更しない
というPrinciple 9の判断。CLIとAPIの両方が同じ組み立てパターンを
必要とする具体的な保守コストが顕在化した時点で共通化を検討する）。

### TimelineEntryはVersion8向けの型定義のみ

`src/domain/value-objects/TimelineEntry.ts`に型を追加したが、
永続化・集約UseCase・`GET /timeline`エンドポイントは実装していない
（ブリーフの指示通り、Version7はEntity設計のみ）。

## 根拠

- ADR 0002・ADR 0007で確立した「AIプロバイダー抽象化は具体的要件が
  出るまで先送り」「Systemは判断しない」という2つの方針を、API化
  という新しい実装形態のもとでも一貫して維持できることを確認した。
- 新規外部依存を追加しないことで、Version1から続く「必要になるまで
  依存を増やさない」という運用を継続する。

## 影響

- `pnpm run api`でローカルにARC Connectorを起動できる（ポートは
  `PORT`環境変数、既定3939）。
- 将来ARCとの正式連携（ChatGPT Actions、MCP等）を設計する際は、
  本ADRの「認証は先送り」を必ず再検討すること。ローカルホスト
  バインドのままリモート公開に転用しないこと。
- Version8のTimeline機能は、この`TimelineEntry`型と、各Log
  Repositoryの`findAll()`を横断的に呼び出す新規UseCaseによって
  実装される見込み。
