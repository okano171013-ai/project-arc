# Project ARC — Version6 Report

作成者：Claude Code（CTO） 　宛先：Owner / ARC（ARCレビュー用正式記録）
日付：2026年7月

---

## 1. Version6概要

Version6のテーマは「Smart Capture」。ARCのブリーフでは「Ownerが
『記録して』と言わなくても、ARCが写真・文章を見てどのLogを更新すべきか
自動判断する仕組み」と説明されていた。設計に着手する前に
`docs/ai-roles.md`・`docs/principles.md`（Principle 1/2/5/10）を確認
した結果、これを字面通り「Systemが自動で分類・解釈する」設計にすると、
Project ARC自身の統治原則（「Systemは判断しない、忠実に記録するだけ」
「重要度判定・解釈はARCの責務であり、Systemが兼務してはならない」）
に反することが分かった。Owner確認のもと、「Systemは記録先の実行のみ、
分類は提案材料に限定」という方針で設計・実装した（ADR 0007）。

MVPとして、Skin Log / Purchase Log / Challenge Log / Appearance Logの
4つを対象に、テキストからのキーワードベースの下書き提案とOwner確認を
経た書き込みを行う`pnpm capture`コマンドを実装した。

---

## 2. 今回実装した機能

### Smart Capture（`pnpm capture -- add/list`）

1. Owner（またはARCとの対話を経たOwner）が文章・写真パスを入力する。
2. `RuleBasedCaptureClassifier`が固定キーワード表による下書き提案
   （「📌 Auto Log 提案（下書き・要確認）」）を表示する。断定はせず、
   検出したキーワードを根拠として示す。
3. Ownerが「すべて確定 / 個別に選ぶ / 中止」を選択する（提案がない
   場合は手動でLogを選べる）。
4. 確定した振り分け先ごとに、既存のUseCase（`AddSkinLogUseCase`等）
   を呼び出して書き込む。必須項目（AppearanceLogの`overallRating`等）
   が確定内容に含まれない場合は、値を推測せずOwnerに追加で質問する。
5. 書き込み結果を「📌 ARC Auto Log 更新件数：N件」の形式で表示し、
   何が入力されどこに書き込まれたかをCapture Logとして監査記録に残す
   （`pnpm capture -- list`で確認可能）。

対象Logは`SkinLog`/`PurchaseLog`/`ChallengeLog`/`AppearanceLog`の
4つに限定した（3章）。

---

## 3. System/ARCの責務分担（設計上最も重要な判断）

`docs/ai-roles.md`は、Project ARC（System）の意思決定範囲を
「一切なし」と明記し、「重要度判定・解釈はARCの責務であり、Systemが
兼務してはならない」「システムが暴走しない（＝勝手に判断し始めない）
ことを保証するのは、実装上最も重要な制約の一つ」としている。

Ownerに確認の上、以下の方針で設計した（ADR 0007に正式記録）。

- **Systemの役割は2つに限定**：(1) キーワードによる機械的な下書き
  提案の提示、(2) Owner/ARCが確定した振り分け先への忠実な書き込み。
- **本物の分類・解釈はARC/Ownerの役割のまま**：`pnpm capture`は
  「ARCとの会話で決まった内容をOwnerが持ち込む窓口」としても、
  「キーワード提案をOwnerがその場で確認する」用途としても使える。
- **`CaptureClassifier`をポートとして分離**：将来より高度な分類が
  必要になった場合も、Application層を変更せずAdapterだけ差し替え
  られる（ADR 0002の再検討ポイントとして活用できる設計）。

対象Logをこの4つに絞った理由は、いずれも「ある瞬間の出来事」を
日付キーで記録するLogであり、Captureの性質（一度の入力＝ある瞬間の
記録）と合うため。Memory（時間に紐づかない知識）とLife Inventory
（耐久品の状態管理）は対象から外した。ARCのブリーフは「メラノCC
買った→Purchase, Inventory」も例示していたが、ADR 0006で消耗品は
Purchase Log側に一本化済みのため、ブリーフの例よりADR 0006の境界を
優先した。

---

## 4. Architecture Review

### 追加したEntity

| Entity | 追加理由 |
|---|---|
| `Capture` | 入力（テキスト・写真パス）・下書き提案・確定後の書き込み結果（監査用）を1つにまとめて保持する |

### 追加したPort

| Port | メソッド | 内容 |
|---|---|---|
| `CaptureClassifier` | `suggest` | 下書き提案を返す。将来のAI分類実装への差し替え口 |
| `CaptureRepository` | `save`/`findAll` | Captureの監査ログ永続化 |

### 追加したUseCase

