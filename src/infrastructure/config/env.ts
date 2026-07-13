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
