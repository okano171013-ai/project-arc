# ADR 0002: AIServiceインターフェースの導入をVersion2以降に見送る

## ステータス

承認済み（2026年時点）

## 関連Principle

- Principle 9（段階的拡張／YAGNI）
- Principle 10（責務は交換可能ではなく分担する）
- Principle 8（長期保守性）

## コンテキスト

将来AIプロバイダー（OpenAI / Gemini / Claude）を切り替え可能にする
`AIService`インターフェースの導入が提案された。

## 検討した選択肢

1. **Version1から`AIService`抽象化を実装する**
2. **Version1では見送り、`docs/ai-roles.md`に方針のみ記録する**

## 決定

Version1では`AIService`のようなプロバイダー抽象化インターフェースを
**実装しない**。方針のみ本ADRおよび`ai-roles.md`に記録し、
コード化は具体的要件が発生した時点（Version2以降）で行う。

## 根拠

- Project ARCの現行設計では、ARC（ChatGPT）・Gemini・Claude Codeは
  「同じ処理を実行できる交換可能なプロバイダー」ではなく、
  「異なる強みを持つ役割分担された主体」として設計されている
  （`ai-roles.md`参照）。単一の`AIService`インターフェースの背後に
  3つを並べることは、この役割分担の思想と噛み合わない。
- Version1の実装スコープには、そもそもAI呼び出しロジック自体が
  含まれていない。中身のない抽象化は speculative generality
  （過剰な一般化）であり、Principle 9に反する。
- Domain/Application層がAIプロバイダーの詳細を知らない設計に
  なっていれば、後から抽象化を導入するコストは低い。今それを
  先取りする必然性は薄い（YAGNI）。

## 再検討の条件

以下のような具体的要件が発生した時点で、本ADRを見直し
`AIService`抽象化の設計に着手する。

- 同一ユースケース（例：企業研究の要約）を複数プロバイダーで
  比較・切り替えたい具体的ニーズが生じたとき
- 特定プロバイダーの障害・仕様変更により、処理の継続的な
  切り替えが必要になったとき

## 影響

- Version1のApplication層は、AI呼び出しを直接扱わない
  （AI連携はARC/Gemini/Claude Codeとの対話・手動連携に留める）。
- Version2以降で本ADRのステータスを「再検討」または「Superseded」に
  更新すること。
