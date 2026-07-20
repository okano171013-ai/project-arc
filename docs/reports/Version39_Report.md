# Version39 Report: Cloud Quick Capture & PC-off Gap Closure

commit: `61f0055`

## 1. Version概要

ARCがGit経由で送った指示書（2026-07-20、`docs/handoff/archive/
Version39_ARC_Brief.md`）に基づき、Version38が「クラウド待機
キューまで」だった状態から一歩進め、スマホから直接使えるCloud
Quick Capture UIをCloudflare Worker側（`GET /`）に実装した。あわせて、
「PC-off保存」という言葉を曖昧に使わないよう、(a) cloud ingress
受付、(b) canonical ARC確定、(c) read availabilityの3段階へ明示的に
分解したCapability/Gap表（ADR 0070）と、Canonical Storeの所在
（cloud全面移行・現行Transport-queue案・hybrid案）を比較する
ADR 0071を作成した。デプロイ前preflightチェック
（`pnpm cloudflare:preflight`）を新設し、実機のヘッドレスブラウザ
検証で2件の実装バグ（CSP inline-style属性ブロック、非表示
fieldset内の`required`属性によるフォーム全体ブロック）を発見・
修正した。実際のCloudflareアカウント作成・デプロイ・秘密情報生成・
公開URLの発行は一切行っていない。

## 2. 今回実装した機能（理由も含めて説明）

- **Cloud Quick Capture UI**（`cloudflare/src/worker.ts`の`GET /`）：
  Reflection / MealLog / NutritionLog / WeightLog / FinanceLogを
  明示選択できるフォーム。型からの自動推測・自動生成は行わない
  （Owner指示1）。ローカル版・cloud版の実装重複を避けるため、
  `renderQuickCaptureHtml(nonce)`を`src/infrastructure/http/
  quickCaptureHtml.ts`へ共通モジュールとして切り出し、両ランタイム
  から純粋関数としてimportする設計にした（Node固有API・Workers
  固有APIのどちらにも依存しない）。
- **Token非埋め込み設計**（Owner指示2）：`DEVICE_TOKEN`／
  `PULL_TOKEN`はHTML/JS/URL query/監査ログのいずれにも埋め込まない。
  既定では`localStorage`へ保存せず、ページを開くたびに空欄から
  始まる。Ownerが明示的にチェックした場合のみ、危険性の説明を
  表示した上でopt-inのlocalStorage保存を行い、「消去」ボタンで
  いつでも削除できる。
- **CSP（per-request nonce）**：`script-src`/`style-src`を
  リクエストごとに生成するnonceで制限し、`'unsafe-inline'`を
  使わない。ローカル版は`node:crypto`の`randomBytes`、cloud版は
  Web Crypto（`crypto.getRandomValues`）で生成する。
- **否定テスト**（Owner指示3）：CSPヘッダーの存在・nonceの形式、
  DEVICE_TOKEN/PULL_TOKENがレスポンスに一切含まれないこと、5種類
  全typeのフォームフィールドが存在すること、を両ランタイムの
  テストへ追加した（`mobileIngress.test.ts`+2件、`worker.test.ts`
  +3件）。
- **送信UX**（Owner指示4）：同じ論理エントリの再送では同じ
  `idempotencyKey`を使い回す（`currentSubmissionKey`、確定成功まで
  nullへ戻さない）。送信直後に自動で`GET /ingress?idempotencyKey=`
  を呼びsubmission statusを表示する。オフライン・サーバーエラー時は
  入力内容を保持し、フォームをクリアしない。typeを切り替えた場合の
  み新しい論理エントリとみなし`idempotencyKey`を破棄する。
- **ADR 0070**：「PC-off保存」の3段階分解（Capability/Gap表）と
  Cloud Quick Capture UIの設計判断を記録（Owner指示5）。
- **ADR 0071**：Canonical Storeの所在（cloud全面移行・現行
  Transport-queue案・hybrid案）を、個人情報露出・バックアップ・
  削除・費用$0制約・provider portability・Remote MCP統合の6軸で
  比較した（Owner指示6）。**実際の移行は行っていない**——現行案
  （案B）を維持する決定を記録したのみ。
