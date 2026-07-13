import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * tokenStore
 *
 * ADR 0004に基づく、Googleリフレッシュトークンの簡易暗号化保存。
 *
 * 暗号化キーはトークンと同じ`data/`配下に保存するため、同一マシン内の
 * 別プロセスからの完全な防御にはならない（ADR 0004参照）。誤って
 * `data/`フォルダを共有・コミットしてしまった場合の平文露出を防ぐ
 * ことが主目的。
 */

const KEY_PATH = 'data/.token-key';
const TOKEN_PATH = 'data/google-refresh-token.enc';

async function ensureDir(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function getOrCreateKey(): Promise<Buffer> {
  if (existsSync(KEY_PATH)) {
    const raw = await readFile(KEY_PATH, 'utf-8');
    return Buffer.from(raw.trim(), 'base64');
  }
  const key = randomBytes(32);
  await ensureDir(KEY_PATH);
  await writeFile(KEY_PATH, key.toString('base64'), 'utf-8');
  return key;
}

export async function readEncryptedToken(): Promise<string | null> {
  if (!existsSync(TOKEN_PATH)) {
    return null;
  }
  const key = await getOrCreateKey();
  const raw = await readFile(TOKEN_PATH, 'utf-8');
  const [ivHex, tagHex, dataHex] = raw.trim().split(':');
  if (!ivHex || !tagHex || !dataHex) {
    return null;
  }

  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf-8');
}

export async function writeEncryptedToken(token: string): Promise<void> {
  const key = await getOrCreateKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  await ensureDir(TOKEN_PATH);
  await writeFile(
    TOKEN_PATH,
    `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`,
    'utf-8',
  );
}
