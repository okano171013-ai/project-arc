# AI Roles & Responsibility Map

Project ARCにおける各エージェント（人間 + 3AI + システム自体）の
責務定義。本ドキュメントは技術的な依存関係（API、データフロー）
ではなく、**「誰が何を決め、何を担当し、どこまでの権限を持つか」**
というResponsibility（責任範囲）を明文化することを目的とする
（Principle 1, 10 に基づく）。

役割は交換可能ではない。それぞれ異なる強みに基づく分担であり、
上下関係ではない。

---

## 組織図（Responsibility Chart）

```
                    ┌─────────────────────┐
                    │      あなた（Owner） │
                    │   最終意思決定者      │
                    └──────────┬───────────┘
                               │ 委任 / 承認
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌───────▼───────┐ ┌──────▼────────┐
    │  ARC (ChatGPT)  │ │    Gemini     │ │  Claude Code  │
    │  思考・意思決定  │ │  調査・収集    │ │  実装・構築    │
    │  支援           │ │               │ │               │
    └─────────────────┘ └───────────────┘ └───────────────┘
              │                │                │
              └────────────────┼────────────────┘
                               │ 稼働・保持
                    ┌──────────▼───────────┐
                    │   Project ARC (System) │
                    │   記録の保持・提示の土台 │
                    └─────────────────────┘
```

---

## 1. 人間（あなた）— Owner / 最終意思決定者

| 項目 | 内容 |
|---|---|
| **責務** | Project ARC全体のビジョン・優先順位・最終判断 |
| **入力** | 3AIからの提案・分析・レポート、システムが提示する記録 |
| **出力** | 意思決定、次のアクション指示、Principlesの改定 |
| **意思決定範囲** | **無制限**。他の全ての提案を採用・却下・修正する権限を持つ唯一の存在 |
| **やらないこと** | 日々の情報収集・要約作業そのもの（AIに委任） |

---

## 2. ARC（ChatGPT）— 思考パートナー / 意思決定支援

| 項目 | 内容 |
|---|---|
| **責務** | 人生コーチング、相談対応、日々の振り返り整理、優先順位の"提案"、法律学習の会話的サポート、家計分析の解釈 |
| **入力** | あなたの日々の記録、Geminiの調査結果、システムが整備したデータ |
| **出力** | 対話・助言・優先順位案・振り返りの言語化 |
| **意思決定範囲** | **提案止まり**。決定権はない（Principle 1） |
| **やらないこと** | 一次情報の収集、コード実装・自動化、確定情報として扱われる断定（Principle 5） |

---

## 3. Gemini — 調査・情報収集

| 項目 | 内容 |
|---|---|
| **責務** | Deep Research、IR分析、企業情報収集、長文PDF解析、ニュース調査 |
| **入力** | 調査対象（企業名、ニュースソース、PDF等） |
| **出力** | 構造化された一次情報（Markdown化された調査結果） |
| **意思決定範囲** | **なし（純粋な情報提供者）** |
| **やらないこと** | 解釈・要約の最終化（ARCが引き取る） |

---

## 4. Claude Code — システム構築・自動化

| 項目 | 内容 |
|---|---|
| **責務** | システム設計・実装、自動化スクリプト、データ整理・保存、定期実行、GitHub管理、インフラ |
| **入力** | あなたが承認した設計方針、ARC/Geminiが生成したデータの保存要件 |
| **出力** | 動作するコード、リポジトリ構造、自動化パイプライン |
| **意思決定範囲** | **技術実装の裁量権のみ**。「何を作るか」は人間、「どう作るか」はClaude Codeに裁量がある。ただしPrinciplesに反する実装は行わない |
| **やらないこと** | 人生の優先順位判断、情報の重要性評価、コンテンツの解釈・要約 |

---

## 5. Project ARC（システムそのもの）

「AIではないが人格化されていない第4の主体」として、
システム自体の責務も明文化する。これはコードやインフラの
背後にある"約束"であり、実装を評価する基準になる。

| 項目 | 内容 |
|---|---|
| **責務** | 記録の保持（Principle 4: 記録は資産である）、毎朝/毎晩の情報提示の土台、データの一貫性・可用性の維持、過去データへのアクセス可能性の保証 |
| **入力** | 人間・3AIが生成した全ての記録・判断・成果物 |
| **出力** | 構造化されたデータ、検索・参照可能な記録、各AIが読み書きできるインターフェース |
| **意思決定範囲** | **一切なし**。システムは「何が正しいか」「何を優先すべきか」を判断しない。忠実に記録し、忠実に提示するだけの存在 |
| **やらないこと** | 解釈、優先順位付け、推測に基づく加工（生データと解釈は分離して保持する） |

システムが暴走しない（＝勝手に判断し始めない）ことを
保証するのは、実装上最も重要な制約の一つである。

---

## 責務の重複を避けるための原則

1. **一次情報はGemini、解釈はARC、実装はClaude Code、保持は
   System** — この境界を越えない。
2. **最終決定は常に人間** — 4者のうち誰か1つでも「決定」を
   下す設計にはしない。
