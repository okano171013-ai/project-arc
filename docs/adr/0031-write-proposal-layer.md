# ADR 0031: Write Proposal Layerを追加した理由

## ステータス

承認済み

## 関連Principle

- Constitution第2条（Systemは判断しない）
- Constitution第4条（Ownerが最終決定する）
- `docs/ai-roles.md`（ARCは提案のみ、実行権限を持たない）
- ADR 0030（ReadGatewayとWriteProposalGatewayの分離）

## コンテキスト

Version14のOwner指示書は当初、「ARCが直接Project ARCへPOSTする」
という設計を提示していたが、指示書冒頭でOwner自身がこれを撤回し、
代わりに

```
ARC → Write Proposal → Owner承認 → Project ARC
```

という中間層を挟む方針へ修正した。理由はOwnerの言葉で「Project ARC
のConstitution（Systemは判断しない）をさらに厳密に守るなら、ARCに
直接書き込み権限を与えるべきではない」と説明されている。この方針
転換の経緯と、それをどう実装に落としたかを記録する。

## 決定

`WriteProposalGatewayUseCase`は次の3メソッドのみを提供する。

- `createProposal()`：Proposal（Value Object、ADR未記載だが
  `src/domain/value-objects/Proposal.ts`参照）を組み立てて返す。
  **Repositoryへは一切書き込まない。**
- `approveProposal(proposal)`：呼び出し側（Owner操作のCLI/API）から
  Proposal全体を再送されたときのみ、対応する既存UseCase
  （`RecordDailyReflectionUseCase`等）を1回呼び出す。
- `rejectProposal(proposal)`：何も永続化せず、却下された事実のみを
  返す。

ProposalそのものはRepositoryを持たず、Systemはどのタイミングでも
「未承認のProposalの一覧」を保持しない。Approveを行うには、
`createProposal()`が返した値をそのまま`approveProposal()`へ
渡す（ステートレスなラウンドトリップ）以外の手段がない。

## 根拠

- **「保存しない」という制約こそがConstitution第2条を実装で
  体現する**：もしSystemがProposalを保存し、一覧管理し、Approve APIが
  「IDを指定して承認」という形になっていたら、Systemは「未処理の
  提案が存在する」という状態を持つことになる。これは些細な違いに
  見えて、「Systemが判断待ちの何かを管理している」という設計であり、
  将来「一定時間経過したら自動承認する」のような機能が足されやすい
  土壌になる（指示書18章が明示的に禁止する「自動Approve」への
  地続きの入口を作ってしまう）。Proposalを保存しない設計は、
  そのような機能追加を構造的に難しくする。
- **Ownerの再送が承認の証**：`approveProposal()`がProposal全体の
  再送を要求する設計は、「Ownerが提案の中身を見て、それを
  そのまま実行してよいと判断した」という行為を、Repository層の
  状態ではなくAPI呼び出しの形そのもので表現する。これは
  Constitution第4条（Ownerが最終決定する）を、UIの合意ではなく
  アーキテクチャのレベルで担保する設計判断である。
- **既存UseCaseへの委譲は新しい判断ロジックを持たない**：
  `approveProposal()`はpayloadの構造検証（zodスキーマ、必須
  フィールドの有無）のみを行い、「この提案の中身が正しいか・
  優先すべきか」は一切判定しない。実際の書き込みロジック
  （例：Reflectionの日付重複チェック）は既存の
  `RecordDailyReflectionUseCase`等にすべて委ねる——これは
  ConversationGatewayUseCase（ADR 0026・0028）が確立した
  「Tool Selectionパターン」の書き込み版である。

## 影響

- HTTP APIは`POST /proposal/create`→`POST /proposal/approve`|
  `POST /proposal/reject`という2ステップのフローになる。1ステップの
  「即書き込み」APIとは異なり、クライアント（CLI/将来のARC接続）は
  必ずProposalオブジェクト全体を保持・再送する実装が必要になる。
- 将来MCP・ChatGPT Actions経由でARCが直接この層を呼び出す場合も、
  `createProposal`の戻り値をOwnerに提示し、Ownerの明示的な承認
  操作（UIのボタン等）を経てから`approveProposal`を呼ぶ、という
  Owner確認のステップを設計に組み込まざるを得ない——この制約は
  UseCaseのインターフェース自体が強制する。
