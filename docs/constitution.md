# ARC Constitution

Project ARCの最も基礎的な7つの条文。`docs/vision.md`（なぜやるか）・
`docs/principles.md`（設計判断の基準）・`docs/ai-roles.md`（誰が何を
担うか）より上位に位置する、変更頻度が最も低いことを意図した文書。
Version9完了時にARC（ChatGPT）から提案され、Owner承認により2026年7月
に正式採択（原文は
[`docs/handoff/archive/2026-07_ARC_Roadmap2_and_Constitution_Proposal.md`](./handoff/archive/2026-07_ARC_Roadmap2_and_Constitution_Proposal.md)）。

**改定履歴**：Version24（2026年7月）、第4条にOwner承認による限定改定
（`AgentDelegationGrant`委譲の明文化）。Owner本人発信のAgentMessage
（id `1e02902f-...`）による指示、詳細は`docs/adr/
0051-version24-constitution-amendment-and-delegation.md`参照。

新しい機能・Versionを検討する際は、この7条とPrinciples（`docs/
principles.md`）の両方に立ち返ること。条文同士が衝突するように
見える場合は、本文書内の「条文間の関係」を先に確認する。

---

### 第1条

Project ARCは、唯一の人生データベースである。

### 第2条

Systemは、判断しない。

### 第3条

ARCは、推論する。

### 第4条

Ownerが、最終決定する。ただし、Ownerが`AgentDelegationGrant`として
明示的に発行し、有効期限・上限・範囲を定めた事項に限り、その範囲内で
ARCが個別の承認なしに記録を保存できる。委譲は常にOwnerが発行・
一時停止・再開・取消しでき、有効なGrantが存在しない場合の既定は
Ownerの個別承認である。Claude Code・ARC自身がGrantを作成・変更・
復活させることはできない。

### 第5条

すべての提案は、データに基づく。

### 第6条

マネジメントは、遠慮しない。

### 第7条

Project ARCの目的は「記録」ではなく、「Ownerが理想の人生に近づくこと」である。

---

## 条文間の関係（既存文書との整合性）

### 第1条：唯一の人生データベース

`docs/architecture.md`のディレクトリ構成・Repository設計が実装
レベルでこれを支える。複数の記録先に同じ情報を重複して持たせない
という判断（ADR 0005のMemory/Inventory境界、ADR 0006のSkin Log/
Purchase Log境界）は、すべてこの第1条を裏付ける具体的な設計判断
だったと位置づけられる。

### 第2条・第4条：Systemは判断しない／Ownerが最終決定する

`docs/principles.md`のPrinciple 1・Principle 10、`docs/ai-roles.md`
の「Project ARC（システムそのもの）」の節と同義。ADR 0007（Smart
Captureの責務分担）・ADR 0008（ARC Connector）・ADR 0010（Bridge
Layer）は、いずれもこの2条を実装レベルで守るための具体的な設計
判断だった。

**第4条のVersion24改定（`AgentDelegationGrant`）と第2条との整合**：
第4条の改定は、Ownerが範囲・期限・上限を明示して発行した委譲書
（`AgentDelegationGrant`）の枠内でのみARCの即時保存を許すものであり、
「Ownerが最終決定する」という原則そのものは変えていない——委譲書の
発行・取消し自体が常にOwnerの個別承認（第4条本来のプロセス）を経る
ため、決定権限の所在は一貫してOwnerにある。第2条との関係でも、
自動保存の対象は「Owner本人が明示的に送信した内容の機械的な書き写し」
に限られ、推測・補完した内容を確定事実として保存することはない
（ADR 0051参照）——Systemが「何が重要か」「何が事実か」を判断する
わけではなく、この改定によって第2条の意味が変わることもない。

### 第3条：ARCは推論する

`docs/ai-roles.md`の「ARC（ChatGPT）— 思考パートナー」の節と同義。
Systemが判断しない分、解釈・推論はARCの責務として明確に残る。

### 第5条：すべての提案はデータに基づく

`docs/principles.md`のPrinciple 2・Principle 5と同義。ARCの提案が
「答え」ではなく「材料」であることの根拠。

### 第6条：マネジメントは遠慮しない — Principle 3・6との関係（重要）

第6条は、既存のPrinciple 3（継続性を最優先する）・Principle 6
（UXを最優先する、「毎朝・毎晩、無理なく触れるか」）と一見緊張関係に
見える。「遠慮しない」指摘・催促（Phase3「Life Management」で
想定されている「今日Reflectionまだです」等）は、日々の摩擦を増やし
うるためである。

**この緊張は、優先順位ではなく適用範囲の違いとして扱う**：
Principle 3・6は「システムの操作性・UX」に関する基準であり、
第6条は「ARCの発言内容・姿勢」に関する基準である。UIやCLIの操作
自体を複雑にする・通知を過剰に増やす等の設計変更にはPrinciple 3・6
が優先して適用される。一方、ARCがOwnerとの対話の中で率直に指摘する
こと自体（例：「今週筋トレのログがありません」と伝える）は、UXの
複雑化ではなく対話の内容の話であり、第6条が適用される。

Phase 3（Life Management）以降、この区別が実際に機能するかは
実装・運用してみないと分からない。着手時に本条文とPrinciple 3・6を
必ず両方確認し、「遠慮しない」が「日々使うことが苦痛になる」に
転化していないかを検証すること。

### 第7条：目的は「記録」ではなく「理想の人生に近づくこと」

`docs/vision.md`のCore Mission（「目的は、人間の意思決定を改善する
ことである」）と近いが、視点が異なる。Core Missionは**メカニズム**
（記録→気づき→判断という流れ）を、第7条は**目的地**（理想の人生に
近づくこと）を述べている。矛盾ではなく、同じ山を違う角度から見た
ものとして両方を保持する——「意思決定の質を上げる」ことは手段であり、
その先にある「理想の人生に近づく」ことが目的、という関係。

Principle 7（機能追加より意思決定支援を優先する）の判断基準も、
第7条を踏まえて「この機能は今日の判断の質を上げるか」に加えて
「この機能はOwnerが理想の人生に近づくことに本当に貢献するか」を
問うことになる。
