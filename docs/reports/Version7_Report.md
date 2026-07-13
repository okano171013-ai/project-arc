# Project ARC — Version7 Report

作成者：Claude Code（CTO） 　宛先：Owner / ARC（ARCレビュー用正式記録）
日付：2026年7月

---

## 1. Version7概要

テーマは「ARC Connector」。Version6でSmart Captureを実装した際、
`docs/ai-roles.md`の「Systemは判断しない」という原則により、
Project ARC自身にAIの判断能力を持たせない設計とした（ADR 0007）。
その一方でOwnerが目指す体験は「写真や一言を送るだけで自然に記録
される」ことである。ARCのVersion7ブリーフは、この2つを両立する
ための責務分離——「ARCが判断し、Project ARCが保存する」——を
正式に設計することを求めた。

Project ARCのApplication層をCLI以外からも呼び出せるHTTP API
（ARC Connector）を実装した。新規の外部依存は追加せず、Node.js
標準の`http`モジュールのみで構成している。

---

## 2. 今回実装した機能

### ARC Connector（`pnpm api`）

`127.0.0.1`（ローカルホスト専用）で待ち受けるHTTP APIサーバー。
以下のエンドポイントを実装した。

| メソッド | パス | 対応UseCase |
|---|---|---|
| GET | `/health` | （ヘルスチェックのみ） |
| POST | `/reflection` | `RecordDailyReflectionUseCase` |
| POST | `/skin` | `AddSkinLogUseCase` |
| POST | `/appearance` | `AddAppearanceLogUseCase` |
| POST | `/purchase` | `RecordPurchaseUseCase` |
| POST | `/purchase/:id/start` | `StartUsingPurchaseUseCase` |
| POST | `/purchase/:id/finish` | `FinishPurchaseUseCase` |
| POST | `/capture/suggest` | `SuggestCaptureDestinationsUseCase`（提案のみ、書き込みなし） |
| POST | `/capture` | `RecordCaptureUseCase`（確定済みdestinations必須） |

いずれも既存のUseCaseをそのまま呼び出しており、新規のビジネス
ロジックは追加していない。レスポンス形式は`{ ok: true, data: ... }`
/ `{ ok: false, error: "..." }`に統一した。

### TimelineEntry型（Version8向け設計のみ）

`src/domain/value-objects/TimelineEntry.ts`に、各Logを横断して
時系列表示するための共通射影型を定義した。永続化・集約UseCase・
`GET /timeline`エンドポイントはVersion8で実装する（ブリーフの指示
通り、Version7は型設計のみ）。

---

## 3. なぜHTTP APIか、なぜSystemは判断しないままなのか（設計判断）

ブリーフは「HTTP API」「CLI Bridge」どちらでもよいとしていたが、
以下の理由でHTTP APIを選んだ（詳細はADR 0008）。

- 将来ARCとの正式連携（ChatGPT Actions、MCP等）はHTTP/JSONベースが
  前提になることが多く、親和性が高い。
- CLI Bridgeは対話式CLIの既知の制約（Version6で特定した
  `readline/promises`の非TTY入力問題）を引き継いでしまうが、HTTP
  APIはリクエスト/レスポンス型で完結するためこの制約と無縁——
  実際、Version7のテストは全てNode標準`fetch`で完全自動化できた
  （6章）。

新規の外部依存（Express等）は追加していない。エンドポイント数が
少ない現時点では、Node標準の`http`モジュール＋手製の軽量ルーターで
十分と判断した（YAGNI、ADR 0008参照）。

ADR 0007で確立した「Systemは判断しない」という原則は、API化しても
一切変えていない。`POST /capture`は呼び出し側が確定した
`destinations`を必須とし、`POST /capture/suggest`は機械的な下書き
提案を返すのみで何も書き込まない。認証も意図的に実装していない
（ローカルホスト専用のバインドのみで、実際にリモートから呼ぶ主体が
まだ存在しないため。将来の再検討条件をADR 0008に明記した）。

---

## 4. Architecture Review

### 追加したファイル