| UseCase | 内容 |
|---|---|
| `SuggestCaptureDestinations` | `CaptureClassifier`を呼び提案一覧を返すだけ。書き込みは一切しない |
| `RecordCapture` | 確定済みの`destinations`を受け取り、既存の4つのUseCase（`AddSkinLogUseCase`/`RecordPurchaseUseCase`/`AddChallengeLogUseCase`/`AddAppearanceLogUseCase`）へそのまま委譲。新規の書き込みロジックは重複実装していない |

### 追加したAdapter / Infrastructure

| ファイル | 内容 |
|---|---|
| `RuleBasedCaptureClassifier` | MVP実装。固定キーワード表による文字列一致のみ。AI・画像解析は行わない |
| `JsonFileCaptureRepository` → `data/capture-log.json` | |
| `src/infrastructure/cli/capture.ts` | `add`（提案表示→確認→書き込み）/ `list`（監査履歴） |

---

## 5. ADR

### 追加したADR

- **ADR 0007: Smart CaptureにおけるSystem/ARCの責務分担**
  （`docs/adr/0007-smart-capture-system-arc-boundary.md`）
  3章で説明した責務分担の決定を正式に記録した。

### ADRを追加しなかった判断とその理由

- **対象Logを4つ（SkinLog/PurchaseLog/ChallengeLog/AppearanceLog）
  に絞った判断**：ADR相当か迷ったが、「日付キーで記録する瞬間的な
  出来事のLog」という基準はADR 0005/0006の延長線上にあり、新しい
  境界原則を作ったわけではないため、本Report（3章）に記録するに
  留めた。MemoryやInventoryをCapture対象に含めたいという具体的
  ニーズが出た時点で改めて検討する。

---

## 6. テスト

| 項目 | 結果 |
|---|---|
| テストファイル数 | 14ファイル（新規2） |
| テストケース数 | 73件（Version5の64件 + 新規9件） |
| typecheck | エラーゼロ |
| lint | エラーゼロ |
| 実ファイルI/Oでの結合スモークテスト | 実施済み（後述） |
| 対話式CLIの実機確認 | 未実施（後述の制約） |

**内訳（新規追加分）**：
- `Capture.test.ts`（5件）：`SuggestCaptureDestinations`がclassifier
  の提案をそのまま返すことの確認（UseCase自身が判断しないことの
  テスト）、`RecordCapture`が確定済みdestinationsを正しく各Logへ
  書き込むこと、複数destinations処理、必須項目欠如時に捏造せず
  エラーになること（AppearanceLog/PurchaseLog）
- `RuleBasedCaptureClassifier.test.ts`（4件）：キーワード一致・
  複数Logへの提案・無一致・写真のみ入力時に提案しないこと

**重要な制約（Version3〜5から継続、原因を特定）**：本Versionの作業中に、
対話式CLIがサンドボックスで確認できない根本原因を特定した。Node.js
（v24.18.0）の`readline/promises`は、非TTY標準入力（パイプ・
ファイルリダイレクト）に対して`rl.question()`を複数回連続で呼び出すと、
1回目は正常に解決するが2回目以降が入力行を取りこぼしてハングする。
最小再現コードで確認済み。`winpty`（このマシンにインストール済み）
も試したが、`stdin is not a tty`のため非対話的な自動入力には使えず、
この環境からTTYを偽装する手段がなかった。これはコード側の不具合
ではなく、人間が実際のターミナルで1文字ずつ入力する通常の使い方
では発生しない（ただし複数行をまとめてペーストして回答する場合は
実ターミナルでも同様の事象が起きうることが分かったため、6章の
懸念として記録しておく）。

代わりに、readlineの対話層を除いた「実ファイルI/Oでの結合スモーク
テスト」を実施した（Fakeでなく実際の`JsonFileCaptureRepository`
等を使い、`data/`配下への実書き込み・再読込を検証）。「メラノCC
買った」→PurchaseLog、「肌にニキビができて初めて皮膚科に行った」
→SkinLog+ChallengeLogの複数書き込み、AppearanceLogの`overallRating`
未指定時のエラーを、それぞれ実ファイル経由で確認した（検証後に
テストデータは削除済み）。

---

## 7. 修正したバグ

Version6の実装過程では、コードレビューで検出・修正した不具合はなかった。
Version5までと異なり、対話式CLI検証ができない根本原因（6章）を
特定できたことは、今回の副産物と言える。

---

## 8. 技術的負債

- **対話式CLIの実機動作が依然として未確認**：readlineの多段プロンプト
  は、複数行ペーストへの耐性がない可能性がある（6章）。Ownerが
  まとめてペーストする運用をする場合、CLI側で1問ずつの入力を促す
  設計に変更する必要が出るかもしれない。
