# Project ARC Development Governance

Claude Code、Codex、その他実装Agentの共通規約。Constitution / Principlesを上書きしない。

## 情報源の優先順位

1. Constitution / Principles
2. Ownerの明示指示・承認
3. Accepted ADR
4. PM Status / Open Issues
5. Roadmap
6. Version Brief / Handoff
7. Report / Developer Feedback / History

## Version開始ゲート

- PM Status、Open Issues、Roadmap、最新Feedback、git statusを読む
- 未コミット差分を上書きしない
- 目的、非目的、受入条件、依存、Owner専権事項をBriefへ固定
- 不可逆な未決設計は実装前にADR化
- P0があれば新機能より優先

## 実装中ルール

- Domain → Application → Adapter / Infrastructureの依存方向を守る
- API / MCP / CLI / persistence変更時は全影響面を列挙する
- 生活データの削除・変換はbackupとrestore検証なしに行わない
- 未実行検証を成功と書かない
- 費用、秘密情報、本番、外部公開、不可逆操作、Constitution / PrinciplesはOwner承認
- それ以外の通常設計・テスト・文書更新は承認待ちで止めない

## ADR必須条件

public API、永続形式、認証、権限、保持、層境界の変更、複数Versionに影響する技術選択、Accepted ADRの撤回、コードだけで理由を復元できない判断。局所bug fixや既決定内の可逆refactorは不要理由をFeedbackへ記録する。

StatusはProposed / Accepted / Rejected / Superseded / Deprecated。矛盾したAcceptedを放置しない。

## Version終了チェックリスト

- [ ] 受入条件と対象testが合格
- [ ] typecheck / lint / test / buildがclean環境で合格
- [ ] security / migration / rollback / operationを確認
- [ ] ADR、Report、Developer Feedbackを作成・更新
- [ ] Roadmap、PM Status、Open Issues、Handoff pointerを更新
- [ ] Owner確認事項と通常Issueを分離
- [ ] commit hash / tagをReportとFeedbackへ記録
- [ ] AgentMessageは要約、repository文書を正本とする

未完了が1つでもあればCompleteではなくRCまたはBlockedとする。

## 文書の責務

- Report: 完成機能・利用・契約・検証の客観記録
- Developer Feedback: 判断・理由・副作用・失敗・注意点
- Handoff: 次の作業開始に必要な短い指示
- PM Status: 現在の真実だけ

同じ長文を複製せず相互linkする。Issue IDは`ARC-PM-NNN`または`ARC-NNN`とし、Priority、状態、Owner、受入条件、Version/ADRを持つ。DoDをIssue台帳にしない。
