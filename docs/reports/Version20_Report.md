# Version20 Report: Collaboration Runner + 常駐運用基盤

`docs/reports/TEMPLATE.md`の14章構成に準拠。

## 1. Version概要

**テーマ**：Collaboration Runner + 常駐運用基盤。Version19完了後、
ARCから届いたAgentMessage（id `33274dc6-...`）に基づく。「PCを起動した
まま放置しても、Project ARC上の未読AgentMessage・ManagementFeedback・
承認済みTaskを監視し、承認不要の範囲でClaude Codeによる開発・テスト・
ADR・Report更新・Feedback返却を進める」ことと、`pnpm run api`/
`pnpm run mcp:remote`/`ngrok http 3940`のログオン時自動起動を求めた。

同日、Owner指令として100項目の長期バックログ（AgentMessage
`8df72fe4-...`）も届いたが、「すべてを一括実装せず最小縦切りで
進める」との明記に従い、今回は参照記録に留めた（詳細は`docs/
handoff/archive/Version20_ARC_Brief.md`）。

## 2. 今回実装した機能（理由も含めて説明）

### スコープの絞り込み（最重要の判断、ADR 0046）

指示書の「開発・テスト・ADR・Report更新・Feedback返却を進める」を
無人のまま実行するには、Runnerが未読内容を「解釈」する必要があり、
Constitution第2条・ADR 0045の境界に抵触しかねない。着手前にOwnerへ
AskUserQuestionで確認し、「Runnerは監視・下書き作成まで（実際のコード
変更・commitはOwnerが`do`で承認するまで実行しない）」という回答を
得て、Runner v1のスコープを**機械的な新着検知・通知のみ**に限定した。

### Collaboration Runner（`src/infrastructure/runner/collaborationRunner.ts`）

`pnpm run runner`。既存の`Connector`（`listAgentMessages`・
`listFeedback`）をそのまま使い、ローカルの状態ファイル
（`data/runner-state.json`）に記録した最終確認時刻と比較して新着を
検知する。新着があれば`data/runner-notifications/<ISO時刻>.md`へ
id・target・content冒頭を機械的に列挙するのみで、内容の解釈・提案は
一切書かない。ロック機構（`data/runner.lock`、30分以上前のものは
無視）を保険として持つ。

1回実行して終了するスクリプトとして実装し、繰り返し実行は
Windowsタスクスケジューラに委ねた（独自の常駐ループ・重複防止
ロジックは作り込まない、YAGNI）。

### ログオン時自動起動（`scripts/start-all.ps1`・`stop-all.ps1`）

Owner確認の上、ngrokを含む3サービスをログオン時に自動起動する方針
とした（ADR 0047）——Remote MCPは無認証設計（ADR 0044）のため、これは
ほぼ常時の公開を意味するリスク受け入れ。`start-all.ps1`はポート
使用状況を確認しながら3サービスを順に起動し、ngrokの公開URLを
`data/current-tunnel-url.txt`へ書き出す。`stop-all.ps1`はポート単位で
該当プロセスのみを停止する。

### タスクスケジューラへの登録（`scripts/register-scheduled-tasks.ps1`）

`Register-ScheduledTask`（`ScheduledTasks`モジュール）で2つのタスクを
登録する設計とした。実機実行の結果：

- `ProjectARC-CollaborationRunner`（15分間隔）：**登録成功**。実機で
  タスクを手動発火させ、`pnpm run runner`が実際に実行され、ログ・
  結果コード（`LastTaskResult: 0`）が正常であることを確認した。
- `ProjectARC-AutoStart`（ログオントリガー）：**登録失敗**
  （`Access is denied`）。`Register-ScheduledTask`・`schtasks.exe`の
  両方で同一のエラーとなり、原因はスクリプトの不備ではなく、
  Claude Codeがコマンドを実行している自動化ツールの実行コンテキスト
  （対話的なデスクトップセッションではない）が、ログオントリガー
  タスクの登録に必要な権限を持たないためと判断した。時刻ベースの
  トリガーは同一環境から問題なく登録できたため、Task Scheduler自体
  やスクリプトの内容に起因する問題ではない（詳細は7章）。

## 3. 実装しなかった機能（延期理由も記載）

- **AI推論を伴う下書き生成**：Runnerが新着を検知した際に、実装方針の
  ドラフトをAIで生成する機能は、無人稼働でのコスト管理・暴走防止・
  誤った提案の蓄積防止策が未整備のため見送った（ADR 0046）。
- **AgentTask・AgentEvent・Artifact Entity**：同日届いた100項目
  バックログのB・C領域に該当するが、今回は指示書自身の「最優先」
  対象（Runner）に絞り、実装しなかった。
- **サービス化（Windows Service）**：指示書が候補として挙げていたが、
  タスクスケジューラで指示書の要求（再起動後の復旧・重複防止・
  失敗時再試行）の大部分を満たせたため、より重い実装は見送った
  （YAGNI）。
