# ADR 0059: Mobile Ingress を「Transport」として扱い、「Canonical Store」にしない

## ステータス

Proposed（Version31、設計のみ。実装はProgram B・Version32以降）

## 関連Principle

- Constitution第1条（Project ARCが唯一の人生データベースである）
- Principle 4（記録は資産である）・Principle 8（長期保守性）
- ADR 0003（ローカルJSON永続化）・ADR 0058（Life Data Durability）

## コンテキスト

`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`
Program Bは「PCが停止中でも、スマホからDaily記録を直ちにProject ARC
へ耐久保存できる環境」を求めている。PC停止中はlocalのJSON
Repository（`data/*.json`、ADR 0003・0058）へ直接書き込めないため、
常時稼働するクラウド側の受信口（Mobile Ingress）が必要になる。

ここで「クラウド側に保存された記録は、それ自体がProject ARCの
データベースの一部なのか、それとも一時的な中継点なのか」という
設計上の境界を先に決めておかないと、Constitution第1条
「唯一の人生データベース」が指すものが曖昧になり、Program Bの実装
（Version32以降）が土台なく進んでしまう。

## 決定

**Mobile Ingressは「Transport（一時中継）」であり、「Canonical
Store（正本）」ではない。** Project ARCの唯一の人生データベースは、
今後もlocalの`data/*.json`（ADR 0003・0058のRepository群）である。

### 2段階のstatus

1. **Accepted**：Mobile Ingressが記録を暗号化して耐久保存し、
   スマートフォン側にreceiptを返した状態。この時点では
   Project ARC（canonical store）にはまだ反映されていない。
2. **Canonicalized**：PCが起動し、Sync Workerがingressから記録を
   取得し、schema検証・idempotency確認を経てlocalの
   `data/*.json`へ反映した状態。ここで初めてConstitution第1条の
   「唯一の人生データベース」に記録が含まれる。

UIおよびAPIレスポンスは、この2状態を常に明示する（「保存済み」を
Canonicalized未達の状態に対して使わない）。

### Ingressの位置づけ

- Ingressは`AgentDelegationGrant`や既存のWrite Proposal Layer
  （ADR 0031）と同じ「Owner本人が既に確定させた事実の記録経路」の
  1つであり、新しい判断主体ではない。Ingress自体は記録内容の解釈・
  分類を行わない（Constitution第2条）。
- Ingressに保存されたデータは、Sync WorkerがCanonicalize
  するまでの一時的な状態であり、Ingress側を「もう1つの人生DB」
  として直接参照するUseCase・MCP Toolを作らない——参照は必ず
  Canonicalize後のlocal Repositoryを経由する。
- Ingress障害・データ消失時も、「まだCanonicalizeされていない
  Accepted状態の記録」を失うリスクはあるが、「Canonicalize済みの
  記録」はlocalに残るため、Ingressの障害がProject ARC全体の
  データ損失には直結しない設計とする。

### Idempotency

Sync WorkerがIngressから取得する各記録は、スマートフォン側が生成する
`idempotencyKey`を持つ。同じキーを持つ記録がlocalに既に
Canonicalize済みであれば、再取得しても重複保存しない
（ADR 0024・0025のAgentDelegationGrant系実装で確立した重複防止
パターンを踏襲する）。

## 根拠

- 「唯一の人生データベース」という既存の強い前提（Constitution第1条）
  を、クラウド常駐コンポーネントの追加によって曖昧にしないことが、
  Program Bの実装より優先される設計上の制約である。
- 2段階statusという明示的なモデルは、「即時受付」と
  「local正本反映」を混同させない、というProgram B文書自身の要求
  そのものを構造的に強制する。
- Ingressを判断主体にしない設計は、ADR 0007（Smart Capture）・
  ADR 0053（行動介入）で繰り返し確立してきた「Systemは判断しない」
  という一貫した設計パターンの、新しいコンポーネントへの適用である。

## 未決定（Architecture Gateで確定する事項、本ADRの対象外）

- Ingressの具体的なホスティング先（Managed serverless DB/API、
  専用VPS、常時稼働home device）とその月額・従量cost
- 暗号化方式（TLSに加えたpayload-level暗号化の要否）
- data保持期間・地域
- 認証方式（OAuth／passkey等）

これらは`docs/project-management/OWNER_PRIORITY_PROGRAMS_2026-07-19.md`
の「Architecture Gate」でOwnerが確定した後、別ADRで記録する。

## 影響

- Version31時点ではコード変更なし（設計のみ）。
- Version32以降、Sync Worker・Ingress・Canonicalize処理を実装する際は、
  本ADRの「2段階status」「Ingressは判断しない」「idempotencyKey」を
  前提とする。
