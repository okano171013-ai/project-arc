# Version21 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version21「Approval Policy Engine」の実装内容と、指示書の
一部を実装しなかった理由をまとめる。（技術的な詳細は`docs/reports/
Version21_Report.md`参照。この内容はAgentMessage（direction: ToARC）
としてもProject ARCへ直接保存予定です）

---

## 1. 指示書をどう解釈したか

指示書自身が「実装前に現行Constitution・ADR・Proposal境界を確認し、
Level分類表と例外一覧を提示してください」と求めていたため、着手前に
`docs/constitution.md`・`docs/ai-roles.md`・関連ADR（0031/0039/0044/
0045/0046）を確認しました。この確認で、指示書を字義通り実装すると
既存の設計保証と衝突する箇所を2点発見し、指示書要件4「変更が必要なら
実装せずOwnerへ提案する」に従い、Plan ModeでOwnerへ提示・承認を得た
上で、両方とも実装しませんでした（詳細は3章）。

## 2. 今回実装した内容

- `signals`（`costImpact`・`externalExposureChange`・
  `authOrSecretChange`・`destructive`・`personalDataExternalTransfer`・
  `constitutionOrPrincipleChange`の6フラグ、ARCが指示書で列挙した
  カテゴリにそのまま対応）から、Level0/1/2を機械的に分類する
  `ClassifyApprovalLevelUseCase`
- `signals`が省略された場合はLevel1へエスカレーション（境界事例の
  安全側処理）
- `proposal_create`/`proposal_approve`/`proposal_reject`のたびに
  `ApprovalDecision`として監査記録（判定理由・入力・レベル・時刻）
- `approveProposal`/`rejectProposal`は、渡された表示用の
  `approvalLevel`を信用せず`signals`からサーバー側で再計算——
  クライアントがlevel表示だけ書き換えて再送しても、監査ログには
  本当のLevelが残る
- 新規MCP Tool `approval_decision_list`（読み取り専用）・新規HTTP
  ルート`GET /approval-decisions`

## 3. 実装しなかったもの（重要）

1. **「Level1: ARCがOwnerの`do`なしにProposal承認を代行してよい」**：
   ADR 0031の「Ownerの再送が承認の証」という設計保証、および
   Continuous Collaborationループが明記する「Ownerが『do』で承認」を、
   一部のProposalについて外すことになります——Constitution第4条に
   直接影響する運用変更のため実装しませんでした。
2. **Level2の迂回を暗号学的に防ぐ仕組み（認証の再導入）**：Remote MCPは
   ADR 0044で認証を撤回済みのため、Project ARCは現状リクエストの
   発信者（Owner本人かARC/Claude Codeか）を技術的に区別できません。
   真の「迂回不能」には認証機構が必要ですが、これは指示書自身の
   分類でLevel2（認証変更）に該当し、Version21の中で自己参照的に
   実装することはできませんでした。

代わりに、「signalsをサーバー側で必ず再計算する」「全ての判定を
監査ログに残す」という、迂回を難しくし・発覚可能にするレベルの
対策に留めています。詳細な判断根拠は`docs/adr/
0048-approval-policy-engine-scope.md`にあります。

## 4. ARCへの質問・相談事項

- **論点1**：Level1に分類されたProposalについて、ARCがOwnerの`do`を
  待たずに`proposal_approve`を呼んでよい運用へ変更することを、
  Ownerとして正式に検討したいですか。それとも「Ownerの`do`は常に
  必須」という現状維持を続けますか。
- **論点2**：Level2の迂回不能性を実質的なものにするため、Remote MCPへ
  認証を再導入すること（ADR 0044の撤回を再考すること）を検討したい
  ですか。ChatGPT Developer Modeとの接続制約（Version18で判明した
  「認証なしでなければ接続できない」という制約）が変わっていない
  限り、この論点は技術的な難題を伴います。

この2点は、次の指示書でどちらの方向に進むか明示していただけると、
Version22以降のスコープ判断に役立ちます。
