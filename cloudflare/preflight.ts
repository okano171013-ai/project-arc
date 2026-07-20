import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Cloud Worker pre-deploy preflight（Version39、Owner指示書2026-07-20項目7、ADR 0071）。
 *
 * 設定ファイル・binding・secret「名」・テスト結果のみを確認する。
 * `wrangler login`・`wrangler deploy`・`wrangler secret put`・アカウント作成など、
 * アカウントに触れる操作は一切行わない（Claude Codeはこれらを代行できない、
 * Owner指示書で明示的に禁止）。READY/NOT READYを報告するだけの読み取り専用チェック。
 */

const cloudflareDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(cloudflareDir, '..');

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];

function check(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
}

// 1. wrangler.toml（本物、.example ではない）の存在確認。
//    Owner未セットアップ段階では存在しないのが正常であり、それ自体は
//    「NOT READY（未設定）」として報告するに留める——エラー扱いにしない。
const wranglerTomlPath = join(cloudflareDir, 'wrangler.toml');
const wranglerTomlExists = existsSync(wranglerTomlPath);
check(
  'wrangler.toml exists',
  wranglerTomlExists,
  wranglerTomlExists
    ? wranglerTomlPath
    : `未作成（${wranglerTomlPath}）。実デプロイ前にOwnerが wrangler.toml.example から作成し、` +
      'account_id・KV namespace idを設定する必要がある（Claude Codeは代行しない）。',
);

if (wranglerTomlExists) {
  const toml = readFileSync(wranglerTomlPath, 'utf-8');

  const nameMatch = /^\s*name\s*=\s*"([^"]*)"/m.exec(toml);
  check('name field present', !!nameMatch?.[1], nameMatch?.[1] ? `name = "${nameMatch[1]}"` : 'name フィールドが見つからない');

  const mainMatch = /^\s*main\s*=\s*"([^"]*)"/m.exec(toml);
  check('main field present', !!mainMatch?.[1], mainMatch?.[1] ? `main = "${mainMatch[1]}"` : 'main フィールドが見つからない');

  const compatDateMatch = /^\s*compatibility_date\s*=\s*"([^"]*)"/m.exec(toml);
  check(
    'compatibility_date field present',
    !!compatDateMatch?.[1],
    compatDateMatch?.[1] ? `compatibility_date = "${compatDateMatch[1]}"` : 'compatibility_date フィールドが見つからない',
  );

  const nodejsCompat = /compatibility_flags\s*=\s*\[[^\]]*"nodejs_compat"[^\]]*\]/m.test(toml);
  check(
    'nodejs_compat flag enabled',
    nodejsCompat,
    nodejsCompat ? 'compatibility_flags に nodejs_compat あり' : 'nodejs_compat が compatibility_flags に無い（node:cryptoが動作しない）',
  );

  const kvBinding = /\[\[kv_namespaces\]\]\s*\n\s*binding\s*=\s*"INGRESS_RECORDS"/m.test(toml);
  check(
    'INGRESS_RECORDS KV binding present',
    kvBinding,
    kvBinding ? 'binding = "INGRESS_RECORDS" あり' : 'KV binding "INGRESS_RECORDS" が見つからない（worker.tsのEnv型と不一致）',
  );

  // secret値のハードコード検出：DEVICE_TOKEN / PULL_TOKEN に実値が代入されていないこと。
  // コメントアウトされた案内行（# wrangler secret put ...）は対象外。
  const hardcodedSecret = /^\s*(DEVICE_TOKEN|PULL_TOKEN)\s*=\s*"[^"]*"/m.exec(toml);
  check(
    'no hardcoded secrets in wrangler.toml',
    !hardcodedSecret,
    hardcodedSecret
      ? `${hardcodedSecret[1]} が wrangler.toml に平文で存在する——即座に削除し \`wrangler secret put ${hardcodedSecret[1]}\` へ移すこと`
      : 'DEVICE_TOKEN・PULL_TOKEN のハードコードなし（secretはwrangler secret put経由の想定）',
  );
}

// 2. テスト・型チェック（Miniflareベース、アカウント不要）。
function runCommand(label: string, command: string): void {
  try {
    execSync(command, { cwd: rootDir, stdio: 'pipe' });
    check(label, true, `\`${command}\` 成功`);
  } catch (error) {
    const output = error instanceof Error && 'stdout' in error ? String((error as { stdout?: Buffer }).stdout ?? '') : '';
    check(label, false, `\`${command}\` 失敗${output ? `: ${output.slice(0, 500)}` : ''}`);
  }
}

runCommand('cloudflare:typecheck passes', 'pnpm cloudflare:typecheck');
runCommand('cloudflare:test passes', 'pnpm cloudflare:test');

// 3. レポート出力。
const failed = results.filter((r) => !r.ok);
console.log('=== Cloud Worker Preflight（読み取り専用、アカウント操作なし） ===\n');
for (const r of results) {
  console.log(`[${r.ok ? 'OK' : 'NG'}] ${r.name}`);
  console.log(`      ${r.detail}`);
}
console.log('');
if (failed.length === 0) {
  console.log('READY: 設定・テストは全て確認済み。ただし実デプロイ（wrangler login / deploy / secret put）はOwner自身が行うこと。');
} else {
  console.log(`NOT READY: ${failed.length}件の未確認項目がある（上記 [NG] 参照）。`);
  if (!wranglerTomlExists) {
    console.log('（wrangler.toml未作成は実デプロイ前の通常の状態——エラーではなく「これから設定が必要」という意味）');
  }
}

process.exit(failed.length === 0 ? 0 : 1);
