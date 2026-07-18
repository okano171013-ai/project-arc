# Screen Time / Opal 連携の実現可能性調査（Version26）

指示書6章「端末データ取得は最小権限、Owner明示同意、ローカル優先。
Screen Time等の取得可否をiOS制約込みで調査し、直接取得不能なら
Shortcut/CSV/手動共有等の代替案を比較」への回答。**実装ではなく調査
のみ**——Version26のスコープには実際に動くAPI連携は含めていない
（`docs/adr/0053-version26-behavior-intervention-layer.md`参照）。

## 1. iOS Screen Time（スクリーンタイム）

### 直接取得の可否

iOSのScreen Time機能が持つ利用実績データは、Appleの`DeviceActivity`
framework（iOS 16+）経由でのみアプリからアクセスできる。この
frameworkは以下の制約を持つ：

- **Family Controls entitlement**が必須——Apple Developer Programでの
  個別申請・承認が必要（自動付与ではない）。
- 取得できるのは**カテゴリ単位の利用時間**（アプリ個別の詳細な
  ログではない）が中心で、取得したデータをアプリ外（Project ARCの
  サーバー等）へ直接送信することも制約される（`DeviceActivityReport`
  はプライバシー保護のためExtension内で完結する設計）。
- 個人開発・個人利用目的でこのentitlementを取得できるかは不確実
  （Appleの審査プロセスに依存し、企業向けMDM/保護者向けアプリでの
  利用が主な想定用途）。

**結論**：Project ARC（個人用のローカルNode.jsサーバー）から直接
Screen Timeデータを定期的に取得する経路は、現実的には**存在しない**
か、少なくとも即座に利用可能ではない。

### 代替案

1. **Shortcuts app経由の手動/自動共有**：iOSの「ショートカット」
   アプリは`DeviceActivityReport`ではなく、ユーザー自身がScreen Time
   設定画面から確認できる範囲の情報（週次サマリのスクリーンショット
   等）を自動化できる場合がある。定期実行（オートメーション）で
   CSV/テキストを生成し、iCloud Drive等の共有フォルダに書き出す
   運用が考えられる——ただし取得できる粒度はOSバージョン・Shortcuts
   の機能拡張状況に依存し、詳細な検証が別途必要。
2. **手動共有**：Owner本人が週次/日次でScreen Timeのスクリーンショット
   や数値を`DistractionSignal`（`source: 'OwnerReported'`）として
   ChatGPT経由で報告する——追加のシステム開発なしに今すぐ運用できる
   最小構成。

## 2. Opal（スクリーンタイム管理アプリ）

Opalは公開API/Webhookを提供していない（2026年7月時点、一般ユーザー向け
プランの範囲では確認できず）。エクスポート機能があれば手動CSV共有が
代替案になりうるが、本調査時点でOpal側のエクスポート形式・頻度の
詳細は未確認——導入を具体的に検討する場合は改めてOpal側の仕様確認が
必要。

## 3. YouTube / SNS利用

各サービスの公式APIはユーザー本人の視聴履歴取得に強い制約があり
（YouTube Data APIは「自分のアカウントの視聴履歴」を汎用的に取得する
用途を想定していない）、現実的にはブラウザ拡張・OS側のスクリーン
タイム機能経由が主な取得経路になる——上記1と同じ制約を受ける。

## 4. 推奨する当面の運用（Version26時点）

実装済みの`DistractionSignal.source`が`'OwnerReported'`
（Owner本人が明示的にChatGPTへ報告した内容）を正式にサポートして
いるため、当面は以下の運用で開始できる：

1. Owner本人が気づいたタイミングで「YouTubeを20分見てしまった」等を
   ChatGPTに伝える → ARCが`DistractionSignal`（`source:
   'OwnerReported'`, `confidence: 'high'`）としてProposal送信。
2. Screen Timeの週次サマリをOwnerが手動で共有し、`source:
   'OwnerReported'`または`'ExternalMetric'`（`metricValue`に分数を
   記録）として保存する。
3. 将来、Shortcuts経由の自動CSV共有が実際に機能することを検証できた
   段階で`source: 'ExternalMetric'`の自動投入を追加検討する
   （次Version以降の課題）。

いずれの経路も、既存の`AgentDelegationGrant`（scope:
`DistractionSignal`）とWrite Proposal Layerの仕組みをそのまま使える
——新しい取り込み経路を追加する場合も、Constitution第2条・Version22
脅威モデルの制約（無認証Remote MCPに新しい書き込み経路を増やさない）
の範囲内で設計する。
