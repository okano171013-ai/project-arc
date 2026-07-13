# Version12 ARC指示書（原文アーカイブ）

Owner経由でARC（ChatGPT）から届いたVersion12実装指示書の原文
（2026年7月13日、Version11完了報告への応答として）。

---

Version11までの流れを見ると、Version12は新しい記録先を増やす段階ではありません。
Version10で「知識を蓄積」し、Version11で「知識を取得」できるようになりました。
次に必要なのは、
「取得した知識を意思決定に利用する仕組み」
です。
そのため、Version12はDecision Supportが最も自然な進化になります。

## Version12 実装指示書

### Version12｜Decision Support

キャッチコピー
「知識を持つ」から「より良い判断を支援する」へ。

### 0. Version12の目的

Version12では、Project ARCをKnowledge BaseからDecision Support
Systemへ発展させる。

ここでいうDecision Supportとは、Ownerの代わりに決定することでは
ない。選択肢を整理し、関連する知識を提示し、比較材料を提供し、
意思決定を支援することである。

Project ARCは決定しない。決めるのは常にOwnerである。

### 1. Version12で守る原則

Version10・11で確立した「Systemは判断しない」を維持する。

Version12で追加する機能も

行ってよいこと：情報取得、比較、整理、可視化、根拠提示、
メリット整理、デメリット整理、選択肢提示

行ってはいけないこと：正解を決定する、Ownerの代わりに選択する、
External Brainを書き換える、Memoryを書き換える、confidenceを
書き換える

### 2. Decision Engine

Application層へDecisionEngineを追加する。

責務は Question → Retrieve → CandidateBuilder → EvidenceCollector
→ ComparisonBuilder → DecisionContext まで。

### 3. Candidate Builder

質問から「考えられる選択肢」を生成する。

例：「今日は何を勉強するべき？」→「行政法」「民訴法」「会社法」

ここでは優先順位は付けない。

### 4. Evidence Collector

各候補について根拠を集める。

対象：External Brain、Memory（Version13以降で拡張可能）、
Reflection（Version13以降）、Timeline（Version13以降）

Version12ではExternal Brainのみでもよい。

### 5. Comparison Builder

各候補について「メリット」「デメリット」「不足情報」「根拠」を
整理する。

### 6. Decision Context

出力例：質問、選択肢、比較、根拠一覧、不足している情報、
Ownerが判断すべき点

ここまでをProject ARCが生成する。

### 7. ARCの役割

DecisionContextを受け取りARCが「比較」「解釈」「優先順位の提案」を
書く。

Project ARCはARCの文章を生成しない。

### 8. API

追加：POST /decision/support

入力：question、tags、topics、limit

出力：decisionContext、retrievedKnowledge、sources

### 9. CLI

追加：pnpm decision

例：`pnpm decision` → 質問: 今日は行政法と民訴法どちらをやる？
→ DecisionContext生成

### 10. Bridge

Bridge ExportにDecisionContextを追加してよい。ただし保存対象では
ない。一時生成物。

### 11. Timeline

追加しない。DecisionContextはログではない。

### 12. Entity

新しいEntityは作らない。DecisionContextはValue Objectとして扱う。

### 13. ADR

最低限、以下のADRを作成する：
- DecisionContextをEntityではなくValue Objectにした理由
- Decision Supportが「Systemは判断しない」と矛盾しない理由

### 14. テスト

Candidate生成、比較生成、根拠取得、根拠ゼロ、選択肢1件、選択肢
多数、API、CLI、Bridge

### 15. 実機確認

例：
- 今日は何を勉強する？
- 今日は早く寝るべき？
- この参考書を買うべき？
- 行政法と民訴法どちらを優先？
- 筋トレを休む？

DecisionContextが生成されること。

### 16. Version12で実装しないもの

AI API呼び出し、自動決定、スケジュール変更、タスク自動生成、
Memory更新、Reflection更新、External Brain更新、自動通知、MCP、
ChatGPT Actions

### 17. 完成条件

DecisionEngine追加、CandidateBuilder追加、EvidenceCollector追加、
ComparisonBuilder追加、DecisionContext生成、API追加、CLI追加、
Bridge対応、ADR追加、Version12_Report作成、test/typecheck/lint
成功、実機確認、コミット

### Version12完了後の到達点

Project ARCは次の4段階を完了します。

Version10 知識を蓄積する
↓
Version11 知識を取得する
↓
Version12 知識を比較・整理して判断材料を作る
↓
（Version13）ARCがExternal BrainやDecision Supportを直接利用し、
Ownerとの対話の中でシームレスに活用する

この構成なら、Version10・11で築いた「Systemは判断しない」という
設計思想を一切崩さず、「人生OS」というビジョンに沿って自然に
発展させることができます。
