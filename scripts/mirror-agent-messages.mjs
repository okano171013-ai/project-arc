#!/usr/bin/env node
/**
 * AgentMessage → Git Inbox ミラースクリプト（Version40、Owner指示
 * `ba6548bc-...`項目6）。
 *
 * 本番Project ARCのAgentMessage（`direction: ToClaudeCode`）と、
 * Claude Codeが動くサンドボックス環境は別データストアを見ているため
 * （このセッションで`agent_message_list`が繰り返し`fetch failed`と
 * なった実例、`docs/handoff/archive/Version40_ARC_Brief.md`参照）、
 * AgentMessageだけを唯一の指示経路にしないことが目的。
 *
 * **Owner自身のPC（本物のProject ARC・本物のgit checkoutが両方ある
 * 環境）で実行する。** `pnpm run api`が起動済みであること。
 *
 *   node scripts/mirror-agent-messages.mjs
 *
 * 動作：
 *   1. ローカルのARC Connector HTTP API（既定 http://127.0.0.1:3939）
 *      から `GET /agent-messages?direction=ToClaudeCode` を取得する。
 *   2. `docs/handoff/ARC_INBOX.md` を読み、
 *      `<!-- mirrored-agent-message-id: <id> -->` マーカーで既に
 *      ミラー済みのIDを収集する（重複実行防止、指示項目6）。
 *   3. 未ミラーのメッセージのみ、id・作成日時・関連Version・本文と
 *      マーカーを付けて、プレースホルダー行の直前へ追記する。
 *   4. 何件追加したかを標準出力へ報告する。
 *
 * 秘密情報の表示・変更、Remote MCP/ngrokの操作は一切行わない。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const inboxPath = resolve(repoRoot, 'docs/handoff/ARC_INBOX.md');
const PLACEHOLDER = '<!-- ここにARCの指示書を貼り付け -->';
const MARKER_PREFIX = '<!-- mirrored-agent-message-id: ';

const baseUrl = process.env.ARC_API_BASE_URL ?? 'http://127.0.0.1:3939';
const apiKey = process.env.ARC_API_KEY;

async function fetchToClaudeCodeMessages() {
  const headers = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(`${baseUrl}/agent-messages?direction=ToClaudeCode`, { headers });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(`ARC Connector API呼び出しに失敗: ${json.error ?? res.status}`);
  }
  return json.data.messages;
}

function alreadyMirroredIds(inboxText) {
  const ids = new Set();
  const re = new RegExp(`${MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s]+) -->`, 'g');
  let match;
  while ((match = re.exec(inboxText)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

function formatSection(message) {
  const { id, record, createdAt } = message;
  const relatedVersion = record.relatedVersion ? `（${record.relatedVersion}）` : '';
  return [
    `## ミラー済みAgentMessage${relatedVersion}: ${id} — ${createdAt}`,
    '',
    `${MARKER_PREFIX}${id} -->`,
    '',
    record.content,
    '',
    '（このセクションは`scripts/mirror-agent-messages.mjs`が自動生成した。',
    '手動で編集した場合、次回実行時にマーカーが残っていれば再追記されない）',
    '',
  ].join('\n');
}

async function main() {
  const messages = await fetchToClaudeCodeMessages();
  const inboxText = readFileSync(inboxPath, 'utf8');
  const mirrored = alreadyMirroredIds(inboxText);

  const newMessages = messages.filter((m) => !mirrored.has(m.id));
  if (newMessages.length === 0) {
    console.log(`新規AgentMessageなし（本番${messages.length}件、全てミラー済み）`);
    return;
  }

  const newSections = newMessages.map(formatSection).join('\n');
  const updated = inboxText.includes(PLACEHOLDER)
    ? inboxText.replace(PLACEHOLDER, `${newSections}\n${PLACEHOLDER}`)
    : `${inboxText}\n\n${newSections}`;

  writeFileSync(inboxPath, updated, 'utf8');
  console.log(`${newMessages.length}件の新規AgentMessageをARC_INBOX.mdへミラーした:`);
  for (const m of newMessages) {
    console.log(`  - ${m.id}（${m.record.relatedVersion ?? '関連Version未指定'}）`);
  }
  console.log('\n次の手順: git diff docs/handoff/ARC_INBOX.md で内容を確認し、commit・pushしてください。');
}

main().catch((error) => {
  console.error(`失敗: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
