import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdir, readFile, rm, mkdir, rename as realRename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { readJsonArray, writeJsonArray } from './jsonStore.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

describe('jsonStore', () => {
  const DIR = 'data/_test-json-store';
  const FILE = `${DIR}/rows.json`;

  beforeEach(async () => {
    await rm(DIR, { recursive: true, force: true });
    await mkdir(DIR, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(DIR, { recursive: true, force: true });
  });

  it('returns an empty array when the file does not exist', async () => {
    expect(await readJsonArray(FILE)).toEqual([]);
  });

  it('round-trips data written and read back', async () => {
    await writeJsonArray(FILE, [{ id: '1' }, { id: '2' }]);
    expect(await readJsonArray<{ id: string }>(FILE)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('leaves no temp files behind after a successful write (atomic rename, ADR 0058)', async () => {
    await writeJsonArray(FILE, [{ id: '1' }]);
    const entries = await readdir(DIR);
    expect(entries.every((name) => !name.includes('.tmp-'))).toBe(true);
  });

  it('does not corrupt the existing file if the rename step fails mid-write', async () => {
    await writeJsonArray(FILE, [{ id: 'original' }]);

    vi.mocked(realRename).mockRejectedValueOnce(new Error('simulated crash'));

    await expect(writeJsonArray(FILE, [{ id: 'new' }])).rejects.toThrow('simulated crash');

    // 元のファイルは壊れていない（新しい内容で上書きされていない）。
    expect(await readJsonArray<{ id: string }>(FILE)).toEqual([{ id: 'original' }]);

    // 失敗した一時ファイルが残っていない。
    const entries = await readdir(DIR);
    expect(entries.every((name) => !name.includes('.tmp-'))).toBe(true);
  });

  it('treats a whitespace-only file as an empty array', async () => {
    const { writeFile } = await import('node:fs/promises');
    await mkdir(DIR, { recursive: true });
    await writeFile(FILE, '   \n', 'utf-8');
    expect(await readJsonArray(FILE)).toEqual([]);
  });

  it('creates the parent directory if missing', async () => {
    const nested = `${DIR}/nested/rows.json`;
    await writeJsonArray(nested, [{ id: '1' }]);
    expect(existsSync(nested)).toBe(true);
    expect(await readFile(nested, 'utf-8')).toContain('"id": "1"');
  });
});