- **`ProjectARC-AutoStart`タスクの実登録**：7章参照。Owner自身の
  1ステップ操作として引き継いだ。

## 4. Architecture Review

新規Infrastructureエントリポイントは`src/infrastructure/runner/
collaborationRunner.ts`のみ（既存の`isMainModule()`パターンを再利用）。
新規Entity・UseCase・Repository・スキーマフィールドは追加していない
——`Connector`の既存メソッド（`listAgentMessages`・`listFeedback`）を
そのまま利用し、ADR 0034の薄いアダプタパターンを維持した。運用
スクリプト（PowerShell）は`src/`ではなく新設の`scripts/`ディレクトリに
配置し、アプリケーションコードと運用ツールを分離した。

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0046**: Collaboration Runner v1のスコープを機械的な検知・
  通知のみに限定する理由
- **ADR 0047**: ログオン時自動起動（ngrok含む）とタスクスケジューラの
  採用理由、および実機登録で発覚した制約の記録

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

- `pnpm test`：**256件**全て緑（Version19完了時点250件から6件増加、
  Collaboration Runnerのend-to-endテスト：初回全件検知・2回目新着
  なし・3回目差分検知・機械的列挙のみの確認・ロック機構2件）
- `pnpm typecheck`：エラーゼロ
- `pnpm lint`：エラーゼロ
- **実機確認**：
  1. `pnpm run runner`を実際に稼働中の`pnpm run api`に対して2回実行し、
     初回は既存4件のAgentMessageを検知・通知ファイル生成、2回目は
     新着なしと正しく判定することを確認した。
  2. `ProjectARC-CollaborationRunner`タスクを`Start-ScheduledTask`で
     手動発火させ、`LastTaskResult: 0`（成功）・`runner.log`への
     追記を確認した。
  3. `ProjectARC-AutoStart`タスクは登録自体が失敗したため、実機確認は
     未実施（7章参照）。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

### 問題1：PowerShellスクリプトの日本語文字化けによるパラメータ解析エラー

- **検出方法**：`register-scheduled-tasks.ps1`の初回実行時、
  `Register-ScheduledTask`が`-RunLevel`パラメータの型変換エラーで
  失敗した。エラーメッセージ中に文字化けした日本語らしき文字列が
  含まれていた。
- **原因**：スクリプトファイルがBOMなしUTF-8で書き出されており、
  Windows PowerShell 5.1がデフォルトで正しく読み取れず、日本語の
  マルチバイト文字が別の文字列へ化けた。化けた文字列中にバック
  ティック・引用符に見えるバイト列が含まれ、行継続・パラメータの
  区切りが崩れたと推測される。
- **対応方法**：3つのPowerShellスクリプト（`start-all.ps1`・
  `stop-all.ps1`・`register-scheduled-tasks.ps1`）のコメント・
  文字列リテラルを全て英語に書き直した。
- **再発防止**：Windows PowerShell 5.1で実行するスクリプトに日本語の
  文字列リテラルを含める場合は、BOM付きUTF-8での保存を徹底するか、
  英語で記述することを今後のルールとする。

### 問題2：ログオントリガータスクの登録が実行環境の制約で失敗する

- **検出方法**：`register-scheduled-tasks.ps1`実行時、
  `ProjectARC-AutoStart`（`-AtLogOn`トリガー）のみ`Access is denied`
  で失敗し、`ProjectARC-CollaborationRunner`（時刻ベーストリガー）は
  成功した。
- **原因**：切り分けのため、最小構成（設定なし、`-AtLogOn`トリガーの
  みのタスク）を`Register-ScheduledTask`で登録してみたところ同じ
  エラーが再現し、さらに`schtasks.exe`を直接呼んでも同じエラーが
  出た。これにより、スクリプトの記述やタスクの設定内容の問題では
  なく、Claude Codeがコマンドを実行している自動化ツールの実行
  コンテキストが、ログオントリガー登録に必要な権限（対話的な
  デスクトップセッションのトークン）を持たないことが原因と判断
  した。
- **対応方法**：`ProjectARC-CollaborationRunner`は実際に登録・実機
  確認まで完了させた。`ProjectARC-AutoStart`は、Owner自身が通常の
  PowerShellウィンドウ（デスクトップで直接開いたもの）から同じ
  スクリプトを一度実行する、という1ステップの手順として
  `docs/setup/collaboration-runner.md`に引き継いだ（ADR 0047）。
- **再発防止**：ログオントリガーを伴うタスク登録が必要な今後の
  Versionでは、同様の制約が再発する可能性を見込み、実機での実登録を
  Claude Codeが代行できない場合を想定した手順書を用意することを
  標準とする。

## 8. 技術的負債（今後改善したい点）

