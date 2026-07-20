#!/usr/bin/env node
/**
 * Remote MCP 診断スクリプト（Version39緊急指示、2026-07-20）。
 *
 * 「公開Remote MCPが旧10ツールのまま」という問題を切り分けるため、
 * localhostと実公開URLの両方へ実MCP client（@modelcontextprotocol/sdk）で
 * 接続し、tool count・tool names・capability_registry_get結果を採取して
 * 比較表示する。**読み取り専用**——設定変更・再起動・秘密情報の表示は
 * 一切行わない。
 *
 * 使い方（Owner自身のPCで、Project ARCのルートディレクトリで実行）：
 *   node scripts/diagnose-remote-mcp.mjs http://127.0.0.1:3940/mcp https://<公開URL>/mcp
 *
 * 公開URLは `data\current-tunnel-url.txt`（`docs/setup/collaboration-runner.md`
 * 4章）に記録されている。引数を1つだけ渡すとlocalhostのみ診断する。
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function diagnoseOne(label, url) {
  console.log(`\n=== ${label}: ${url} ===`);
  try {
    const transport = new StreamableHTTPClientTransport(new URL(url));
    const client = new Client({ name: 'diagnose-remote-mcp', version: '1.0.0' });
    const connectStartedAt = Date.now();
    await client.connect(transport);
    const connectMs = Date.now() - connectStartedAt;
    console.log(`[OK] 接続成功（${connectMs}ms）`);

    const { tools } = await client.listTools();
    console.log(`[tool count] ${tools.length}`);
    console.log(`[tool names] ${tools.map((t) => t.name).sort().join(', ')}`);

    const hasRegistry = tools.some((t) => t.name === 'capability_registry_get');
    if (hasRegistry) {
      const result = await client.callTool({ name: 'capability_registry_get', arguments: {} });
      const text = result.content?.find((c) => c.type === 'text')?.text;
      if (text) {
        try {
          const parsed = JSON.parse(text);
          console.log('[capability_registry_get]', JSON.stringify(parsed, null, 2));
        } catch {
          console.log('[capability_registry_get raw]', text);
        }
      }
    } else {
      console.log('[capability_registry_get] このツール自体が存在しない——Version28以前の非常に古いbuildの可能性が高い');
    }

    await client.close();
  } catch (error) {
    console.log(`[NG] 接続・診断に失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const [localUrl, publicUrl] = process.argv.slice(2);
if (!localUrl) {
  console.error('使い方: node scripts/diagnose-remote-mcp.mjs <localhostのURL> [公開URL]');
  console.error('例: node scripts/diagnose-remote-mcp.mjs http://127.0.0.1:3940/mcp https://xxxx.ngrok-free.app/mcp');
  process.exit(1);
}

await diagnoseOne('localhost', localUrl);
if (publicUrl) {
  await diagnoseOne('公開URL', publicUrl);
} else {
  console.log('\n（公開URLが未指定のため、localhostのみ診断した。data\\current-tunnel-url.txt の値を第2引数に渡すと比較できる）');
}

const nextSteps = [
  '',
  '=== 次の手順（このスクリプトの出力を見た上で、Ownerが手動で行う） ===',
  '1. 上記の [tool count] が両方とも 26 で、buildCommit が今のgit HEAD',
  '   （git log -1 --format=%H）と一致していれば、実は最新化されている',
  '   ——ChatGPT側のconnector cacheが古いだけの可能性が高い（ChatGPT側で',
  '   コネクタを一度削除して再登録、または「ツールを更新」操作を試す）。',
  '2. localhostは26件・公開URLだけ古い（または接続失敗）場合、tunnelが',
  '   別のprocess/portを指している可能性が高い——',
  '   Get-Content data\\current-tunnel-url.txt の値と、実際にChatGPTへ',
  '   登録済みのURLが一致しているか確認する。',
  '3. localhostも古い（10件など）場合、稼働中の pnpm run mcp:remote',
  '   プロセスが長期間再起動されていない可能性が高い——',
  '   Get-Process -Name node | Select-Object Id,StartTime,Path で',
  '   プロセス起動時刻を確認し、直近のgit pull/commit時刻と比較する。',
  '   再起動が必要と判断した場合も、実行は先に本番反映の承認を得てから',
  '   行うこと（.\\scripts\\stop-all.ps1 → .\\scripts\\start-all.ps1）。',
].join('\n');
console.log(nextSteps);