| ファイル | 内容 |
|---|---|
| `src/infrastructure/http/server.ts` | HTTP APIサーバー本体。`createApp()`（テスト用に組み立てのみ行う）と`isMainModule()`起動判定を分離 |
| `src/infrastructure/http/serializers.ts` | Entity→JSON変換ヘルパー（`private`フィールドがそのまま漏れないよう、必ずgetter経由でシリアライズする） |
| `src/domain/value-objects/TimelineEntry.ts` | Version8向けの型のみ |

### CLIとRepositoryの直接結合について（調査結果）

ブリーフは「CLIから直接Repositoryを触る設計が残っているなら整理
する」ことを求めていたが、調査の結果、既存の全CLIエントリポイント
はRepositoryをUseCase経由でのみ利用しており、是正すべき違反は
なかった（ADR 0008に記録）。CLIとAPIの両方で似たUseCase組み立て
コードが重複している点は残るが、具体的な保守コストが顕在化する
までは共通化しない判断とした（Principle 9）。

---

## 5. ADR

### 追加したADR

- **ADR 0008: ARC Connector（HTTP API化）**
  （`docs/adr/0008-arc-connector-http-api.md`）
  3章の設計判断（HTTP API選定理由、Systemは判断しないままにする
  理由、認証を先送りする理由、CLIとRepositoryの結合調査結果）を
  正式に記録した。

### ADRを追加しなかった判断とその理由

- **レスポンス形式（`{ ok, data }` / `{ ok, error }`）の統一**：
  API設計上の実装判断であり、アーキテクチャレベルの決定ではない
  ため、ADRではなく本Report（2章）に記録するに留めた。

---

## 6. テスト

| 項目 | 結果 |
|---|---|
| テストファイル数 | 15ファイル（新規1） |
| テストケース数 | 83件（Version6の73件 + 新規10件） |
| typecheck | エラーゼロ |
| lint | エラーゼロ |
| 実機確認 | 完了（後述） |

**内訳（新規追加分、`server.test.ts`）**：ヘルスチェック、
Reflection記録、SkinLog記録・バリデーションエラー、AppearanceLog
記録、Purchase Logの未使用→使用中→使い切りの状態遷移、
`/capture/suggest`が書き込みを行わないことの確認、`/capture`が
確定済みdestinationsのみを書き込むことの確認、必須項目欠如時に
捏造せず400を返すことの確認（AppearanceLogのoverallRating）、
未知のルートへの404。

**実機確認について（Version6までとの違い）**：Version3〜6の対話式
CLIは、Node.jsの`readline/promises`が非TTY標準入力を正しく処理
できない制約により、サンドボックス内での自動確認に手間がかかった
（Version6で擬似expectドライバを作成して対応）。HTTP APIはこの
制約と無縁で、Node標準の`fetch`を使えばテストコード自体が実機確認
を兼ねる。本Reportではさらに、実際に`pnpm run api`でサーバーを
起動し、`curl`と`node -e "fetch(...)"`の両方で動作確認を行った。

その過程で1つの環境依存の事象を発見した：**Git Bash上で`curl -d`に
日本語を含むJSONを渡すと、シェル層で文字化けする**（`curl`自体や
サーバー側の問題ではなく、Windows上のGit Bashの引数エンコーディング
に起因すると考えられる）。Node標準の`fetch`で同じリクエストを送ると
正しくUTF-8で往復することを確認した。これは製品コードの不具合では
ないが、今後この環境で動作確認する際は`curl`ではなく`fetch`ベースの
スクリプトを使うべき、という運用上の教訓として`CLAUDE.md`と
README.mdに記録した。

---

## 7. 修正したバグ

Version7の実装過程では、コードレビューで検出・修正した不具合は
なかった。6章で触れたcurlの文字化けは、コード側の不具合ではなく
検証手法（シェルのエンコーディング）に起因するものと切り分けた。

---

## 8. 技術的負債

- **CLIとAPIでUseCase組み立てコードが重複している**（4章参照）。
  具体的な保守コストが顕在化した時点で共通化を検討する。
- **認証未実装**：ローカルホスト専用のバインドで担保しているが、
  リモート接続が必要になった時点で必ず実装する必要がある
  （ADR 0008に再検討条件を明記）。
