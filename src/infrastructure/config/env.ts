import { z } from 'zod';

/**
 * 環境変数のスキーマ。起動時に検証し、不正な設定を早期に検出する
 * （Principle 8: 長期保守性 — 実行時エラーより起動時エラーを優先）。
 */
const envSchema = z.object({
  SUPABASE_URL: z.string().url().default('http://localhost:54321'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
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
