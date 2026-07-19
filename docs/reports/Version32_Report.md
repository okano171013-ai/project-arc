# Version32 Report: Program A/B 着手前ADR（4本）

commit: `db0378b`

## 1. Version概要

`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`
「着手前に必要なADR」6本のうち、Version31（ADR 0058・0059）で
2本を先行させた残り4本を設計した。実装は伴わない、設計・調査・
文書化のみのVersion（Owner承認により、有料契約・秘密情報・本番変更・
外部公開・不可逆操作・Constitution変更以外はOwner確認を待たずに
進めてよいと確認済み）。

## 2. 今回実装した機能（理由も含めて説明）

コード変更なし。4本のADRを新規作成した。

- **ADR 0060**（Autonomous Development Authority and
  DevelopmentGrant）：Program A用の新しい委譲モデル
  （`DevelopmentGrant`）とARC Review Broker（Level1承認主体）を設計。
  `AgentDelegationGrant`（生活記録用）とは意図的に別モデルとした。
- **ADR 0061**（AgentTask State Machine, Lease and Branch
  Ownership）：`Proposed→Ready→Claimed→InProgress→Review→
  ChangesRequested→Accepted→Closed`の状態機械、lease・1 branch 1
  writerの機械的強制、circuit breaker（retry上限）を設計。
- **ADR 0062**（Cloud Provider, Cost Ceiling and Exit Strategy）：
  Program Bのホスティング候補3カテゴリを比較（契約・選定はOwner
  判断、Architecture Gate待ち）。
- **ADR 0063**（Mobile Sync, Idempotency and Conflict Resolution）：
  既存の`idempotencyKey`パターンを再利用したMobile Sync設計、
  競合時は「Systemが自動で選ばずOwnerへ提示する」方針を確定。

## 3. 実装しなかった機能（延期理由も記載）

- DevelopmentGrant・AgentTask Entityの実装：ADR確定後の次Version
  （Version33、Program A基盤工程）で着手する。
- Program B（Mobile Ingress・Sync Worker）の実装：ADR 0062の
  Architecture GateでOwnerがcloud候補・cost上限を確定するまで
  着手しない。

## 4. Architecture Review

該当なし（コード変更なし）。

## 5. ADR

- 新規：ADR 0060, 0061, 0062, 0063（すべてProposed——実装を伴う
  ADR 0060・0061はDevelopmentGrant初回発行・実装着手時にAccepted化、
  ADR 0062・0063はOwnerのArchitecture Gate判断後にAccepted化する
  想定）

## 6. テスト

該当なし（コード変更なし）。既存527件のtestは無変更のまま維持
（本Versionでは再実行していないが、次VersionでAgentTask実装時に
確認する）。

## 7. 修正したバグ

該当なし。

## 8. 技術的負債

変化なし（Version31からの持ち越しのみ）。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Version33として、ADR 0060・0061に基づきDevelopmentGrant・
  AgentTask Entityを実装し、Program Aの基盤工程に着手する
  （Owner指示「ADR完了後はProgram Aの安全な基盤工程から着手」）。
- ADR 0062のArchitecture Gate論点（cloud候補・月額上限・data保管
  地域・可用性への期待）を、次にOwnerと対話する機会でまとめて
  提示すること。

## 10. POへの提案

4本のADRを一度に作成したため、既存のADR indexが無い状態
（ARC-PM-011、P2）が徐々に負債として効いてくる。Version32時点で
ADR数は63本に達した——次にADR関連の作業をする際、indexの整備を
合わせて検討したい。

## 11. CEOへのコメント

コードを1行も書かない設計オンリーのVersionだったが、Program A・B
という大きな2方向の実装に入る前に、権限モデル・状態機械・
ホスティング候補・同期方式という4つの土台を先に固められたのは、
Version31のData Durabilityと合わせて「機能を作る前に壊れない・
迷わない仕組みを先に作る」という一貫した順序になっている。

## 12. ARCへの引き継ぎ

**新しい資産**：Program A・B双方の実装着手に必要な設計文書が
（Version31の2本と合わせて）6本すべて揃った。

**新しいルール**：`AgentDelegationGrant`と`DevelopmentGrant`は
意図的に別モデルである——生活記録の自動保存と開発taskの継続許可を
混同しないこと。

**新しい思想**：ADR 0063の「競合はSystemが自動で選ばずOwnerへ
提示する」という方針は、Smart Capture（ADR 0007）以来の「Systemは
判断しない」原則が、同期・競合というこれまでとは違う種類の場面にも
一貫して適用できることを確認した。

**Ownerについて分かったこと**：「有料契約・費用発生・秘密情報・
本番変更・外部公開・不可逆操作・Constitution変更のみOwner確認」と
明確に線引きした指示は、Claude Codeが自律的に進められる範囲を
具体的なチェックリストとして与えるスタイルで、Version30以降
一貫している。

## 13. Product Review

**ユーザー体験で改善されたこと**：なし（設計のみ）。

**毎日使う理由**：変化なし。

**懸念**：4本のADRが実装に進むまでの間、この設計が「絵に描いた餅」
のままにならないよう、Version33で速やかに実装へ移すことが重要。

**次Versionで最も価値が高い改善**：DevelopmentGrantとAgentTaskの
最小実装により、Program Aの「Owner `do`を毎回求めない」体験の
第一歩が踏み出せること。

## 14. 10年後のProject ARCへの貢献

Version32が10年後に効いてくるとすれば、それは「AIエージェントが
自律的に開発を続けられる基盤を作る前に、その権限の境界を先に
文書として固定した」という順序である。Program AはProject ARC自身の
開発プロセスをAIに委ねる、これまでで最も大きな権限委譲だが、
`costCeiling`の型固定・`forbiddenOperations`の型固定・1 branch 1
writerの機械的強制という、コードでしか担保できない境界を先に設計
したことで、「便利になったが制御を失った」という失敗を防ぐ土台に
なる。