- **`pnpm cloudflare:preflight`**（`cloudflare/preflight.ts`、Owner
  指示7）：`wrangler.toml`の存在・`name`/`main`/
  `compatibility_date`/`nodejs_compat`/KV binding名・secret値の
  非ハードコードを検査し、`pnpm cloudflare:typecheck`/
  `pnpm cloudflare:test`を実行してREADY/NOT READYを報告する。
  `wrangler login`・`wrangler deploy`・`wrangler secret put`など
  アカウントに触れる操作は一切実行しない。

## 3. 実装しなかった機能（延期理由も記載）

- **実際のデプロイ・アカウント作成**：Owner指示により明示的に禁止。
  引き続き`Version38_Activation_Packet.md`の手順のみが対象
  （本Versionで変更なし、Quick Capture UIはデプロイ後すぐ`GET /`
  で使える状態）。
- **Canonical StoreのCloud移行（ADR 0071の案A）・Hybrid cache
  （案C）の実装**：Owner指示6により、比較のみで実装は行わない。
  現行案（案B）を維持する決定のみを記録した。
- **(b) canonical ARC確定・(c) 全生活履歴read availabilityの
  PC-off化**：ADR 0070が明らかにした通り、Version39でも未達のまま
  である。これを「対応完了」と表現しないことが今回のOwner指示の
  核心であり、意図的に手をつけていない。

## 4. Architecture Review

- 新規：`src/infrastructure/http/quickCaptureHtml.ts`
  （`renderQuickCaptureHtml(nonce)`、Node/Workers共通の純粋関数）
- 新規：`cloudflare/preflight.ts`（読み取り専用のデプロイ前チェック）
- 変更：`src/infrastructure/http/mobileIngress.ts`
  （`renderQuickCaptureHtml`の呼び出しへ切り替え、CSPヘッダー追加。
  UI実装本体（約370行）を`quickCaptureHtml.ts`へ移動したため正味の
  行数は大幅減）
- 変更：`cloudflare/src/worker.ts`（`GET /`ハンドラ追加、
  `generateNonce()`追加）
- Domain・Application層は無変更——UseCase（`ReceiveIngressRecordUseCase`・
  `ListIngressRecordsUseCase`）は一切変更していない。

## 5. ADR

- **新規：ADR 0070**（Cloud Quick Capture UI・Capability/Gap表）：
  「PC-off保存」の3段階分解、共通UIモジュール化の理由、token/CSP
  設計、実機検証で発見した2件のバグを記録。
- **新規：ADR 0071**（Canonical Store所在比較）：3案の6軸比較表、
  現行案（案B）維持の決定、案C（Hybrid）を将来検討候補として記録。

## 6. テスト

- `pnpm typecheck` / `pnpm lint`：合格
- `pnpm test`：**642件合格**（Version38時点640件 + 2件新規：
  mobileIngress.test.tsのCSPヘッダーテスト・token非埋め込みテスト）
- `pnpm cloudflare:test`（別ゲート、Miniflare実機）：**17件合格**
  （Version38時点14件 + 3件新規：CSP/nonceヘッダーテスト、
  DEVICE_TOKEN/PULL_TOKEN非埋め込みテスト、5type網羅テスト）
- `pnpm cloudflare:typecheck`：合格
- `pnpm cloudflare:preflight`：実行成功（`wrangler.toml`未作成の
  ためNOT READY——これは実デプロイ前の正常な状態であり、
  `cloudflare:typecheck`/`cloudflare:test`は共にOK、secretハード
  コードなしも確認できることを確認した）
- **ARC-PM-005（`pnpm build`のTS2742失敗）が本Versionの変更と無関係
  であることを`git stash`比較で再確認**：Version39の変更を全て
  stashした状態でも同じ`generateOpenApiDocument`のTS2742エラーが
  再現し、変更前から存在する既知の問題であることを確認した。
- **実機確認**：グローバルインストール済みPlaywrightのヘッドレス
  ブラウザで、ローカル版・cloud版（Miniflare起動）の両方に対して
  実際のフォーム送信・token opt-in/永続化/消去・オフライン再送
  （`page.route`でネットワーク断を模擬）を実行し、CSPコンソール
  エラー・ネイティブフォームバリデーションエラーの有無を含めて
  確認した（7章参照）。検証用スクリプト・データは確認後に削除済み。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

