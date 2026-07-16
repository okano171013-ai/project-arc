# Version23 Report: Life Log Auto-Save Delegation（設計・次Version計画）

**コミットハッシュ**：`73c493a`（`feature/v4-v6-smart-capture`ブランチ）

`docs/reports/TEMPLATE.md`の14章構成に準拠。**本Versionはコード実装を
含まない設計・次Version計画の提示のみ**——Owner決定（AgentMessage
`f81e9141-...`）自身が「次Version実装計画を提示してください」と
明示的に求めたため（`docs/proposals/life-log-auto-save-delegation.md`
参照）。

## 1. Version概要

**テーマ**：Life Log Auto-Save Delegation。Owner本人が発信した
AgentMessage（id `f81e9141-...`、2026-07-16T00:18:52.837Z、tags:
`owner-decision`, `auto-save`, `life-log`, `delegated-authority`）が、
Owner本人がChatGPT上で明示的に入力・送信した通常の生活記録（食事・
栄養・睡眠・体重・運動・勉強・授業・支出/収入・日次振り返り・
挑戦行動）について、記録ごとのOwner`do`を不要とする自動保存を許可した。
このメッセージはVersion22の作業中（2026-07-16T00:18）に届いていたが、
Version22完了報告（2026-07-16T01:34）を送信するまで気づいておらず、
今回の`agent_message_list`確認で発見した。

Owner決定は「Version22の権限委譲設計に、このOwner決定を限定scopeの
委譲ユースケースとして反映」「Constitution整合に変更が必要なら
必要最小限の変更案と影響を提示（実装はせず既存のLevel2手続に従う）」
「生活記録用Entity／Write UseCase／MCP Toolが未整備なら、既存モデルと
の重複を調査し、最小縦切りの次Version実装計画を提示」することを
求めた。

## 2. 今回実装した機能（理由も含めて説明）

コード実装はなし。以下のドキュメントを作成した。

- **`docs/proposals/life-log-auto-save-delegation.md`**：Owner決定の
  要約、Level1委譲（Version22、未決定）との違いの整理、既存データ
  モデルとの重複調査、Constitution整合性の結論（改定不要と判断、
  根拠付き）、`LifeLogAutoSaveGrant`の技術設計、Phase1/2に分けた
  次Version実装計画、Owner確認事項3点。
- **ADR 0050**（提案中ステータス）：Constitution改定不要という結論の
  根拠を記録。Owner・ARC確認後に「承認済み」へ更新する前提。
- 既存の`docs/proposals/level1-arc-approval-delegation.md`に、今回の
  Owner決定が別種の委譲であることを明記する相互参照を追加。

## 3. 実装しなかった機能（延期理由も記載）

Owner決定・指示書が明示的に「次Version実装計画を提示」を求めていた
ため、以下は全て次Version（Version24想定）に計画として残した——
今回意図的に実装していない。

- `LifeLogAutoSaveGrant` Entity・Repository・UseCase
- `Reflection`/`ChallengeLog`のProposalType/MCP Tool配線拡張
- 自動保存の一時停止/再開/取消しMCP Tool
- 推定値の`estimated`/`estimationBasis`/`confidence`フィールド追加
- Phase 2（食事・栄養・体重・収入の新フィールド、記録粒度は
  Owner確認待ち）

## 4. Architecture Review

新規ドキュメントのみ（コード変更なし）。`src/`配下は無変更。

## 5. ADR（追加・変更したADR、追加しなかった理由）

- **ADR 0050**（新規、ステータス「提案中」）：Constitution整合性の
  結論を記録。Owner・ARCの確認が取れるまで「承認済み」へは更新しない
  ——この点が過去のADRと異なる扱いであることに注意。

## 6. テスト（件数、カバレッジ、typecheck、lint、実機確認）

コード変更がないため、`pnpm test`/`typecheck`/`lint`は前Version
（Version22、294件全緑）から変化なし。実行して変化がないことのみ
確認した。

## 7. 修正したバグ（検出方法、原因、対応方法、再発防止）

なし（コード変更なしのため）。ただし調査の副産物として、`StudyLog`
Entity（Version1で先行定義されたが、Repository・UseCase・Routeが
一切配線されていない、実質使われていない技術的負債）を発見した。
今回のOwner決定の対象外のため対応はせず、記録に留めた（3章参照）。

## 8. 技術的負債（今後改善したい点）

- `StudyLog`の配線または廃止の判断（上記）
- `Reflection.expenseYen`が支出のみで収入フィールドを持たない
  （Phase 2で解消予定）
- `Reflection.didMartialArts`が運動の詳細（種目・時間）を持たない
  粗いbooleanのみ（Phase 2以降で見直しの余地）

## 9. 次Versionへの申し送り（技術的観点から推奨する事項）