- **`ProjectARC-AutoStart`タスクは未登録のまま**：Owner自身の操作待ち。
- **ngrok無料プランのURL非固定性**：自動起動しても、再起動のたびに
  ChatGPT側のコネクタ設定を手動更新する必要がある。恒久的な解決には
  Cloudflare Tunnel＋独自ドメイン等が必要（ADR 0042・0047）。
- **AI推論を伴う下書き生成は未実装**：Runner v1は機械的な検知のみ。
  実際にOwner・ARCがこの通知の有用性を評価した上で、次段階（無人での
  下書き生成）に進むかどうかを判断する必要がある。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner自身が`scripts/register-scheduled-tasks.ps1`を一度実行し、
  `ProjectARC-AutoStart`タスクを完成させてほしい。
- Collaboration Runner v1（機械的通知のみ）を実際にしばらく運用して
  みて、通知の有用性・頻度（15分間隔が適切か）を評価してほしい。
- 同日届いた100項目バックログのうち、推奨実装順①（AgentEvent/未読
  管理の最小実装）は、今回のRunnerが簡易的な代替（状態ファイルでの
  最終確認時刻管理）で済ませた部分に相当する——正式なAgentEvent
  Entityが必要かどうかは、Runner運用の実績を見てから判断する方が
  良い。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- ARCが同時に複数の指示（Runner最優先の具体的指示と、100項目の長期
  バックログ）を送ると、優先順位の解釈にClaude Code側の判断が必要に
  なる。今後、複数の指示を同時に送る場合は、どちらを先に着手すべきか
  を明記していただけると助かる。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version20は、「無人稼働」という新しい運用形態を初めて導入したVersion
であり、実装そのものより「どこまで無人にしてよいか」の線引きが
最大の論点だった。Owner確認（AskUserQuestion）を2回行い、ngrok常時
公開は受け入れつつRunnerの自律度は抑える、という非対称な判断を
Owner自身が下したことは、リスクの性質（一時的な公開範囲拡大 vs.
無人でのAI判断の蓄積）を正確に見極めた選択だと考える。

## 12. ARCへの引き継ぎ

### 新しい資産

- **Collaboration Runner**（`pnpm run runner`）— 新着を機械的に検知し
  通知する。15分間隔でタスクスケジューラから自動実行される。
- **常時稼働運用**（`scripts/start-all.ps1`等）— ログオン時に
  Remote MCP・ngrokを自動起動する仕組み（`ProjectARC-AutoStart`
  タスクの登録はOwner操作待ち）。

### 新しいルール

- Collaboration Runnerは新着を「検知」するだけで「解釈」しない。
  実際の対応は、Owner・ARC・Claude Codeが人間の関与のもとで行う。
- Remote MCPの常時公開はOwner確認済みのリスク受け入れであり、
  異常に気づいた場合は`scripts/stop-all.ps1`で即座に停止できる。

### 新しい思想

Version20は、「接続できること」（Version18）「協調の型を作ること」
（Version19）に続き、「無人で稼働させてよい範囲」を初めて具体的に
線引きしたVersionである。この線引きは今後、AgentTask・AgentEvent等の
より高度な自動化を検討する際の判断基準になる。

### Ownerについて分かったこと

Owner自身が、ngrokの常時公開というインフラ面のリスクは受け入れつつ、
AIの自律的な判断・実装というガバナンス面のリスクには慎重な選択を
下したことは、リスクの種類を区別して判断する姿勢を示している
（事実ベースの観察）。

## 13. Product Review

### ユーザー体験で改善されたこと

Before：Version19までは、`pnpm run api`・`pnpm run mcp:remote`・
`ngrok`を毎回手動で起動する必要があり、ARCからの新着に気づくには
Owner自身が`agent_message_list`等を確認する必要があった。

After：Collaboration Runnerが15分間隔で新着を検知し通知ファイルを
残す。ログオン時自動起動タスク（Owner登録後）で、毎回の手動起動が
不要になる見込み。

### 毎日使う理由

自動起動・自動検知が完全に機能すれば、Owner自身が「今日は何か新着が
あるか」を`data/runner-notifications/`を見るだけで確認できるように
なる。

### 懸念

Remote MCPの常時公開・ngrok URLの非固定性という2つの運用上の摩擦が
残る。

### 次Versionで最も価値が高い改善

Owner自身による`ProjectARC-AutoStart`タスクの登録完了と、実際の
運用を通じたCollaboration Runnerの有用性評価。

## 14. 10年後のProject ARCへの貢献

Version20で10年後も効いてくるのは、「無人で自動化してよい範囲」を
実際に線引きし、それをADRとして記録した最初の事例であるという点
——将来さらに高度な自動化（AI推論を伴う下書き生成、AgentTaskの自動
実行等）を検討する際、この境界線をどう動かすかという議論の出発点に
なる。「人生OS」というVisionの実現には、Owner不在時にもシステムが
機能し続けることが不可欠だが、それは「Systemが判断代行すること」
とは違う——Version20はこの区別を実装レベルで具体化した。