- **キーワード表が単純**：`RuleBasedCaptureClassifier`は固定の
  キーワードリストのみで、表記ゆれ（「ニキビ」と「にきび」等）には
  対応していない。ADR 0007により、これは意図的にAI分類を避けている
  ためのシンプルさであり、将来classifierを差し替える際に解決される
  想定。
- **Capture LogとSkin/Purchase/Challenge/AppearanceLogの間の
  トレーサビリティが片方向**：`Capture.appliedDestinations`から
  各Logのレコードidは追えるが、逆に各Logのレコードから「どの
  Captureから生まれたか」は辿れない（各LogのEntityにCapture idを
  持たせていないため）。実運用で必要になれば追加を検討する。

---

## 9. Version7への申し送り

- **本物のAI分類を検討する場合**：ADR 0002（AIプロバイダー抽象化の
  先送り）とADR 0007（System/ARCの責務分担）を両方再検討する必要が
  ある。「Systemが自律的に判断する」方向ではなく、「ARCが判断し、
  Systemはその結果を受け取って記録する」という連携方式（例：ARCが
  呼び出せるAPI）を優先的に検討することをADR 0007に明記した。
- **画像解析はまだ未着手**：Skin Log/Appearance Log/Capture、いずれも
  写真はファイルパスの管理のみで、内容の解析はしていない。将来
  画像解析を導入する場合も、System自身が「この写真は何を意味するか」
  を判断する設計にはせず、ARCが解釈した結果を受け取る形を維持すべき。
- **対話式CLIの複数行ペースト耐性**：6章で判明した制約は、Owner運用
  次第では実際に困る可能性がある。まとめてペーストする使い方をする
  かどうか、Ownerに確認しておくとよい。

---

## 10. POへの提案

### UX改善案

- 現状`pnpm capture -- add`は毎回「文章」「写真パス」を両方聞かれる。
  Ownerの実際の使い方（写真だけ／文章だけが多いか）が分かれば、
  入力順序や省略のしやすさを調整する余地がある。

### 設計改善案

- `RecordCapture`のdestinations指定は現状CLIの対話フローからのみ
  作られる。将来ARCとの連携（API等）ができた場合、同じUseCaseを
  そのまま呼び出せる設計にしてあるため、CLI以外の入力経路を追加する
  コストは低い。

---

## 11. CEOへのコメント

Version6は、機能実装そのものより「このブリーフをそのまま実装して
よいか」を立ち止まって検討したことが一番の成果だったと思います。
ARCのブリーフを字面通り実装すれば「Systemが自動で判断する」仕組みに
なっていたはずですが、それはProject ARC自身が定めた`docs/ai-roles.md`
の「Systemは判断しない」という最重要制約と真正面から衝突するもの
でした。実装を始める前にこの矛盾に気づけたのは、Version1で思想
ドキュメントを先に作っておいたからだと思います——コードだけを見て
いたら、この矛盾には気づけませんでした。

Owner確認の結果、「Systemは記録先の実行のみ、分類は提案材料に限定」
という、Project ARC自身のガバナンスに忠実な設計に落ち着きました。
これはARCのブリーフが求めていた体験（写真や文章を送るだけで記録
される）を完全に満たすものではなく、「提案は出るが最終確定はOwnerが
行う」という一段階分Ownerの手間が残る設計です。この点はトレード
オフとして正直にお伝えしておきたいです。ブリーフの理想を完全に
実現するには、ARC（ChatGPT）側から直接Systemを呼び出せる連携
（API等）が必要で、それは今回のスコープ外（ADR 0007の9章参照）です。

対話式CLIの実機確認ができない根本原因（6章）を今回特定できたのは
副産物ですが、逆に言えば`pnpm capture -- add`の実際の使い心地は
まだ何も確認できていません。Skin/Purchase/Challenge/Appearanceの
4つのLogに同時に触れる、これまでで最も複雑なCLIフローなので、
実機確認は特に重要だと考えています。

---

## 12. ARCへの引き継ぎ

### 新しい資産

- **Smart Capture**（`pnpm capture -- add/list`）：Ownerが文章や
  写真を入力すると、キーワードに基づく下書き提案（「肌」→Skin Log、
  「買った」→Purchase Log等）が出て、確認の上でSkin Log/Purchase
  Log/Challenge Log/Appearance Logへ書き込める。ARCが会話の中で
  「これはSkin Logに記録しておくとよさそうですね」と提案する際、
  Ownerに`pnpm capture`を案内する、あるいはARCとの会話で確定した
  内容をOwnerがそのままCaptureの入力として使う、という2通りの
  使い方ができる。
