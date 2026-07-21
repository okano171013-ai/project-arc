# Version41 Report: MemoryをAgentDelegationGrant scopeへ追加

commit: `3650250`

## 1. Version概要

Version40（ADR 0072）完了直後、Owner本人がChatGPT接続チャットで
実際に「ほしい物リスト」・「今後の方針」といった`Memory`型の内容を
整理し、保存しようとした際にProposal個別確認の往復が不便だと感じ、
チャット上で「個別確認無しで保存して」と明示的に指示した。Version40
の項目3が「重要な長期Memoryへの保存は個別確認を維持する」とした
方針を、Owner本人の現在の意思で明示的に上書きするものであり、
ADR 0073としてこの決定を記録した上で、Version40と同一パターンで
実装した。

## 2. 今回実装した機能（理由も含めて説明）

- `AgentDelegationGrantScope`・`AUTO_APPROVABLE_TYPES`へ`Memory`を
  追加した。新規ツールは追加せず、既存の`proposal_create`
  （type: Memory）がGrantのscopeに含まれる場合に即時保存される、
  という既存の仕組みをそのまま拡張した（ADR 0039・0072と同じ
  「書き込み経路を増やさない」方針）。
- `verifyPersisted`にMemory用のread-after-write検証
  （`memoryRepository.findById`）を追加し、保存信頼性契約
  （`saved`/`verified`/`retryQueueId`）をMemoryにも適用した。
- CLI（`propose.ts`）のscope選択肢にもMemoryを追加した。

## 3. 実装しなかった機能（延期理由も記載）

- `ExternalKnowledge`は今回のOwner指示の対象外（発言はMemoryのみに
  言及）のため追加していない。将来Owner本人からの明示指示があれば
  同じパターンで追加できる。
- 実際にMemory scopeを含むAgentDelegationGrantの発行は、
  Constitution第4条によりOwner自身の`proposal_create`
  （type: AgentDelegationGrant）→`do`→`proposal_approve`という
  既存フローを経由する必要があり、Claude Codeは代行できない。

## 4. Architecture Review

- 変更：`AgentDelegationGrant`（scope型に`Memory`追加）、
  `WriteProposalGatewayUseCase`（`AUTO_APPROVABLE_TYPES`更新、
  `verifyPersisted`にMemoryケース追加、`memoryRepository`を
  コンストラクタパラメータプロパティ化）、`propose.ts`
  （scope選択肢追加）
- Domain・Entity層のMemoryEntry自体は無変更。

## 5. ADR

- 新規：ADR 0073（Memory scope自動承認を追加した理由）

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**661件合格**（92 test files、Version40時点660件+1件：
  Memory型のGrant自動承認テスト）
- ARC-PM-005（`pnpm build`のTS2742失敗）が本変更と無関係であることを
  `git stash`比較で再確認した。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

なし。

## 8. 技術的負債（今後改善したい点）

- `ExternalKnowledge`も同様の要望が出た場合、同じパターンで追加する
  ことを想定している（現時点では未実装）。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner自身が実際にMemory scopeを含むGrantを発行し、体験を確認する。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- 今回のように、Ownerが実際に機能を使う中でリアルタイムに感じた
  不便さを、その場で設計判断（ADR）として記録し即座に反映できた
  ことは、Version24以来育ててきたAgentDelegationGrantという仕組みの
  拡張性の高さを示す具体例だと考える。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Owner自身の「不便」という率直なフィードバックに対して、既存の
安全な仕組み（AgentDelegationGrant）の範囲内で、新しい抽象を追加
せずに応えられたことが今回の成果だと考える。

## 12. ARCへの引き継ぎ（Owner追加指示、2026年7月）

- **新しい資産**：Memory（長期記憶・価値観・ほしい物リスト等）も、
  Grant発行後はMealLog等と同じく"言うだけで保存"できるようになった。
- **新しいルール**：Owner本人が実際に機能を使って感じた不便さは、
  過去のADRの方針を上書きしてよい正当な理由になる——ただし常に
  ADRとして明示的に記録すること。
- **Ownerについて分かったこと**：Version40完了直後、実際に新機能を
  使った上での率直なフィードバック（「バカ不便」）が来たことは、
  Ownerが機能を実際に試して評価していることの表れである。

## 13. Product Review（Owner追加指示、2026年7月）

- **ユーザー体験で改善されたこと**：Memory scopeを含むGrantを発行
  すれば、ほしい物リストや価値観の記録がMealLog等と同じ手軽さで
  保存できるようになった。
- **懸念**：Grant未発行の間は従来通りの個別確認が必要——「保存が
  楽になった」という体験はGrant発行後にしか得られない。
- **次Versionで最も価値が高い改善**：実際にGrantを発行し、保留中
  だった「ほしい物リスト・方針」を保存する。

## 14. 10年後のProject ARCへの貢献（Owner追加指示、2026年7月、Version9より）

Owner自身の実体験に基づくリアルタイムなフィードバックを、既存の
安全な拡張ポイント（AgentDelegationGrant）だけで即座に反映できる、
という開発サイクルの速さそのものが、10年後も再利用される資産である。
