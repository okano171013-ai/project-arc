# ADR 0012: External BrainにおけるSystemの判断範囲

## ステータス

承認済み

## 関連Principle

- ARC Constitution 第2条（Systemは判断しない）
- `docs/ai-roles.md` Principle 1/2/5/10（意思決定範囲：一切なし／
  役割の兼務は禁止／存在しない情報を捏造しない／責務は交換可能
  ではなく分担する）

## コンテキスト

Version10「External Brain」は、外部情報（記事・書籍・会話等）と
そこから得た知識をProject ARCに保存する機能。指示書には
「情報の信頼度をどう扱うか」「重複した出典をどう扱うか」
「出典が分からない知識をどう扱うか」という、Systemがどこまで
判断してよいかに関わる論点が複数含まれていた（指示書2章・10章・12章）。

外部情報を扱う以上「これは信頼できる情報か」「これは既に登録済みの
情報と同じではないか」といった判断が自然に発生しうるが、これは
Constitution第2条が禁じる領域（何が正しいか・何を優先すべきかを
判断すること）に直結する。Version6（Smart Capture）・Version7
（ARC Connector認可）・Version9（Bridge）でも繰り返し立ち返って
きた境界を、External Brainでも一貫させる必要があった。

## 決定

### 1. confidence（信頼度）はOwnerが設定する属性であり、Systemは自動決定しない

`ExternalKnowledgeConfidence`（`unassessed`/`low`/`medium`/`high`）は
CLIでOwnerが番号選択する形でのみ設定される。`sourceType`や`content`の
中身から推測して自動設定するロジックは実装しない。デフォルトは
常に`unassessed`（未評価）。

### 2. 重複検知は警告のみ。統合・ブロックはしない

`FindDuplicateExternalSourceUseCase`は、URL/identifierが一致する
既存Sourceを返すだけで、登録の可否には関与しない。CLIは重複が
あれば警告を表示するが、そのまま新規登録を続行できる
（`ExternalSource.test.ts`の「detects duplicate by URL without
merging or blocking」で担保）。

### 3. 出典不明の知識も受け入れる

`ExternalKnowledge.sourceId`は任意項目。「どこで読んだか覚えていない
が知識としては残したい」というOwnerの実際の記録行動を妨げない
（`ExternalKnowledge.record.title`の型コメントにも明記：
「出典不明の場合も空文字は許可しない。『不明』等、Ownerが判断した
文字列を入れる」）。

## 根拠

Systemが「これは信頼できる」「これは重複だから統合する」と自動で
判断し始めることは、Constitution第2条が保証しようとしている
「Systemが暴走しない」という制約への直接的な違反になる。
confidence・重複・出典有無のいずれも、最終的な意味づけはOwner/ARCに
残し、Systemは記録と提示のみを行う。

## 影響

- 将来「AIによる自動信頼度スコアリング」「重複の自動統合」等の
  機能追加が提案された場合、それは実装の詳細判断ではなく
  Constitution第2条に関わるガバナンス判断であり、Owner確認が必要な
  変更として扱うこと（`CLAUDE.md`の「確認が必要な判断」に該当）。
