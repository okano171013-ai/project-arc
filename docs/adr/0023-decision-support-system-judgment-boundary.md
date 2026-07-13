# ADR 0023: Decision Supportが「Systemは判断しない」と矛盾しない理由

## ステータス

承認済み

## 関連Principle

- ARC Constitution 第2条（Systemは判断しない）
- ADR 0012（External BrainにおけるSystemの判断範囲）
- ADR 0021（Context Builderの責務境界）

## コンテキスト

Version12指示書は、Decision Support（意思決定支援）という、字面
だけを見れば「Systemが判断に関与する」ように見える機能を要求して
いる。同時に指示書0章・1章・7章は「Project ARCは決定しない」
「行ってはいけないこと：正解を決定する、Ownerの代わりに選択する」
「ARCの文章（比較・解釈・優先順位の提案）は生成しない」と明記して
おり、この一見矛盾する要求をどう両立させるかを明確にする必要が
あった。

## 決定

`DecisionEngineUseCase`が生成する`DecisionContext`は、以下の性質を
すべて満たすことで「判断」ではなく「整理」に留める。

1. **候補（candidates）に優先順位を付けない**——配列の順序に意味を
   持たせず、CandidateBuilderもソートを行わない（指示書3章）。
2. **メリット/デメリットは新しい評価文を生成しない**——根拠
   （Knowledgeのcontent/ownerSummary/ownerComment/purpose）に
   固定キーワードで部分一致した既存の記述をそのまま抜き出すのみ
   （ADR 0022と同じ機械的分類。ComparisonBuilder自身が「これは
   良い」と評価する文を書くことは一切ない）。
3. **不足情報（missingInfo/missingInformation）は事実の指摘のみ**
   ——「根拠が0件」「メリデメに分類できる記述がない」という、
   データの有無という客観的事実を機械的に報告するだけで、
   「情報が足りないから選ぶべきでない」等の勧告はしない。
4. **pointsForOwnerToDecideはテンプレート文のみ**——「最終的な
   判断はOwner自身が行ってください」という固定文と、
   「confidenceがlow/unassessedの根拠が含まれる」という機械的
   条件判定による定型注意喚起のみで構成する。質問内容に応じた
   個別の助言文は生成しない。
5. **ARCの解釈・結論（「【ARC】この知識を踏まえると...」に相当する
   部分）は一切生成しない**——`buildRetrievalContext`（Version11、
   ADR 0021）と同じ境界線をDecisionEngineでも維持する。AIモデルは
   一度も呼び出さない（指示書16章）。

## 根拠

「比較」「整理」「可視化」「根拠提示」（指示書1章の「行ってよい
こと」）は、いずれも**既に存在するデータの再配置**であり、新しい
判断・評価を生成する行為ではない。DecisionEngineの5つの構成要素
（CandidateBuilder/EvidenceCollector/ComparisonBuilder/
DecisionContext組み立て）は、すべてこの「再配置のみ」という制約の
中で設計されている——どの構成要素も、根拠データに存在しない結論を
生成する経路を持たない。

これはVersion10のADR 0012（confidence・重複検知はOwnerが判断する
材料を示すだけ）、Version11のADR 0021（Context Builderは引用のみ）
から一貫した境界線の延長であり、Version12で新しい原則を導入した
わけではない。

## 影響

- DecisionContextの`merits`/`demerits`は、Ownerが過去に書いた
  文章に依存する。Ownerがメリット・デメリットに相当する記述を
  残していなければ、`missingInfo`として「分類できる記述がない」
  という指摘のみが返る（Systemが代わりにメリット・デメリットを
  創作することはない）。
- 将来「Systemがより踏み込んだ助言を行う」機能（Version12指示書の
  想定するVersion13以降）を検討する場合、それはConstitution第2条に
  関わる新しいガバナンス判断であり、Owner確認が必要な変更として
  扱うこと（`CLAUDE.md`参照）。
