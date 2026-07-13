import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { savePhoto } from './photoStore.js';

describe('savePhoto', () => {
  let sourceDir: string;
  let destDir: string;
  let sourceFile: string;

  beforeEach(async () => {
    sourceDir = await mkdtemp(join(tmpdir(), 'arc-photo-src-'));
    destDir = await mkdtemp(join(tmpdir(), 'arc-photo-dest-'));
    sourceFile = join(sourceDir, 'my photo.jpg');
    await writeFile(sourceFile, 'fake-image-bytes');
  });

  afterEach(async () => {
    await rm(sourceDir, { recursive: true, force: true });
    await rm(destDir, { recursive: true, force: true });
  });

  it('copies the file into destDir and returns the new path', async () => {
    const resultPath = await savePhoto({
      sourcePath: sourceFile,
      destDir,
      filenamePrefix: '2026-07-01',
    });

    expect(existsSync(resultPath)).toBe(true);
    expect(resultPath).toContain('2026-07-01');
    expect(resultPath.endsWith('.jpg')).toBe(true);
  });

  it('throws a friendly error when the source file does not exist', async () => {
    await expect(
      savePhoto({
        sourcePath: join(sourceDir, 'does-not-exist.jpg'),
        destDir,
        filenamePrefix: 'x',
      }),
    ).rejects.toThrow(/見つかりません/);
  });

  it('creates destDir if it does not exist yet', async () => {
    const newDestDir = join(destDir, 'nested', 'dir');
    const resultPath = await savePhoto({
      sourcePath: sourceFile,
      destDir: newDestDir,
      filenamePrefix: 'x',
    });

    expect(existsSync(resultPath)).toBe(true);
  });
});
