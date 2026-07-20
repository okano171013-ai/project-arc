# ADR 0071: Canonical Storeの所在比較（cloud全面移行・現行Transport-queue案・hybrid案）

## ステータス

Accepted（**実際の移行は行わない**——本ADRは比較・決定記録のみ）

## 関連Principle・ADR

- Constitution第2条（Systemは判断しない）・第5条（個人データはOwnerの
  所有物であり、Ownerの制御下に置く）
- ADR 0058（Local-first、`jsonStore.ts`のatomic書き込み・世代backup）
- ADR 0059（Mobile Ingress as Transport vs Canonical Store）
- ADR 0064（Architecture Gate、$0/month既定）
- ADR 0068（Cloud Adapter境界・抽象追加なしの判断）
- ADR 0069（Cloud Worker実装・Pull/Reconciliation）
- ADR 0070（Cloud Quick Capture UI・PC-off Capability/Gap表）
- Owner指示書2026-07-20「Version39 Cloud Quick Capture & PC-off Gap
  Closure」項目6

## コンテキスト

ADR 0070は、「PC停止中でも生活ログを保存・参照できる」という
Ownerの要件が、Version39時点でも(a) cloud ingress受付までしか
満たされておらず、(b) canonical ARC確定・(c) 全生活履歴のread
availabilityはPC起動が前提のままであることを明らかにした。この
gapを本質的に解消する方法は、Canonical Store（`data/*.json`、
Project ARCの「真実」が確定して置かれる場所）そのものをどこに
置くかという設計判断に帰着する。Owner指示書は、3つの案を比較する
ADR/Decision Packetの作成を求めた。**実際の移行は行わない**——
本ADRは比較のみを記録し、選択の実行はOwnerの将来判断（Level2
Activation Gate）に委ねる。

## 比較対象の3案

### 案A：Canonical ARCを丸ごとcloudへ移行

Project ARCの`data/*.json`相当のCanonical Storeそのものを
Cloudflare（KVないしD1等）や他クラウドへ移し、ローカルPCは単なる
クライアントの一つにする。

### 案B：現行案（Transport queueのみcloudに置く）

ADR 0059以来の設計。cloud（Cloudflare KV）は一時的な受信キュー
（Mobile Ingress）としてのみ機能し、Canonical Store確定は常に
ローカルPC上の`jsonStore.ts`で行う。`pnpm mobile-sync pull`+`sync`が
PC起動時に橋渡しする。Version38・39はこの案の上に構築されている。

### 案C：Hybrid（Canonical Storeはローカルのまま、cloud側に限定的な
read-through cacheを持たせる）

Canonical StoreはローカルPCのまま（案Bと同じ）だが、cloud側の
KVに、直近確定分の**読み取り専用スナップショット**（例：直近N件の
Reflection/MealLog等の要約）を`pnpm mobile-sync sync`実行時に
書き出しておく。PC停止中でも「最近の記録が本当に届いたか」を
ある程度確認できるが、cloud側のデータは常にローカルより古い可能性
があることを明示する（write pathは変えない——書き込みは引き続き
案Bと同じくqueueのみ）。

## 評価軸ごとの比較