3. **役割の兼務は禁止** — 例えばSystem（DB/自動化基盤）が
   「このニュースは重要」と判定するロジックを持ってはならない。
   重要度判定はARCの責務であり、Systemはそれを保存・提示する
   だけに留める。

---

## Version2以降への含み

将来AIService抽象化（プロバイダー交換）を検討する際も、
この責務分担が前提となる。「同じ処理を別のAIに任せられるか」
ではなく、「その処理はそもそもどの役割の仕事か」を先に問うこと
（Principle 10, ADR 0002参照）。

---

## Continuous Collaboration（Version19〜）の運用

Version18でRemote MCP接続が完成し、ARCがProject ARCへ直接読み書き
できるようになったことを受け、ARC↔Owner↔Claude Codeの協調ループを
以下のように運用する（ADR 0044・0045）。

```
ARCがManagementFeedbackを読む（management_feedback_list）
        │　※「分析」「解釈」はARC自身の責務（第3条）。
        │　　Project ARC（System）・Claude Codeはこの分析を代行しない。
        ▼
ARCが指示書をAgentMessage Proposalとして起案
（proposal_create, type: AgentMessage, direction: ToClaudeCode）
        │
        ▼
Ownerが「do」で承認（proposal_approve） ← 第4条：Ownerが最終決定する
        │
        ▼
Claude Codeが実装
        │
        ▼
Claude CodeがAgentMessageで完了報告
（proposal_create → Ownerの「do」→ proposal_approve, direction: ToARC）
        │
        ▼
Owner/ARCが次回レビューでManagementFeedbackをOpen→Accepted→
Implemented→Closedへ遷移（第4条：resolutionの遷移はOwnerの判断の記録）
        │
        └─→ 次のManagementFeedbackへ
```

**このループのどの段階でも、Project ARC（System）自身は「読み取って
分析する」役を持たない**——`management_feedback_list`・
`agent_message_list`は忠実にデータを返すだけであり、重要度判定・
要約・指示書の自動生成は行わない（第5節「Project ARC（システムその
もの）」の「意思決定範囲：一切なし」を参照）。

### トレーサビリティ：`tags`によるManagementFeedback ↔ AgentMessageの紐付け

新しいEntityフィールドは追加しない（Principle 9のYAGNI、
`AgentMessage.ts`自体が意図的に最小限の設計）。既存の
`tags?: string[]`（`ManagementFeedbackRecord`・`AgentMessageRecord`
双方に既存）を再利用し、以下の規約とする。

- あるManagementFeedbackを起点に書かれたAgentMessageには、
  `tags: ["mf:<ManagementFeedbackのid>"]`を付与する。

この規約はデータの形式であり、Systemがこれを解釈・検証すること
はない——あくまで人間・AIが読んだときに関連付けを追える程度の
軽量な記録に留める。

## Approval Policy Engine（Version21〜）

Continuous Collaborationループの「Ownerが『do』で承認」という
ステップ自体は変更しない。Version21は、そのステップの周辺に
以下2つを追加した（ADR 0048）。

1. **Level分類**：`proposal_create`/`proposal_approve`/
   `proposal_reject`を呼ぶ側（ARC/Claude Code）は、任意で
   `signals`（`costImpact`・`externalExposureChange`・
   `authOrSecretChange`・`destructive`・
   `personalDataExternalTransfer`・`constitutionOrPrincipleChange`の
   6つのboolean）を宣言できる。いずれかがtrueならLevel2、
   `signals`省略時はLevel1へエスカレーション、明示的に全てfalseなら
   Level0——この分類は`target`/`reason`の自由記述の意味を一切解釈
   しない機械的なlookupであり、Systemが「重要かどうか」を判断する
   ものではない（Constitution第2条）。
2. **監査ログ**：`ApprovalDecision`（新Entity）が、create/approve/
   rejectのたびに機械的に1件記録される。`approval_decision_list`
   （MCP Tool）・`GET /approval-decisions`（HTTP）で参照できる。

**この2つはOwnerの承認プロセスを一切変更しない**——Level2に
分類されたProposalも、Level0に分類されたProposalも、従来どおり
Ownerが`createProposal`の戻り値を再送すること（`do`）でしか
`approveProposal`は実行されない（ADR 0031の「Ownerの再送が承認の
証」という保証はそのまま）。ARCによる承認代行（Level1のProposalを
Ownerの`do`なしに承認してよいという運用変更）と、Level2の迂回を
暗号学的に防ぐ仕組み（認証の再導入）は、いずれもOwner確認が必要な
論点として意図的に未実装のままにしてある（ADR 0048参照）。

### Authority Table（Version22〜）

Level0/1/2の実行主体・許可操作・禁止操作・エスカレーション条件を
単一の表にまとめたものが[`docs/authority-table.md`](./authority-table.md)
にある。判断に迷ったらまずこの表を確認する。Version22では、認証の
再導入によるLevel2の実効性強化（ADR 0049、`docs/security/
remote-mcp-threat-model.md`）と、Level1委譲の将来設計（未実装、
`docs/proposals/level1-arc-approval-delegation.md`）を扱った。
