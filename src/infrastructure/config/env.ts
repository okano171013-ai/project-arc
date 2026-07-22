import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// .envファイルをprocess.envに読み込む。CLIのどのエントリポイントから
// loadEnv()が呼ばれても確実に読み込まれるよう、モジュール読み込み時に
// 一度だけ実行する。
loadDotenv();

/**
 * 環境変数のスキーマ。起動時に検証し、不正な設定を早期に検出する
 * （Principle 8: 長期保守性 — 実行時エラーより起動時エラーを優先）。
 */
const envSchema = z.object({
  SUPABASE_URL: z.string().url().default('http://localhost:54321'),
  // Supabase接続時のみ実際に必要。未設定でもloadEnv()自体は失敗させず、
  // 利用箇所（SupabaseReflectionRepositoryを組み立てる場所）で個別に
  // チェックする（Google連携のためにloadEnv()を呼ぶ場面が増えたため）。
  SUPABASE_ANON_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // ARC Connector（Version15）。未設定ならAPI Key認証は無効のまま
  // （ADR 0036参照、Version7〜14と同じ挙動を維持するopt-in設計）。
  ARC_API_KEY: z.string().optional(),
  ARC_CONNECTOR_BASE_URL: z.string().url().default('http://127.0.0.1:3939'),
  // Remote MCP（Version18）の待受ポート。/mcpエンドポイント自体は
  // 認証しない（ChatGPT接続に合わせた設計、ADR 0044）。
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3940),
  // OAuth 2.1試作（Version22、ADR 0049）。既定false——設定しない限り
  // ADR 0044の無認証挙動を1バイトも変えない。trueにする場合は
  // MCP_OAUTH_OWNER_PASSCODEも必須（起動時チェック、`remoteServer.ts`）。
  // `z.coerce.boolean()`は`Boolean("false")`が`true`になる既知の罠が
  // あるため使わず、文字列`"true"`との厳密一致のみを`true`とする。
  MCP_OAUTH_ENABLED: z.preprocess((v) => v === 'true', z.boolean()).default(false),
  MCP_OAUTH_OWNER_PASSCODE: z.string().optional(),
  // Study Session Ingestion（Version27）。未設定ならremoteServer.tsの
  // /api/study-sessionsは常に401を返す（fail-closed、ADR 0054）——
  // MCP_OAUTH_ENABLEDとは独立した別の認証境界。
  STUDY_TIMER_API_TOKEN: z.string().optional(),
  // カンマ区切りの許可オリジン一覧。未設定ならブラウザからのクロス
  // オリジンリクエストは常に拒否される（CORSヘッダーを一切付与しない）。
  STUDY_TIMER_ALLOWED_ORIGINS: z.string().optional(),
  // Mobile Ingress（Version35〜36、ADR 0064・0065）。既定は127.0.0.1
  // 限定——LAN公開はOwnerが明示的にMOBILE_INGRESS_HOSTを変更した場合の
  // opt-inとする（`STUDY_TIMER_API_TOKEN`未設定時のfail-closedとは逆で、
  // こちらは「変更しない限り最も閉じた既定値のまま」というopt-in設計）。
  MOBILE_INGRESS_PORT: z.coerce.number().int().positive().default(3941),
  MOBILE_INGRESS_HOST: z.string().default('127.0.0.1'),
  // Version37、Owner 2026-07-20指示書。MOBILE_INGRESS_HOSTを127.0.0.1
  // 以外へ変更する場合は必須（fail-closed、`validateExposureConfig()`）。
  // 既定のloopback運用では未設定のままでよい。
  MOBILE_INGRESS_API_TOKEN: z.string().optional(),
  // Version38（ADR 0069）。`pnpm mobile-sync pull`がcloud側
  // （Cloudflare Workers等）のMobile Ingress queueを引き下ろす際の
  // 接続先。未設定なら`pull`コマンドは明確なエラーで終了する
  // （クラウド未使用のOwnerには一切影響しないopt-in機能）。
  CLOUD_INGRESS_URL: z.string().url().optional(),
  CLOUD_INGRESS_PULL_TOKEN: z.string().optional(),
  // Version42（ADR 0075）。`pnpm mobile-sync notion-pull`がNotion
  // （Owner作成のInternal Integration）をTransport sourceとして
  // 引き下ろす際の認証情報。未設定なら`notion-pull`コマンドは明確な
  // エラーで終了する（Notion未使用のOwnerには一切影響しないopt-in
  // 機能、CLOUD_INGRESS_*と同じ設計）。
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * 遅延評価で環境変数を検証する。CLI起動時など、実際にDBアクセスが
 * 必要になったタイミングで初めて呼び出す設計とする。
 */
export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