- **CSP違反によるinline style属性の無音ブロック**：検出方法は
  Playwrightの`page.on('console')`でCSP違反ログ
  （`Refused to apply inline style...`）を捕捉したこと。原因は、
  CSPのnonceは`<style>`/`<script>`要素自体には効くが、任意要素の
  inline `style="..."`属性には効かないという仕様（nonceは要素単位の
  許可であり属性単位ではない）を見落としていたこと。対応は、
  該当する全てのinline style属性をCSSクラス
  （`.warn`/`.small-btn`/`.inline-checkbox`等）へ置き換え、JS側も
  `.style.display`直接操作から`classList`のtoggleへ変更したこと。
  再発防止：CSPを新規に導入する際は、単体テストだけでなく必ず実際の
  ブラウザでコンソールエラーの有無を確認する、という手順を今後の
  UI関連Versionでも踏襲する。
- **非表示fieldset内の`required`属性がフォーム全体の送信を無音で
  ブロックする**：検出方法は、Playwrightで送信ボタンをクリックしても
  実際のPOSTが発火しないことに気づき、`page.on('console')`/
  `pageerror`を追加したところ`"An invalid form control with
  name='mealLogId' is not focusable."`というネイティブHTML5
  バリデーションエラーを検出したこと。原因は、NutritionLogの
  fieldsetが`display:none`で非表示であっても、`required`属性は
  ブラウザのネイティブフォームバリデーション対象であり続け、
  他のtype（Reflection等）を選択して送信しようとしても、非表示の
  NutritionLogフィールドの未入力が原因で送信イベント自体が
  ブロックされていたこと。この不具合はVersion38でNutritionLogを
  追加して以来存在していたが、それまでの「実機確認」が直接
  `fetch()`を叩く方式（ネイティブフォームバリデーションを
  バイパスする）だったため発見されていなかった。対応は、`required`
  属性を`data-required-when-active`マーカーへ置き換え、
  `updateVisibleFields()`内でアクティブなfieldsetのフィールドにのみ
  `required`をJSで動的に付与する方式へ変更したこと。再発防止：
  フォーム関連の実機確認は、直接`fetch()`を叩くテストだけでなく、
  必ず実際の送信ボタンクリックを経由したテストも行う——本Versionの
  教訓として次Version以降のUI変更でも徹底する。

## 8. 技術的負債（今後改善したい点）

- ADR 0070の通り、(b) canonical ARC確定・(c) 全生活履歴read
  availabilityのPC-off化は未達のまま——ADR 0071で比較した案C
  （Hybrid read-through cache）が次の検討候補として残る。
- Cloud Quick Capture UIは実際のCloudflareアカウントでは未検証
  （Miniflareのみ）——実デプロイ後、実際のネットワーク遅延・TLS
  証明書の挙動差異が出る可能性がある（Version38から継続する既知の
  限界）。
- `cloudflare:preflight`は静的な設定チェックに留まる——実際の
  KV namespace idの妥当性（存在するかどうか）はwrangler CLIでの
  ログインが必要なため検査できない（意図的な制約、Owner指示7）。

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- Owner確認後、実際のCloudflareデプロイを行い、`pnpm
  cloudflare:preflight`をデプロイ直前のチェックリストとして
  実際に使ってみる。
- ADR 0071の案C（Hybrid read-through cache）を、Owner・ARCとの
  対話を経て次Versionで実装するかどうかを判断する。
- 「16件」の実取り込みは引き続きOwner自身の作業として残っている。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

- 実機のヘッドレスブラウザ検証で2件のバグを発見できたことは、
  「HTTPレベルのテストだけでは不十分」という教訓を改めて具体化
  した。今後、UIを持つ機能（Quick Capture系）を変更する際は、
  実機ブラウザ確認を標準工程として明示的にDoDへ組み込むことを
  提案する。