- **Capture Log**（`pnpm capture -- list`）：いつ・何を入力し・
  どのLogに書き込まれたかの監査履歴。「最近何を記録したっけ」と
  聞かれた際の参照材料になる。

### 新しいルール

- **Smart Captureは「提案」であり「決定」ではない**：`pnpm capture`
  が出す下書き提案は、キーワード一致による機械的なものであり、
  ARCが行うような文脈理解や重要度判断は含まれていない。ARCが
  Ownerに「システムが自動で正しく判断してくれる」かのような案内は
  しないでほしい。最終的にどのLogに何を記録するかは、常にOwner
  （またはARCとの会話を経たOwner）が確定する。
- **ProjectARC（System）は判断しない、という原則がVersion6で明文化
  された**（ADR 0007）：これはVersion1からの`docs/ai-roles.md`の
  原則を、Smart Captureという「一見System側が判断していそうな機能」
  で改めて確認・明文化したものである。ARCが今後Project ARCに新しい
  機能を提案する際も、「その判断はSystemにやらせるのか、ARC自身が
  担うべきか」を先に問うてから提案してほしい。

### 新しい思想

Version6は、「便利そうな機能をそのまま作る」のではなく、「その機能は
本当にこのプロジェクトの役割分担と整合するか」を実装前に確認する
ことの重要性を示した回だった。ARCのブリーフは善意で書かれたものだが、
文字通り実装すればProject ARC自身の統治原則と矛盾する——このズレは、
Version1で`docs/ai-roles.md`という「誰が何を決めるか」を先に文書化
しておいたからこそ検出できた。技術的な設計判断だけでなく、「思想
ドキュメントが実装の暴走を止める」という、Principle 8（長期保守性）
の効能を実地で確認したVersionでもあった。

### Ownerについて分かったこと

- ai-roles.mdとの矛盾を指摘した際、Ownerは「System側は記録先の
  実行のみ、分類は提案材料に限定」という、より保守的で原則に忠実な
  方を即座に選んだ。機能の見栄え（ブリーフ通りの「自動でARCが判断」）
  よりも、プロジェクト自身が定めたガバナンス原則を優先する判断
  スタイルがうかがえる。
- Version5終盤で「ターミナルの権限を与えるので実行してほしい」と
  明確に指示された。Claude Codeが「サンドボックスの制約で確認
  できない」と説明するだけでは終わらせず、実際に手を動かして
  確認してほしいというOwnerの姿勢が見られた。今後も「確認できません」
  で終わらせず、代替手段（実ファイルI/O結合テスト等）を自分で
  探して実行するところまでやり切ることを意識する。

---

## 13. Product Review

### ユーザー体験で改善されたこと

- **Before**：肌の変化・消耗品の購入・初めての体験・外見の変化を
  記録したい場合、Ownerは毎回「どのコマンドを使うべきか」を自分で
  判断してから`pnpm skin`/`pnpm purchase`/`pnpm challenge`/
  `pnpm appearance`のいずれかを個別に起動する必要があった。
- **After**：`pnpm capture -- add`に一言書くだけで、候補となる
  記録先が提示されるようになった。「このLogに書けばいいんだっけ」を
  考える手間が減る。

### 毎日使う理由

Smart Captureは「気づいたときにさっと記録する」ための入り口として、
Skin Log/Purchase Log/Challenge Log/Appearance Logへの記録の
心理的ハードルを下げることを狙っている。ただし実際に「毎日使う理由」
になるかは、6章で触れた通り実機での使い心地次第であり、本Report
時点では未検証。

### 懸念

- 提案が「下書き」であることを毎回確認する必要があるため、ARCの
  ブリーフが期待していたような「送るだけで完全に自動で記録される」
  という体験には届いていない。これは意図的なトレードオフ
  （11章・ADR 0007）だが、Ownerが実際に使ってみて「確認の手間が
  想定より煩わしい」と感じる可能性はある。

### 次Versionで最も価値が高い改善

対話式CLIの実機確認が最優先。特にSmart Captureは4つのLogにまたがる
分岐が多い最も複雑なCLIフローであり、実際に使ってみて初めて
「提案→確認→書き込み」のテンポが心地よいかどうかが分かる。次点は、
ARCが直接Project ARCを呼び出せる連携（11章で触れた将来の拡張）を
検討し、「提案の確認」すら不要になる体験に近づけることだが、これは
新しいADR 0002の再検討を伴う大きな意思決定であり、Owner/ARCとの
合意形成から始める必要がある。