| 評価軸 | 案A：Canonical ARC全面cloud移行 | 案B：現行（Transport queueのみ） | 案C：Hybrid（read-through cache） |
|---|---|---|---|
| **個人情報の露出** | 生活ログ全体（食事・体重・感情・財務等の機微データ）が常時cloud上に平文またはKVネイティブ暗号化で存在する。Constitution第5条「Ownerの制御下」との緊張が最大。cloud provider（Cloudflare）のアクセス制御・法的開示要求のリスクを常時負う | 最小——cloud上には「pull・ack済みなら即削除」される一時データのみ残る（ADR 0069のretention設計）。定常状態でのcloud常駐データは実質ゼロに近い | 中間——直近N件の要約のみがcloud上に一定期間残る。全量ではないため露出は限定的だが、ゼロではない |
| **バックアップ** | cloud provider依存になる。Cloudflare KVは自前の複数リージョンレプリケーションを持つが、Ownerが独自にリストア手順を持てない（ADR 0058の世代backup・`pnpm backup restore`という「Ownerが検証済みの復旧手段」を失う） | 既存のADR 0058のバックアップ機構（ローカル世代backup）がそのまま有効。cloud側は失っても実害なし（queueは再送可能な設計） | 案Bと同じ——Canonical Storeのバックアップ方式は変わらない。cloud側cacheの喪失は「最近の確認ができなくなる」だけで実害は小さい |
| **削除（の確実性）** | 「完全に削除した」とOwnerが確認する手段が複雑化する（cloud providerのレプリケーション・キャッシュ層に残存する可能性を排除できない） | 削除対象はキュー内の一時データのみ。ack後は即削除、retentionポリシーも短期間で明確（ADR 0069） | 案Bと同程度に単純だが、cache分のTTL管理が追加で必要 |
| **費用$0制約（ADR 0064）** | D1やKVの無料枠を超える可能性が高い（全履歴の永続ストレージ・読み取り頻度は無料枠設計を超えやすい）。将来的な有料化圧力が最大 | 無料枠内に収まる設計（一時データのみ、TTLで自動失効、ADR 0069） | 案Bに近いが、cache分のKV書き込み回数が増える（`sync`実行ごとに追記）。無料枠には収まる想定だが案Bより余裕は小さい |
| **provider portability（特定providerへのlock-in回避）** | 最も低い。Canonical Storeの構造がcloud provider固有のAPI・データモデルに強く依存するようになり、将来他providerや再びlocal-firstへ戻す際の移行コストが最大 | 最も高い。Canonical Storeは常にローカルJSON（provider非依存）。cloud側はいつでも「別のTransport実装」に差し替え可能（ADR 0068のCloud Adapter境界がこれを保証） | 高い——書き込み経路（Canonical Store）は案Bと同じくprovider非依存。cache層のみprovider依存だが、無くても機能は失われない（劣化のみ）ため低リスク |
| **Remote MCPとの統合（ADR 0044・0045、ARC⇔Claude Code連携）** | ARCがRemote MCP経由でCanonical Storeへ直接アクセスする際、cloud側APIを新設・維持する必要が生じる（現状のstdio MCP toolとは別の認証・契約が必要になり複雑化） | 影響なし——Remote MCPは既存のローカルCanonical Store読み取り経路（`agent_message_list`等）をそのまま使い続けられる | 影響なし——Remote MCP接点は案Bと同じくローカル側のまま。cache層はRemote MCPの関心外 |

## 決定

**現時点では案B（現行のTransport-queueのみcloud案）を維持する。**
移行は行わない。理由：

1. Constitution第5条・ADR0064の$0/month制約・ADR0068のprovider
   portability方針のいずれとも、案Bが最も整合する。案Aはこれら3つ
   全てに緊張を生む。
2. 案Cは「PC-off中でも直近の記録が届いたか確認できる」という
   Ownerの体感的なgapをある程度緩和できる可能性があるため、**将来
   検討する価値がある**次点候補として記録する。ただし、Version39の
   スコープでは実装しない（Owner指示書は比較のみを求めており、
   「どれを選ぶか」自体は本ADRのAccepted決定であって実装ではない）。
3. 案Aは、ADR 0070が明らかにした(b)(c)のgapを構造的に解消できる
   唯一の案ではあるが、個人情報露出・バックアップ・費用の3点で
   Project ARCの既存原則と最も強く衝突するため、**Owner・ARC双方の
   明示的なConstitution/Principlesレベルの合意なしに選択すべきでは
   ない**——これはLevel2 Owner Activation Gate相当の判断であり、
   本セッションの自律スコープの外側にある。

## 案Cを将来検討する場合の留意点（実装しない、記録のみ）

- cache分のデータは「劣化しても実害がない」設計を維持すること
  （cacheが古くても、参照者に「これは最新でない可能性がある」ことを
  必ず明示する）。
- cacheのTTLと$0枠の消費量を`pnpm cloudflare:preflight`（本Version
  で新設、後述）のようなチェックに組み込み、無料枠超過を事前に
  検知できるようにすること。
- cache層の追加は新たな抽象を増やすため、ADR 0068の「新しい抽象を
  追加しない」原則との整合を再評価すること。

## 影響

- 実装変更なし（本ADRは比較・決定記録のみ）。
- `docs/roadmap.md`に、案C（Hybrid read-through cache）を将来検討
  候補として記録する。

## 見送った案

- **案A（Canonical ARC全面cloud移行）を今すぐ採用する**：個人情報
  露出・バックアップ・費用$0制約の3点で既存原則と衝突するため
  見送った。将来、Owner・ARC間で明示的にConstitution/Principlesの
  再検討を行った上でなければ選択すべきでない。
- **3案とも採用せず現状のまま何もしない**：ADR0070が明らかにした
  gapをOwnerが正確に認識できるよう、少なくとも比較・記録は行う
  べきと判断し、本ADRの作成自体は実施した。
