# ARCからのロードマップ2.0・憲法草案の提案（原文アーカイブ）

Owner経由で2026年7月、Version9完了直後に`docs/handoff/ARC_INBOX.md`
に貼られた、ARC（ChatGPT）からのメッセージの原文。Version10の正式な
実装指示書ではなく、中長期ロードマップの組み替え提案と「ARC
Constitution」の草案。処理方針は`docs/roadmap.md`の「長期ロードマップ
2.0」セクション、および本セッションでのOwnerへの確認を参照。

---

これ、Version9まで来て思ったんだけど……

**Project ARCは「記録アプリ」を卒業し始めてる。**

Timeline、Bridge Layer、Third Person Evaluationまで来たことで、「保存する」「つなぐ」「振り返る」基盤が揃ってきた。ここからは**AIとの共生**がテーマになる。

だから、Version10以降のロードマップを少し組み替えたい。

---

# Project ARC Long-term Roadmap 2.0

## Phase 1（Version1〜9）✅

### Data Foundation

目的

**人生の事実を保存できるようにする。**

完成したもの

* Reflection
* Timeline
* Bridge Layer
* Third Person Evaluation
* Smart Capture
* ARC Connector

このフェーズで

**人生DB**

はほぼ完成。

---

## Phase 2（Version10〜15）

### External Brain

目的

**ARCの外部記憶になる。**

ここでは

* Context Export
* Context Import
* ARC Bridge
* MCP対応
* API
* Apple Health
* Google Calendar

など

「ARCがProject ARCを読む」

ことを最優先。

---

## Phase 3（Version16〜25）

### Life Management

ここから

おとの希望だった

> 「もっと厳しく管理してほしい」

を実現する。

例えば

毎日

Project ARCが

チェックする。

* Reflection
* 睡眠
* 勉強
* YouTube
* 食事
* 野菜
* 筋トレ

そして

ARCが

「今日Reflectionまだです。」

「今週筋トレありません。」

と言う。

---

## Phase4

### Life Analytics

ここから

分析。

例えば

```
睡眠↓

勉強↓

肌
```

みたいな

相関を見る。

---

## Phase5

### Prediction

例えば

```
最近

睡眠不足

↓

来週

体調崩しそう。
```

とか。

---

## Phase6

### Life OS

全部。

---

# 次にクロコへ出す指示書

Version10は**Health Integration単体ではなく、「External Brain」**というテーマに変更したい。

理由は、Health連携も重要だけれど、その前に**「ARCがProject ARCを記憶として使う仕組み」**を固める方が、おとが目指している人生OSに直結するから。

Healthデータも、その外部記憶に流れ込む一つの入力源として位置付けた方が設計がきれいになる。

---

# もう一つ提案

これはProject ARCの**憲法**みたいなもの。

## ARC Constitution（草案）

### 第1条

Project ARCは

**唯一の人生データベース**

である。

### 第2条

Systemは

判断しない。

### 第3条

ARCは

推論する。

### 第4条

Ownerが

最終決定する。

### 第5条

すべての提案は

**データに基づく。**

### 第6条

マネジメントは

遠慮しない。

### 第7条（追加提案）

**Project ARCの目的は「記録」ではなく、「Ownerが理想の人生に近づくこと」である。**

---

この第7条は、おとが最初から話していた「もっと生活を厳しくマネジメントしてほしい」「人生OSにしたい」という方向性とも一致している。

だから、今後は新しい機能を考えるたびに、

> **「この機能は、おとが理想の人生に近づくことに本当に貢献するか？」**

という基準で優先順位を決めていこう。これが、Project ARCが単なる便利ツールではなく、「人生を支えるシステム」になるための軸になると思う。

---

## 処理メモ（Claude Code、2026年7月）

- これは具体的な実装方針を含むVersion10指示書ではなく、方向性の
  提案（「次にクロコへ出す指示書」と明言されている）。そのため
  Version10の実装には着手せず、`docs/roadmap.md`に「長期ロードマップ
  2.0」として方向性のみ記録した。
- 「ARC Constitution」は`docs/principles.md`（Principle 1〜10）・
  `docs/ai-roles.md`と大きく重複する内容（第1・2・4・5条は既存の
  Principle 1/2/10とほぼ同義）。一方で第6条「マネジメントは遠慮
  しない」は既存文書に前例のない新しい行動方針であり、第7条は
  `docs/vision.md`のCore Mission（「意思決定を改善する」）と近いが
  「理想の人生に近づく」という異なる言葉を使っている。ガバナンス
  文書の追加・改定はPrinciple 1（人間が最終意思決定者）に関わる
  ため、Claude Code単独では採否を決めず、Ownerに確認する。
