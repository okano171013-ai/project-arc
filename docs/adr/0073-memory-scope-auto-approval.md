# ADR 0073: MemoryをAgentDelegationGrant scopeへ追加した理由

## ステータス

Accepted

## 関連Principle・ADR

- Constitution第2条・第4条（`AgentDelegationGrant`の範囲内はOwnerの
  個別承認を省略できる）
- ADR 0031（Write Proposal Layer）
- ADR 0051（Version24、Constitution第4条限定改定）
- ADR 0072（Version40、AgentDelegationGrant scope拡張・保存信頼性
  契約）

## コンテキスト

Version40（ADR 0072）は、Owner本人発信のAgentMessageの項目3に基づき、
「重要な長期MemoryおよびExternalKnowledgeへの保存」をProposal個別
確認の対象として明示的に維持する方針を採った。

その直後、Owner本人が実際にChatGPT接続チャットで「ほしい物リスト」・
「今後の方針（インテリアより自己投資を優先する、脱毛・海外旅行は
来年）」といった`Memory`型の内容を整理したが、これらを保存する際に
Proposal作成→承認の個別往復が必要なことに強い不便さを感じ、
「個別確認無しで保存して」と明示的に指示した。

この指示は、Version40の項目3が示した「Memoryは個別確認を維持する」
という方針を、Owner本人の現在の意思で明示的に上書きするものである
——過去の指示を絶対視せず、Owner自身の現在の意思を優先するという、
本プロジェクトで一貫して採用してきた扱い（ADR 0072のFinanceLog除外
と対称的な、今回はMemoryを含める方向への変更）。

## 決定

`AgentDelegationGrantScope`・`AUTO_APPROVABLE_TYPES`へ`Memory`を
追加した。`ExternalKnowledge`は今回の指示の対象外（Owner発言は
Memoryのみに言及）のため、引き続き含めていない。

実装はVersion40（ADR 0072）と全く同じパターンを踏襲する。

- 新規の書き込みツールは追加せず、既存の`proposal_create`
  （type: Memory）がGrantのscopeに含まれる場合に即時保存されるだけ
  （ADR 0039「書き込み経路を増やさない」方針の継続）。
- `verifyPersisted`にMemory用のread-after-write検証
  （`memoryRepository.findById`）を追加し、保存信頼性契約
  （`saved`/`verified`/`retryQueueId`）をMemoryにも適用した。
- `ClassifyApprovalLevelUseCase`の型固定Level2ルールにMemoryは
  含めない——Memoryは「常にOwner確認が必要」な型ではなく、他の
  低リスク型と同様、有効なGrantがあれば自動承認されうる型として
  扱う。

## 根拠

- Constitution第4条の`AgentDelegationGrant`は、まさにこのような
  「Owner自身が範囲を定めて委譲する」ケースのために作られた仕組み
  であり、Memoryを含めること自体が新しい設計判断ではなく、既存の
  枠組みの対象を広げるだけである。
- Grantの発行自体は、この決定によっても変わらずOwner自身の
  `proposal_create`（type: AgentDelegationGrant）→`do`→
  `proposal_approve`という既存フローを経由する——`Memory`をscopeに
  含むGrantを実際に発行するかどうかは、引き続きOwnerの個別判断で
  ある。本ADRは「そうしたければできる」という手段を追加したに過ぎ
  ず、Constitution第2条・第4条の中核（Ownerが最終決定する）を
  変えていない。

## 影響

- `src/domain/entities/AgentDelegationGrant.ts`：
  `AgentDelegationGrantScope`へ`Memory`追加。
- `src/application/use-cases/write-proposal-gateway/
  WriteProposalGateway.ts`：`AUTO_APPROVABLE_TYPES`へ`Memory`追加、
  `verifyPersisted`にMemoryケース追加、`memoryRepository`を
  コンストラクタパラメータプロパティ化。
- `src/infrastructure/cli/propose.ts`：CLIのscope選択肢へ`Memory`
  追加。

## 見送った案

- **`ExternalKnowledge`も同時に追加する**：Owner指示はMemoryのみに
  言及しており、範囲を勝手に広げないという方針（Constitution第2条）
  に従い見送った。将来Ownerから明示的な指示があれば同じパターンで
  追加できる。