- **`/capture`のdestinations検証がやや緩い**：`logType`が
  `CaptureLogType`の範囲外の文字列を渡された場合、`RecordCapture
  UseCase`のswitch文の`default`節でエラーにはなるが、HTTPレイヤー
  側で事前により丁寧な400エラーメッセージを返す余地がある。
- **Memory/Inventory/ChallengeLogを直接操作するエンドポイントが
  ない**：ブリーフが明示的に要求したエンドポイントのみを実装した
  ため。同じパターンで容易に追加できる設計にはなっている。

---

## 9. Version8への申し送り

- **Timeline機能の実装**：`TimelineEntry`型（2章）を使い、各Log
  Repositoryの`findAll()`を横断的に呼び出す集約UseCaseと
  `GET /timeline`エンドポイントを実装する。
- **ARCとの正式連携の検討**：ARC Connectorはローカル専用・認証
  なしのまま。ChatGPT Actions等での実連携を検討する場合、ADR 0008
  の「認証を先送りした」判断を必ず再検討すること。
- **アーキテクチャ図の作成**：ARCのフィードバック（後述12章参照）
  で、Version7完了後に「Project ARC アーキテクチャ図」（レイヤー
  構成・データの流れ・ARCとの接続点）の作成が提案されている。
  Version8着手前、または着手時に対応することを推奨する。

---

## 10. POへの提案

### UX改善案

- 現状`pnpm run api`はターミナルをフォアグラウンドで占有する。
  日常的にAPIサーバーを立ち上げっぱなしにする運用を想定するなら、
  バックグラウンド起動・自動再起動の仕組み（例：単純な起動
  スクリプト）があると使いやすい。今回はYAGNIの観点から未実装。

### 設計改善案

- `POST /capture`のレスポンスに`applied`（書き込み先一覧）だけでなく、
  各書き込み先の実際のレコード全体を含めるかどうかは、実際にARC
  連携が具体化した際にAPIの利用者（ARC側の実装）の要望を聞いてから
  決めた方がよい。

---

## 11. CEOへのコメント

Version7は、Version6で確立した「Systemは判断しない」という原則を、
実装形態が変わっても——CLIからHTTP APIになっても——一貫して守れる
ことを確認できたVersionでした。ARCのブリーフは「ARCが判断し、
Project ARCが保存する」という表現でこの責務分離を明確に言語化して
おり、Version6での議論（ADR 0007）がそのまま今回の設計の土台に
なりました。

技術的な意思決定として一番悩んだのは、HTTP APIかCLI Bridgeかという
選択でした。最終的にHTTP APIを選んだ決め手は、機能面よりも
「検証のしやすさ」でした。CLIの対話式検証はVersion3から一貫して
このサンドボックス環境の壁になってきましたが、HTTP APIはNode標準
の`fetch`で完全に自動化でき、今回のテストスイート（83件）はすべて
サンドボックス内で緑を確認できています。加えて実際に`pnpm run api`
を起動し、実サーバーに対してcurl・fetch両方でリクエストを送る形の
実機確認も完了しました（6章）。これはVersion3〜6を通じて初めて、
「実装完了」と「実機確認完了」の両方をこのReportの時点で言い切れる
Versionです。

一方で、正直にお伝えすると、今回のAPIを実際にARCが呼び出す経路は
まだ存在しません。ARCとClaude Codeの間にAPI連携がない以上、この
Connectorは「将来の連携に備えた土台」の域を出ていません。ブリーフ
が目指す「写真や一言を送るだけで自然に記録される」体験は、この
土台の上にARC側との実際の接続（ChatGPT ActionsやMCP等）が乗って
初めて実現します。次にその接続を検討する際は、今回意図的に
先送りした認証の設計が必須になることを強調しておきたいです。

---

## 12. ARCへの引き継ぎ

### 新しい資産

- **ARC Connector（HTTP API）**：`http://127.0.0.1:3939`で
  Reflection・Skin Log・Appearance Log・Purchase Log・Smart
  Captureの記録・状態遷移をHTTPリクエストとして実行できる。ARCが
  将来この場から直接Project ARCを呼び出せるようになった際、Owner
  との会話で判断した内容をそのままこのAPIへPOSTする形で連携できる
  設計になっている。
