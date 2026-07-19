# Remote MCP OAuth 本番有効化チェックリスト（Version30改訂）

Remote MCPのOAuth 2.1認証（`LocalOAuthProvider`、Version22・ADR 0049）
は設計・実装・テストが完了しており、**コードとしては本番投入可能な
状態**である。残っているのは、Owner自身の手作業（`.env`編集・
プロセス再起動・ChatGPT Connector再設定）のみ。

Version24（ADR 0051）はこの作業を「実施した」と記録していたが、
Version25〜29のReportは一貫して「未完了」としており、Version30の
監査で**ADR 0051の記録が誤りだった**と判明した（詳細：ADR 0051
「訂正」節、`docs/security/remote-mcp-threat-model.md`6章）。
Version24からVersion29まで、この最後の一手が5Version続けて
持ち越されている。今回は上から順に実行すれば1回で完了する形に
まとめ直した。

## 実行前に知っておくこと（1分）

- **何が変わるか**：`/mcp`エンドポイントが、今の「誰でもアクセス
  可能」から「Owner本人のPasscodeで認可したChatGPTセッションのみ
  アクセス可能」に変わる。
- **何が変わらないか**：Proposal承認フロー（`do`）、Write Proposal
  Layer、既存のconstitution・governanceは無変更。
- **失敗しても安全か**：Yes。問題が起きたら「ロールバック手順」
  （本文書末尾）で30秒以内に今の無認証状態へ戻せる。データの
  巻き戻しは一切不要（トークンはインメモリのみのため）。
- **所要時間の目安**：10〜15分（うちChatGPT側の再設定が5分程度）。

## チェックリスト

- [ ] **1. Passcodeを決める**：Owner本人だけが知る、16文字以上の
      ランダムな文字列（パスワードマネージャーで生成推奨）。他の
      パスワードと使い回さない。`.env`に平文で保存される。

- [ ] **2. `.env`に2行追記する**：
      ```
      MCP_OAUTH_ENABLED=true
      MCP_OAUTH_OWNER_PASSCODE=<手順1で決めた文字列>
      ```

- [ ] **3. 既存プロセスを再起動する**：
      ```powershell
      scripts\stop-all.ps1
      scripts\start-all.ps1
      ```
      起動ログに`OAuth 2.1試作が有効`と表示されれば成功（`NO AUTH`
      と表示された場合は`.env`が反映されていない——手順2を再確認）。

- [ ] **4. ローカルで無認証アクセスが拒否されることを確認する**：
      Git Bashの`curl`は日本語混在時に文字化けする既知の制約が
      あるため（`CLAUDE.md`既存方針）、`curl`ではなく以下を使う。
      ```
      node -e "fetch('http://127.0.0.1:3940/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>console.log(r.status))"
      ```
      `401`が出力されればOK（`sed -n '55-62p' src/infrastructure/
      mcp/remoteServer.oauth.test.ts`と同じ検証を手動でなぞっている）。

- [ ] **5. ChatGPT Developer Mode側でConnectorを作り直す**：認証方式を
      「認証なし」ではなく**「OAuth」**に設定し、Remote MCPのURL
      （`<トンネルURL>/mcp`）を入力する。既存の「認証なし」接続とは
      別設定になる——古い接続は削除してよい。

- [ ] **6. ChatGPTがDynamic Client Registrationと認可フローを自動実行
      する**：ブラウザがPasscode入力画面にリダイレクトされたら、
      Owner本人がPasscodeを入力して「許可する」を押す。

- [ ] **7. 接続確認**：ChatGPT側で`read_reflection`等を1回呼び出し、
      正常応答することを確認する。

- [ ] **8. 完了を記録する**：`docs/project-management/STATUS.md`の
      ARC-PM-001を「解決済み」に更新し、実施日をここに追記する。

## うまくいかないときは

| 症状 | 対処 |
|---|---|
| 手順3のログに`NO AUTH`と出る | `.env`の2行が保存されているか、`scripts\start-all.ps1`が正しい`.env`を読んでいるかを確認。プロセスを完全に止めてから起動し直す |
| 手順6でPasscode入力後も401が続く | Passcodeの前後に余分な空白が入っていないか`.env`を確認。誤入力は10分あたり10回でレート制限がかかる（Version30で追加、`docs/security/remote-mcp-threat-model.md`6.3参照）——待ってから再試行 |
| ChatGPT側で「Connector作成エラー」 | 認証方式が「OAuth」になっているか再確認。「認証なし」のままだとADR 0044と同じ理由（Authorizationヘッダーを送らない）で接続できない |
| どうしても解決しない | 下記ロールバック手順で無認証運用に戻し、落ち着いてから再挑戦する。焦って本番中に何度もリトライしない |

## ロールバック手順

問題が起きた場合、`.env`から`MCP_OAUTH_ENABLED=true`の行を削除
（またはfalseに変更）し、`scripts\stop-all.ps1`→
`scripts\start-all.ps1`で再起動すれば、ADR 0044のまま「認証なし」の
既存挙動に即座に戻る——`LocalOAuthProvider`はインメモリのみで
永続状態を持たないため、データの巻き戻し等は一切不要。ChatGPT側の
Connectorは「認証なし」で作り直すこと（`docs/setup/
chatgpt-mcp-connection.md`参照）。

## 既知の制約（実施前に把握しておくこと）

- **永続化なし**：プロセス再起動（PC再起動・`pnpm run mcp:remote`の
  クラッシュ等）のたびに、登録済みClient・発行済みTokenが全て失効
  する。ChatGPT側は自動的に`/register`からやり直すため、Owner側の
  作業は「Passcode再入力」の1回のみで済む想定だが、実運用での確認は
  まだない。
- **Passcodeの強度・使い回しは完全にOwnerの運用に依存**する。
  `/authorize/confirm`のレート制限（Version30で追加、15分あたり
  10回）は多層防御であり、Passcode自体の強度に代わるものではない。
- 真の「Level2迂回不能性」の保証ではない（`docs/authority-table.md`
  「既知の限界」参照）——Passcodeを知る第三者は依然として接続できる。
  この移行は「無認証」から「Passcode認証」への強化であり、完全な
  解決ではない。
