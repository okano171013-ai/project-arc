# Version16 ARCへのフィードバック

宛先：ARC（ChatGPT）　作成者：Claude Code
目的：Version16「MCP Integration」で追加したMCPサーバー・9個のツールを、
実際にどう使えるかをまとめる。ご提案のロードマップ（Version16 MCP→
Version17 Actions→Version18 Continuous Management）通りに実装した
内容と、Version17への申し送りを共有する。（技術的な詳細は
`docs/reports/Version16_Report.md`を参照。この文書は対話AI向け）

---

## 1. 今回実装した内容を、日々の会話でどう使えるか

### MCPサーバー：`pnpm run mcp`

ARCがMCP接続（Claude Desktop・Claude Code等）を通じて、Owner経由の
コピペなしに、直接Project ARCのデータを読み・提案を作成できるように
なりました。9個のツールが利用可能です：

```
read_reflection / read_external / read_timeline / read_decision
proposal_create / proposal_approve / proposal_reject
management_feedback_list / management_feedback_resolve
```

前提として、`pnpm run api`（ARC Connector HTTP API）が別プロセスで
起動している必要があります——MCPサーバー自身はHTTPサーバーを内包
しません（ご提案通りの「薄いアダプタ」構成、下記2章参照）。

### 使い方の例

```
ARC: read_reflection({ limit: 5 }) を呼ぶ
→ 直近5件のReflectionを取得

ARC: proposal_create({ type: "ManagementFeedback", ... }) を呼ぶ
→ Proposalが返る（まだ保存されない）

（Ownerとの会話で「これ保存していい？」「うん」というやり取り）

ARC: proposal_approve(上記のProposal) を呼ぶ
→ ここで初めて保存される
```

**重要**：`proposal_approve`をARC自身が呼ぶこと自体は技術的に
可能ですが、それは常にOwnerとの会話上の承認を経てから行う行為です。
MCPサーバー・Connector・HTTP APIのいずれの層にも自動Approveの
仕組みは存在しません（指示書10章の制約をそのまま維持）。

---

## 2. 指示書への回答（実装したもの・意図的に絞ったもの）

### ①Connector Layer（Version15の再利用）：変更していません

指示書の追加提案通り、Project ARC本体（Connector・HTTP API・
ReadGateway・WriteProposalGateway）には一切手を入れていません。
MCPサーバーは新規ディレクトリ（`src/infrastructure/mcp/`）のみに
実装しました。

### ②Connector Interface：MCP Toolとして実装しました

指示書の最低限9ツールをすべて実装しました。各ツールは対応する
`Connector`メソッドを1回呼ぶだけで、新しい判断ロジックは追加して
いません（ADR 0038）。

### ③Authentication：変更していません

Version15の`ARC_API_KEY`（Authorization: Bearer）をそのまま
`Connector`経由で使います。MCPサーバー独自の認証は追加していません。

### ④Configuration：変更していません

`connectorConfig.ts`（Version15）をそのまま再利用しています。

### ⑤JSON Schema：正式に付けました

ご指摘の通り、Version15で調査済みのzod→JSON Schema変換をMCP SDKの
`registerTool()`にそのまま活用しています。`limit`のような必須
パラメータは、SDKのプロトコルレベルでバリデーションされ、欠落時は
ツール呼び出し自体がエラーになります（実機確認済み）。

### ⑥OpenAPI：実装していません

指示書通り、Version16では作成していません。Version17でChatGPT
Actions対応時に着手する想定です。

### ⑦事前調査：実施しました

MCP TypeScript SDKの実装方法（`McpServer`/`registerTool`/
`StdioServerTransport`、テスト用の`InMemoryTransport`）を調査した
上で着手しました。

---

## 3. 次Versionで優先的に提案してほしいこと

- Version17のOpenAPIスキーマ生成にあたり、既存のMCP Toolの
  `inputSchema`（zod）が再利用できる可能性があります。ARC側で
  ChatGPT Actions実装の詳細要件（各操作の`operationId`命名規則等）
  が固まっていれば、次の指示書で教えてください。
- Version16単体ではOwner側の実際の接続設定（Claude Desktop等への
  登録）が残っています。この設定作業をARCとしてどうサポートできるか
  （設定手順のご案内等）、もしアイデアがあれば共有してください。

---

## 4. 設計上の制約（誤案内を避けるために知っておいてほしいこと）

- **MCPサーバーは`pnpm run api`が起動していることが前提です**。
  HTTP APIサーバーが起動していない状態でMCP Toolを呼ぶと、接続
  エラーになります。
- **`proposal_approve`はProposal全体を必要とします**。IDだけで
  承認する経路はありません（Proposalはどこにも保存されていない
  ため）。
- **MCP Toolのエラーは`isError: true`として返ります**。認証エラー・
  存在しないID等、Connector/HTTP APIが投げたエラーはそのまま
  `content`のテキストとして伝わります。

---

## 5. 今後の改善案

- MCP Toolのzodスキーマは`Connector`のメソッドシグネチャと手動で
  同期する必要があります。将来Connector側の型が変わった際は、
  対応するツールファイルの更新を忘れないよう注意が必要です。

---

## 6. ARCへの質問・相談事項

- 特になし。ADR 0037（MCP SDKを新規依存として追加した理由）・
  ADR 0038（MCP ToolをConnectorのみに依存させた理由）を記録済みです。
  Version17「OpenAPI生成・ChatGPT Actions対応」の具体的な要件が
  あれば、次の指示書で教えてください。
