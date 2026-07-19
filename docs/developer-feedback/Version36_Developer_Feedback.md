# Developer Feedback — Version36

## メタデータ

- Version / 日付: Version36 / 2026-07-19
- 担当エンジン: Claude Code
- Git commit / tag: `45bcba9`
- 対応Issue / 関連Report: Mobile Ingressローカルモデルの完成度向上 / `docs/reports/Version36_Report.md`
- 状態: Complete（ローカル安全範囲。LAN公開の有効化はOwner確認待ち）

## 1. 目的

Version35で「受け皿は完成したが送る側がない」「手動syncのみ」と
明記した2つの空白を埋め、Owner指示（「同じ条件でVersion36の
ローカルMVP完成まで進めてよい」）に従ってローカルMVPの完成度を
上げる。

## 2. 実装

- 追加：Quick Capture HTML UI（`GET /`、`mobileIngress.ts`）
- 追加：`MOBILE_INGRESS_HOST`/`MOBILE_INGRESS_PORT`のzodスキーマ化
  （`env.ts`、既定`127.0.0.1`/`3941`、opt-in設計）
- 追加：`scripts/start-all.ps1`・`stop-all.ps1`・
  `register-scheduled-tasks.ps1`へMobile Ingress起動・定期sync
  （`ProjectARC-MobileSync`、15分間隔）を追加
- Before：Mobile Ingressへの送信は`curl`等の手動POSTのみ、local
  反映は手動`pnpm mobile-sync`実行のみだった。
- After：ブラウザから開けるフォームで送信でき（現状PCのブラウザ
  限定）、PC起動中は15分毎に自動でCanonicalizeされる。

## 3. 設計判断

- **採用案**：スマホからの実送信に必要なLAN公開は、環境変数
  `MOBILE_INGRESS_HOST`のopt-in（既定値変更なし）として実装のみ
  済ませ、有効化はOwner確認事項とした。理由：認証なしのままLAN内の
  任意デバイスから到達可能になる変更であり、Claude Codeが自律的に
  判断してよい「無料・可逆・ローカル」の範囲を超えると判断した
  （外部公開範囲の拡大に近い性質を持つため）。
- **採用案**：Quick Capture UIは既存`POST /ingress`を呼ぶだけの
  薄いクライアントとし、新しい書き込み経路・権限境界は追加しない。
- **見送り案**：ネイティブモバイルアプリやPWA化は検討したが、
  「完全ローカルMVP」というVersion35〜36のスコープに対して過剰な
  実装のため見送った（YAGNI）。

## 4. 理由

Domain/Application層への変更がないため新規ADRは不要と判断した
（ADR 0064・0065の設計方針の範囲内）。`MOBILE_INGRESS_HOST`を
opt-in・既定閉じた状態にする設計判断は、既存の`ARC_API_KEY`
（Version15）・`MCP_OAUTH_ENABLED`（Version22）と全く同じ規約の
再適用であり、新しい設計判断とまでは言えないため、こちらも新規ADR
は追加しなかった。

## 5. 副作用

- 互換性：既存の`POST /ingress`・`GET /ingress`のレスポンス形式は
  無変更。`GET /`は新規ルートのため既存クライアントへの影響なし。
- セキュリティ：既定値（`127.0.0.1`）を変更しない限り、Version35
  時点の脅威モデル（8章）から一切変化しない（脅威モデル9章で
  確認済み）。Owner自身が`MOBILE_INGRESS_HOST`を変更した場合のみ
  LAN内の他デバイスから到達可能になる。
- 運用：`start-all.ps1`・`register-scheduled-tasks.ps1`の変更は
  Windows機での実行が前提のため、Owner自身が再実行するまで新しい
  自動化（Mobile Ingress自動起動・定期sync）は有効にならない
  （既存サービスの動作には影響しない）。

## 6. テスト

- 実行コマンド：`pnpm typecheck && pnpm lint && pnpm test`
- 結果：**603件合格（603件中603件、失敗・skip・pendingなし）**
  （Version35時点602件 + 1件新規）
- 実機確認：グローバルインストール済みPlaywright（プロジェクト依存
  には追加せず）でヘッドレスブラウザから実際にQuick Capture
  フォームを送信し、`GET /ingress`での反映を確認。検証用スクリプト・
  データは確認後に削除済み。
- PowerShellスクリプトの変更はLinux環境で実行確認不能——Version20・
  26と同じ既知の制約。Owner自身のWindows機での確認が必要。

## 7. 未解決

- `MOBILE_INGRESS_HOST`の実際の有効化はOwner確認待ち（9章）。
- `resolve accept`はReflectionのみ対応のまま（Report3章・8章）。
- `register-scheduled-tasks.ps1`の実登録はOwner自身が行う必要が
  ある。

## 8. 次Version

1. Owner確認事項3への回答を受けての実地確認（スマホからの実送信）
   （依存：Owner確認）
2. 「16件」の実体判明後の取り込み（依存：Owner確認、Version35から
   継続）
3. クラウドActivation Gate（依存：Owner確認、Version35から継続）

## 9. Owner確認事項

- **`MOBILE_INGRESS_HOST`をLAN公開に変更してよいか**：
  `docs/project-management/Version35_Decision_Packet.md`（確認事項3）
  参照。認証なしのままLAN内の他デバイスから到達可能になる点を
  踏まえた確認をお願いしたい。急ぎ度：中（スマホからの実送信を試す
  には必須だが、PCブラウザからの送信・自動syncはこの確認を待たずに
  機能する）。
- Version35から継続する確認事項1（16件の実体）・2（クラウドvendor
  方向性）は変化なし。

## 10. 関連ADR

- 新規ADRなし。ADR 0064・0065の設計範囲内での実装。

## 完了宣言

- [x] Report、Feedback、Roadmap、PM Status、Open Issuesが同じ事実を示す
- [x] commit / tagを記録した（`45bcba9`）
- [x] 未実行テストを成功扱いしていない（603件全件実行・全件合格を実機で確認）
- [x] Owner確認事項を通常タスクへ埋没させていない（9章に明記、Decision Packetへも集約）
- [x] 次担当者がこの文書だけで再開できる（8章に依存関係付きで記載）
