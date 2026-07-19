import { z } from 'zod';

/**
 * 環境変数のスキーマは接続先ごとに分離する。CLIで選ばれなかった
 * 接続先の必須キーが未設定でもエラーにならないようにするため
 * （例：`--db=notion`実行時にSUPABASE_ANON_KEY未設定で落ちない）。
 */

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url().default('http://localhost:54321'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  // ADR 0003: RLSにより認証済みセッションが必須になったため、
  // 単一Ownerの認証情報をCLIから自動サインインに使う。
  SUPABASE_OWNER_EMAIL: z.string().email('SUPABASE_OWNER_EMAIL must be a valid email'),
  SUPABASE_OWNER_PASSWORD: z.string().min(1, 'SUPABASE_OWNER_PASSWORD is required'),
});

const notionEnvSchema = z.object({
  NOTION_API_KEY: z.string().min(1, 'NOTION_API_KEY is required'),
  NOTION_DATABASE_ID: z.string().min(1, 'NOTION_DATABASE_ID is required'),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
export type NotionEnv = z.infer<typeof notionEnvSchema>;

let cachedSupabaseEnv: SupabaseEnv | undefined;
let cachedNotionEnv: NotionEnv | undefined;

function parseOrThrow<S extends z.ZodTypeAny>(schema: S, source: unknown): z.infer<S> {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

/**
 * 遅延評価で環境変数を検証する。CLI起動時など、実際にDBアクセスが
 * 必要になったタイミングで初めて呼び出す設計とする（Principle 8）。
 */
export function loadSupabaseEnv(): SupabaseEnv {
  if (!cachedSupabaseEnv) {
    cachedSupabaseEnv = parseOrThrow(supabaseEnvSchema, process.env);
  }
  return cachedSupabaseEnv;
}

export function loadNotionEnv(): NotionEnv {
  if (!cachedNotionEnv) {
    cachedNotionEnv = parseOrThrow(notionEnvSchema, process.env);
  }
  return cachedNotionEnv;
}
