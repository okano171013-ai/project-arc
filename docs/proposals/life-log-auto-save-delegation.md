# 提案（Owner決定を受けた設計・次Version実装計画）：通常生活記録の自動保存

**ステータス**：Owner決定（AgentMessage `f81e9141-...`）は既に確定済み。
本ドキュメントはその決定を、Version22の権限委譲設計・既存データ
モデルへ具体的に反映する設計と、次Version（Version23想定）の
最小縦切り実装計画をまとめたもの。**実装はまだしていない**——
Owner決定自体が「実装してよい」という許可であって「実装した」という
事実ではないため、着手前に本ドキュメントの内容（特に4章の
Constitution整合性の結論）をOwner・ARCに確認してもらう。

## 1. Owner決定の要約

AgentMessage `f81e9141-...`（2026-07-16T00:18:52.837Z、tags:
`owner-decision`, `auto-save`, `life-log`, `delegated-authority`,
`version22`）。

- **許可対象**：Owner本人がChatGPT上で明示的に入力・送信した、食事・
  栄養・睡眠・体重・運動・勉強・授業・支出/収入・日次振り返り・
  挑戦行動などの通常の生活記録、およびそこから機械的・低リスクに
  算出できる集計値・分類、同一内容を対応するLife Logへ保存するために
  必要な通常書き込み。
- **運用方針**：対象範囲は記録ごとのOwner`do`を不要とし自動保存できる。
  Owner明示送信のみを対象とし推測・補完した事実を確定記録として
  自動保存しない。推定値保存時は推定である旨・根拠・信頼度を記録。
  重複防止・監査可能性・一時停止/再開/取消し・事後の訂正/削除を要件化。
- **許可対象外**：外部送信・公開、有料サービス、秘密情報、破壊的操作・
  大量削除・一括変更、AgentMessage/ManagementFeedback/開発指示/
  Proposal承認の一般的な自動化、Owner本人の意思決定・評価・感情・
  健康状態の推測を確定事実として保存すること、Constitution/Principles
  の無断変更。