- **`/capture/suggest`と`/capture`の分離**：まず提案だけを取得し
  （書き込みなし）、確定した内容だけを`/capture`で書き込む、という
  2段階の呼び出しパターンがAPIレベルでも用意されている。ARCが
  「提案を見てから確定する」という自然な対話フローをそのままAPI
  呼び出しに落とし込める。

### 新しいルール

- **「ARCが判断し、Project ARCが保存する」という表現がADR 0008で
  正式なアーキテクチャ原則になった**。API化によって呼び出し方法が
  増えても、判断・解釈をSystemに持たせない、という制約は変わって
  いない。ARCが今後Project ARCの新機能を提案する際、「この機能は
  Systemに判断させるのか、ARCが判断してSystemに渡すのか」を必ず
  先に明確にしてほしい（Version6のフィードバックと同じ注意点だが、
  API化後も変わらず重要）。
- **ARC Connectorはまだローカル専用・認証なし**。ARCがこのAPIに
  実際にアクセスできるようになるには、別途の連携（ChatGPT Actions、
  MCP等）と認証の実装が必要である。現時点でARCがOwnerに「Project
  ARCと直接つながっている」かのような案内をしないよう注意して
  ほしい。

### 新しい思想

Version6で「Systemは判断しない」という制約を発見し、Version7では
その制約を保ったまま「どうすればARCが実際に使える形にできるか」を
設計した。これは、原則を曲げずに機能を進化させる——制約と機能拡張は
対立しないという実例になった。Clean Architectureの層構造
（Domain/Application/Adapters/Infrastructure）が、CLIとHTTP APIという
2つの全く異なるInfrastructureを、Application層を一切変更せずに
両立できたことも、Version1から積み重ねてきた設計判断（Principle 8:
長期保守性）が実際に効いた実例と言える。

### Ownerについて分かったこと

- Version6終了時に「いちいち確認しなくていいからガンガン進めちゃって」
  「ARCとの相談が必要な場面もクロコに任せる」と明確に指示された。
  Version7の設計判断（HTTP API vs CLI Bridge、認証を先送りする
  判断等）は、この指示に基づきClaude Codeが単独で決定し、Report/ADR
  に根拠を記録する形で進めた。今後もこのスタイルを踏襲する。
- `docs/handoff/ARC_INBOX.md`にARCの指示書を貼る運用を即座に実践
  してくれた。ファイルベースの引き継ぎ運用が実際に機能することを
  確認できた最初のVersionでもある。

---

## 13. Product Review

### ユーザー体験で改善されたこと

- **Before**：Project ARCへの記録は、Ownerが自分でターミナルを開き
  CLIコマンドを打つ以外の手段がなかった。
- **After**：技術的には、任意のプログラム（将来的にはARC自身）が
  HTTPリクエスト経由でProject ARCへ記録できるようになった。ただし
  現時点でOwnerが直接体感できる変化はまだない（11章参照、ARCとの
  実連携が未整備のため）。

### 毎日使う理由

Version7自体はOwner向けの直接的な新機能ではなく、将来の連携のための
基盤整備である。「毎日使う理由」への直接的な貢献は、ARCとの実連携が
実現して初めて生まれる。

### 懸念

- ARC ConnectorはOwnerが直接触る機能ではないため、「動いている
  実感」が薄い。次にARCとの実連携を検討する際、Ownerが「これで
  ちゃんと使えるようになった」と実感できる最小限のデモ（例：curlや
  簡単なスクリプトでの手動連携）を用意すると、価値が伝わりやすい
  と思われる。

### 次Versionで最も価値が高い改善

11章のCEOコメントで触れた通り、ARC Connectorは「将来の連携に備えた
土台」の域を出ていない。次に最も価値が高いのは、この土台の上に
実際の接続方法（ARCからの呼び出し経路）を一つでも通すことである。
完全な自動連携でなくとも、「Ownerが手動でARCの回答をこのAPIに
渡すだけで記録が完了する」という中間的な体験でも、CLIより明らかに
摩擦が減る。Version8のTimeline機能と並行して検討する価値がある。