- ADR 0071で明らかにした通り、「PC-off対応」を完全に実現するには
  Constitution/Principlesレベルの合意が必要になりうる案（案A）を
  含む——これは技術的な実装力の問題ではなく、Owner自身がどこまで
  個人データのcloud常駐を許容するかという価値判断の問題である。
  次にこの話題が出た際は、実装提案より先にOwnerの価値判断を
  確認することを推奨する。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

Version38で「クラウド側に何もUIがない」という非対称性を放置した
まま完了報告としなかったことが、ARCからの的確な指摘につながった。
今回はその指摘に対して、実装だけでなく「本当にPC-off対応と
呼べるのか」を正直に分解して記録する（ADR 0070）ことを優先した。
機能を作ることと、その機能が実際に何を達成し何を達成していないかを
正確に言語化することの両方が、Ownerとの信頼関係にとって同じくらい
重要だと考える。

## 12. ARCへの引き継ぎ（Owner追加指示、2026年7月）

- **新しい資産**：`https://<デプロイ後のURL>/`をスマホのブラウザで
  開けば、実デプロイ後すぐにQuick Capture UIが使える状態になった
  （Miniflareで実機検証済み）。ADR 0071の3案比較表——将来ARCが
  「cloudに全部移そう」と提案する場面があれば、まずこの表を
  参照してほしい。
- **新しいルール**：UIを持つ機能の実機確認は、HTTPレベルの
  `fetch()`テストだけでなく、必ず実際のブラウザ操作
  （クリック・フォーム送信）を経由すること——今回発見した2件の
  バグは、いずれもHTTPレベルのテストでは検出不可能だった。
- **新しい思想**：「対応完了」と言えるかどうかを、機能の有無では
  なく段階（Capability/Gap表）で判断する姿勢は、Constitution第2条
  「Systemは判断しない」の精神とも通じる——Systemが「完了した」と
  自己申告するのではなく、事実を分解して提示し、判断（対応完了と
  みなすかどうか）はOwner/ARCに委ねる。
- **Ownerについて分かったこと**：Version38完了報告に対してARCから
  「クラウド待機キューまでで、PC-off対応完了とは言えない」という
  具体的な指摘が返ってきたことは、Owner/ARC側が実装の細部まで
  正確に検証していることを示している——曖昧な完了宣言は通用しない
  という前提で、今後も正確な言語化を優先する必要がある。

## 13. Product Review（Owner追加指示、2026年7月）

- **ユーザー体験で改善されたこと**：まだ実デプロイしていないため
  Owner自身の体験としては変化なし。ただし、デプロイさえすれば
  スマホのブラウザだけでQuick Captureが使える状態に到達した
  （Version38時点ではcloud側にUIがなかった）。
- **毎日使う理由**：変化なし（デプロイ後の話）。
- **懸念**：「PC-off対応」という言葉が独り歩きしやすいテーマである
  ことが今回改めて分かった——ADR 0070のCapability/Gap表のような
  正確な分解を、Owner向けの説明でも常に併記する必要がある。
- **次Versionで最も価値が高い改善**：Owner確認後の実デプロイと、
  実際のスマホからのQuick Capture初回送信の実地確認。

## 14. 10年後のProject ARCへの貢献（Owner追加指示、2026年7月、Version9より）

「機能が存在する」ことと「要件を満たしている」ことを区別し、
後者を段階分解して正直に記録するという手法（ADR 0070の
Capability/Gap表）は、10年後もProject ARCが複雑化し続ける中で
繰り返し必要になるパターンだと考える。特に「クラウドとローカルの
どちらが真実か」という問いは、Program Bに限らず今後あらゆる
外部連携機能で再発する構造的な問いであり、ADR 0071の6軸比較
（個人情報露出・バックアップ・削除・費用・portability・Remote MCP
統合）はそのテンプレートとして再利用できる。

「人生OS」というVisionから逆算すると、今Versionは「見た目の機能を
増やす」よりも「今どこまで達成できていて、何が未達なのかを正確に
言い続ける」という、長期的信頼の基盤となる石だった。10年間使われる
システムほど、誇張された完了宣言の積み重ねが後から取り返しの
つかない信頼の毀損につながる——今回のARCの指摘とそれへの対応は、
その意味で技術的な成果以上の価値を持つと考える。