## 2. これは「Level1委譲」（`docs/proposals/
   level1-arc-approval-delegation.md`）とは別種の委譲である

Version22で設計した`AgentDelegationGrant`（未実装）は「ARCがOwnerの
`do`なしに任意のProposalを承認してよい」という**一般的な承認代行**を
扱う——Constitution第4条の改定を要する、まだOwnerが採否を決めていない
提案だった。

今回のOwner決定は範囲が全く異なる。

| | Level1委譲（未決定） | 生活記録自動保存（Owner決定済み） |
|---|---|---|
| 対象 | 任意のProposalType | Reflection・ChallengeLog等、Owner明示列挙の生活記録カテゴリのみ |
| 誰の判断を記録するか | ARCの承認判断そのもの | Owner本人が既に入力した事実の機械的な書き写し |
| Constitution第4条との関係 | 「Ownerが最終決定する」を委譲するかどうかが論点そのもの | Owner自身が今この決定を下している——決定の委譲ではなく、決定の実行手段の効率化 |
| 採否 | Owner・ARCの今後の判断待ち | 決定済み（本Owner決定がその決定） |

この整理により、今回の対応はConstitution第4条を新たに委譲する
話ではなく、**Ownerが既に行った決定（この生活記録は自動保存してよい）
を、どう安全に実装するか**という技術設計の話になる（4章で詳述）。

## 3. 既存データモデルとの重複調査

| Owner列挙カテゴリ | 現状 | 判定 |
|---|---|---|
| 日次振り返り | `Reflection`（`ReflectionRecord`）が完全にカバー。既にProposalType・MCP経由で書き込み可能（`proposal_create type: Reflection`） | **既存で対応可能** |
| 睡眠 | `Reflection.sleepHours`（日次1値） | **既存で対応可能**（粒度は日次のみ） |
| 勉強 | `Reflection.studyMinutes`（日次合計）。別途`StudyLog` Entityが存在するが**Repository・UseCase・Routeが一切なく完全に未配線**（Version1計画時の先行定義のまま放置されていた、今回の調査で発覚） | **既存で概ね対応可能**（日次合計）。科目別の詳細記録が必要なら`StudyLog`の配線 or 廃止をOwnerに確認すべき技術的負債 |
| 授業 | `Reflection.didAttendClass`（boolean） | **既存で対応可能** |
| 運動 | `Reflection.didMartialArts`（boolean、少林寺拳法の出席フラグのみ、種目・時間等の詳細なし） | **部分的**——粗い |
| 支出・収入 | `Reflection.expenseYen`（支出のみ、収入フィールドなし）。`PurchaseLog`は個別品目の購入・使用状況管理でありフロー（収支）を表す設計ではない | **部分的**——収入が欠落 |
| 食事・栄養 | 該当するEntityなし | **ギャップ** |
| 体重 | 該当するEntityなし | **ギャップ** |
| 挑戦行動 | `ChallengeLog` Entityは存在するが、**ProposalTypeに含まれておらず、MCP Toolも存在しない**——現状ARCから一切書き込めない | **既存Entityあり、配線がギャップ** |

`MemoryEntry`（`Health`/`Finance`カテゴリを持つ）も検討したが、
「時間に紐づかない、更新され続ける知識」という設計（ADR 0005）であり、
日次の時系列ログ（体重推移・食事記録等）には構造的に不向きと判断した
——無理に流用すると、後で時系列クエリ（トレンド表示等）が必要になった
際に再設計が必要になる。

## 4. Constitution整合性の結論（Owner・ARC確認事項）

**結論（Claude Codeの見解）：Constitution/Principlesの改定は不要**。
理由は以下の通り。

- Constitution第4条「Ownerが、最終決定する」は、今回のOwner決定
  そのものによって満たされている——「この範囲は自動保存してよい」と
  いう決定自体をOwnerが下した。これは決定権限の委譲（誰が決めるか
  を変える）ではなく、決定の実行手段の変更（Ownerが既に決めたことを
  毎回`do`で再確認させるか、まとめて先に許可するか）である。
- Constitution第2条「Systemは、判断しない」は、自動保存の対象を
  「Owner本人が明示的に送信した内容のみ」「推測・補完した事実は
  確定記録として保存しない」というOwner決定自身の制約が守っている
  限り、System（Project ARC）は依然として「何が重要か」「何が事実か」
  を判断しない——Owner決定がConstitution第2条の実装レベルの制約を
  すでに引き継いでいる。
- ADR 0031（Write Proposal Layer、「Ownerの再送が承認の証」）との
  関係：既存のOwner自身のCLI/HTTP直接書き込み（`pnpm skin -- add`
  等）は、そもそも一度もこのProposal層を経由していない——Ownerが
  自分の意思で直接書き込む行為に、Owner自身の再承認は要求されて
  いない。今回はこの「Owner自身の直接書き込み」と同じ扱いを、
  「Owner明示発言をARC経由で書き込む」という限定的なケースへ拡張する
  ものであり、ADR 0031の対象外として扱うのが整合的——ADR 0031は
  「ARCが独自の判断でProposalを起案する」ケースを対象としており、
  今回のような「Owner自身の発言をそのまま書き写す」ケースは、
  Proposal層が本来防ごうとしていた対象（ARCの独自判断の混入）とは
  異なる。

この結論はOwnerが今回の決定文書内で既に示唆している内容
（「実装指示」の文言）を明文化したものだが、Constitutionの解釈に
関わるため、実装着手前にOwner・ARCの確認を仰ぐ（本ドキュメントの
提示自体がその確認プロセス）。

## 5. 委譲の技術設計（次Version実装計画の骨子）

Owner決定が要求する運用要件（監査・重複防止・一時停止/再開/取消し・
訂正/削除）を満たすため、以下の設計を提案する。

### `LifeLogAutoSaveGrant`（新Entity案）

```typescript
interface LifeLogAutoSaveGrantRecord {
  readonly scope: ('Reflection' | 'ChallengeLog')[]; // Owner決定が列挙したProposalTypeのみ
  readonly active: boolean; // Ownerが一時停止/再開できる
  readonly revokedAt?: string;
  readonly grantedAt: string;
  readonly grantedByMessageId: string; // このOwner決定AgentMessageのid（f81e9141-...）
}
```

`AgentDelegationGrant`（Level1委譲案）と異なり、`expiresAt`・
`usageLimit`は設けない——Owner決定自体が期限や件数上限を設けておらず、
「一時停止/再開/取消し」という明示的なOn/Off制御のみを要求している
ため（Owner決定の文言に忠実に従う、Principle 9のYAGNI）。

### 書き込み経路

Version21で確立した「サーバー側で常に再計算する」という設計思想を
踏襲し、`grant.active === true`かつ`proposal.type`が`grant.scope`に
含まれる場合のみ、`approveProposal`相当の処理をOwnerの`do`なしで
即時実行する。ただし新しい書き込み経路を増やさないというADR 0039の
方針を維持するため、既存の`proposal_create`/`approve`のパターンを
再利用し、`grant`が有効な場合のみ`proposal_create`の内部で
`approveProposal`まで自動的に連鎖させる、という最小変更で実現できる
見込み（詳細設計は次Versionで確定）。

### 監査・訂正・削除

- 全ての自動保存は`ApprovalDecision`（Version21）に
  `approver: 'auto-save (grant <id>)'`相当のフィールドを追加して記録
  する。
- 訂正・削除は、既存の`update`/`delete`系UseCase（`MemoryEntry`等が
  既に持つ）を`Reflection`/`ChallengeLog`にも必要に応じて追加する。
- 推定値保存時の「推定である旨・根拠・信頼度」は、`Reflection`/
  `ChallengeLog`の`record`に`estimated?: boolean`・
  `estimationBasis?: string`・`confidence?: 'low'|'medium'|'high'`
  相当のフィールドを追加することで対応する（既存フィールドは全て
  optionalという設計を踏襲、後方互換）。

### フェーズ分割（次Versionでの実装範囲）

1. **Phase 1（次Versionの本体）**：`Reflection`の既存フィールドで
   表現できる範囲（睡眠・勉強・授業・運動フラグ・支出）＋
   `ChallengeLog`をProposalType・MCP Toolへ配線——これだけで
   Owner列挙10カテゴリのうち7つ（日次振り返り・睡眠・勉強・授業・
   運動・支出・挑戦行動）を自動保存対象にできる。`LifeLogAutoSaveGrant`
   の最小実装・監査ログ統合・一時停止/再開/取消しのMCP Tool
   （`life_log_auto_save_pause`等）を含む。
2. **Phase 2（Owner確認後、規模次第で別Version）**：`Reflection`へ
   `mealSummary`・`weightKg`・`incomeYen`の3フィールドを追加し、
   残り3カテゴリ（食事・栄養／体重／収入）をカバーする。1日1値の
   粒度で十分か（例えば食事は1日3食を別々に記録したいか）は
   Owner確認が必要——不十分なら専用Entity（例：`MealLog`）の新設を
   検討する、より大きな設計判断になる。
3. **対象外のまま**：`StudyLog`の配線・廃止判断（技術的負債として
   3章に記録、Owner決定の対象外のため今回は判断しない）。

## 6. 次にOwnerが確認すべき事項

1. **4章のConstitution整合性の結論**（改定不要）に同意するか。
2. **Phase 1の範囲**（Reflection拡張なし・ChallengeLog配線のみ）で
   次Versionを開始してよいか、それともPhase 2まで一括で進めるべきか。
3. **食事・栄養・体重の記録粒度**（1日1値で十分か、複数回/日の記録が
   必要か）——Phase 2着手前に確定させたい。