- `docs/proposals/life-log-auto-save-delegation.md`6章の3つの確認
  事項（Constitution整合性の結論への同意、Phase範囲、記録粒度）への
  回答を得てから、Phase 1（`LifeLogAutoSaveGrant`最小実装+
  `ChallengeLog`のProposalType配線）に着手する。
- 今回発見した「Owner決定に気づくのが1時間以上遅れた」という事実
  （10章参照）への対応も、次回セッション開始時のチェック手順の
  見直しとして検討したい。

## 10. POへの提案（提案・懸念点・改善案を自由に記載）

**重要な運用上の懸念**：今回、Owner決定（AgentMessage）はVersion22の
作業中に届いていたが、Version22完了報告を送信するまで
（約1時間強）気づかなかった。これはVersion22セッションの開始時点
（`agent_message_list`確認）以降、作業中に新着を再確認していなかった
ためである。CLAUDE.mdのセッション開始チェックリストは「セッション
開始時」の確認のみを求めており、長時間の作業セッション中の再確認は
明文化されていない。今回はたまたま完了報告の直前に気づけたが、より
長い作業や、完了報告を送らないまま終わるセッションでは、Owner決定に
気づかないまま進んでしまうリスクがある。Collaboration Runner
（Version20、ADR 0046）が15分間隔で新着を検知する仕組みを既に持って
いるため、これをより積極的に活用する運用（例：長時間作業の区切りで
`agent_message_list`を再確認する）を次回以降の運用ルールとして
検討したい。

## 11. CEOへのコメント（今回の成果、次Versionへの期待）

今回最も重要だったのは、コードを1行も書かなかったことではなく、
「Owner決定＝Level1委譲の一種」という表面的な理解に飛びつかず、
両者が実は別種の委譲（決定権限の委譲か、決定の実行手段の効率化か）
であることを整理し直せたことだと考える。Version21・22で確立した
「実装前にgovernanceの緊張点を言語化する」というパターンが、今回は
「他の提案との混同を避ける」という新しい形で機能した。

## 12. ARCへの引き継ぎ

**新しい資産**：`docs/proposals/life-log-auto-save-delegation.md`
（Owner決定の技術的な落とし込み）、ADR 0050（Constitution整合性の
結論、確認待ち）。

**新しいルール**：「委譲」という言葉が使われていても、それが
「決定権限そのものの委譲」なのか「Owner自身が既に下した決定の実行
手段の効率化」なのかを区別する、という判断パターンを確立した。前者は
Constitution第4条の改定を要する重い判断、後者はOwner決定自体が
既に第4条を満たしている軽い技術設計、という違いがある。

**新しい思想**：Version21で確立した「効率化の要求と決定権限の所在は
別の軸」という整理が、今回さらに precise になった——「誰が決めるか」
と「決めたことをどう実行するか」も別の軸である。

**Ownerについて分かったこと**：今回、Owner自身がAgentMessageを直接
発信した（ARC経由ではなく）。これはVersion17〜22でARCが担ってきた
「指示書の起案」役を、今回は限定的にOwner自身が担った初めての事例
——Owner自身も必要に応じてRemote MCPを直接操作することがある、という
運用実態が確認できた。

## 13. Product Review

**ユーザー体験で改善されたこと**：なし（設計のみ、コード変更なし）。

**毎日使う理由**：変化なし。ただし本Versionが計画する次Versionの
実装が完了すれば、ChatGPTで日々の生活記録を話すだけでProject ARCへ
自動的に保存されるようになり、Morning Brief/Reflectionへ入力する
手間が大きく減る可能性がある——Product視点では次Versionこそが本命。

**懸念**：自動保存が実装された後、「本当に自分が言ったことだけが
保存されているか」への信頼をOwnerがどう持てるかが鍵になる。監査ログ
（`ApprovalDecision`拡張）だけで十分か、保存直後の確認UI/通知が
必要かは、Phase 1実装時に検討すべき。

**次Versionで最も価値が高い改善**：Phase 1（`Reflection`拡張なし・
`ChallengeLog`配線のみ）の実装そのもの。範囲を絞ることで、Owner確認
（6章）から実装まで最短で到達できる。

## 14. 10年後のProject ARCへの貢献

「AIに何を任せてよいか」を、抽象的な信頼度ではなく「Ownerが今この
瞬間に何を明示的に言ったか」という具体的な事実の有無で線引きする
という設計思想（4章の`推測・補完した事実を確定記録として自動保存
しない`という制約）は、今後Project ARCがどれだけ多くの入力チャネル
（音声、他のAI、将来のセンサー連携等）を持つようになっても、
「事実」と「解釈」を分離し続けるための一貫した基準になりうる。

10年後、Project ARCが本当に「唯一の人生データベース」として機能する
なら、そのデータベースに何が書き込まれるかの境界線は、今回引いた
「Owner本人が明示的に言ったことだけ」という線がずっと守られている
必要がある。今回は実装せずドキュメントとADRだけで終えたが、この
境界線を言語化できたこと自体が、次の10年分の自動化の土台になると
考える。
