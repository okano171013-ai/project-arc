# Remote MCP OAuth 2.1 移行手順（Version22、未実施）

`MCP_OAUTH_ENABLED`をローカル・自動テストの範囲で試作した
（ADR 0049）。**この手順はまだ実施していない**——本番の
`pnpm run mcp:remote`・ngrok/Cloudflareトンネル・`.env`は無変更の
ままである。実施するかどうかはOwnerの判断（`docs/reports/
Version22_ARC_Feedback.md`末尾の「次にOwnerが承認すべき事項」参照）。

## 前提

- `docs/security/remote-mcp-threat-model.md`・ADR 0049を読み、現状の
  無認証運用のリスクと、この移行が閉じるギャップを理解していること。
- ChatGPT Developer Mode側のConnector設定を、認証方式「OAuth」で
  再作成する必要がある（既存の「認証なし」接続とは別設定になる）。

## 手順

1. **Passcodeを決める**：Owner本人だけが知る、十分に長い文字列
   （最低16文字以上を推奨）。このPasscodeは`.env`に平文で保存される
   ため、他のパスワードと使い回さないこと。
2. **`.env`に追記**：
   ```
   MCP_OAUTH_ENABLED=true
   MCP_OAUTH_OWNER_PASSCODE=<決めたPasscode>
   ```
3. **既存プロセスを再起動**：`scripts/stop-all.ps1`→
   `scripts/start-all.ps1`（`pnpm run mcp:remote`が新しい設定で
   立ち上がる）。
4. **ローカルで動作確認**：`docs/security/remote-mcp-threat-model.md`
   の脅威モデルが閉じたことを、`curl`ではなく`node -e fetch`
   （Git Bash文字コード問題を避けるCLAUDE.mdの既存方針）で確認する
   ——`Authorization`ヘッダーなしで`/mcp`が401になることを確認する。
5. **ChatGPT Developer Mode側でConnectorを再作成**：認証方式を
   「OAuth」に設定し、Remote MCPのURL（`<トンネルURL>/mcp`）を入力する。
   ChatGPTが自動的にDynamic Client Registration（`/register`）を
   叩き、続けて`/authorize`へブラウザリダイレクトする。
6. **Passcode入力画面が表示されたら、Owner本人がPasscodeを入力する**。
   以後はChatGPT側がaccess token/refresh tokenを保持し、再入力は
   トークン失効時（1時間ごとのaccess token更新はrefresh tokenで自動、
   30日でrefresh token自体が失効）のみ必要になる想定。
7. **接続確認**：ChatGPT側で`read_reflection`等を1回呼び出し、
   正常応答することを確認する。

## ロールバック手順

問題が起きた場合、`.env`から`MCP_OAUTH_ENABLED=true`の行を削除
（またはfalseに変更）し、`scripts/stop-all.ps1`→
`scripts/start-all.ps1`で再起動すれば、ADR 0044のまま「認証なし」の
既存挙動に即座に戻る——`LocalOAuthProvider`はインメモリのみで
永続状態を持たないため、データの巻き戻し等は一切不要。

## 既知の制約（本番移行前に把握しておくこと）

- **永続化なし**：プロセス再起動（PC再起動・`pnpm run mcp:remote`の
  クラッシュ等）のたびに、登録済みClient・発行済みTokenが全て失効
  する。ChatGPT側は自動的に`/register`からやり直すため、Owner側の
  作業は「Passcode再入力」の1回のみで済む想定だが、実運用で確認が
  必要。
- **Passcodeの強度・使い回しは完全にOwnerの運用に依存**する
  ——`LocalOAuthProvider`自体はレート制限・アカウントロックアウト等の
  総当たり対策を実装していない（SDKの`authorizationHandler`が
  IPベースのレート制限をデフォルトで適用する、ADR 0049参照）。
- 真の「Level2迂回不能性」の保証ではない（`docs/authority-table.md`
  「既知の限界」参照）——Passcodeを知る第三者は依然として接続できる。
  この移行は「無認証」から「Passcode認証」への強化であり、完全な
  解決ではない。
