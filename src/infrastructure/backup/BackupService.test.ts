import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BackupService } from './BackupService.js';

describe('BackupService (Version31, ADR 0058)', () => {
  const DATA_DIR = 'data/_test-backup-service';

  beforeEach(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(join(DATA_DIR, 'reflections.json'), JSON.stringify([{ id: 'r1', date: '2026-07-19' }]), 'utf-8');
    await writeFile(join(DATA_DIR, 'tasks.json'), JSON.stringify([{ id: 't1', title: 'test task' }]), 'utf-8');
  });

  afterEach(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it('creates a backup generation containing copies of every *.json file and a manifest', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 10);
    const generation = await service.create();

    expect(generation.files.sort()).toEqual(['reflections.json', 'tasks.json']);

    const generationDir = join(DATA_DIR, 'backups', generation.id);
    expect(existsSync(join(generationDir, 'reflections.json'))).toBe(true);
    expect(existsSync(join(generationDir, 'tasks.json'))).toBe(true);

    const manifest = JSON.parse(await readFile(join(generationDir, 'manifest.json'), 'utf-8')) as {
      schemaVersion: string;
      files: Array<{ name: string; sha256: string }>;
    };
    expect(manifest.schemaVersion).toBe('1');
    expect(manifest.files).toHaveLength(2);
  });

  it('does not include the backups directory itself as a source file', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 10);
    await service.create();
    const secondGeneration = await service.create();
    expect(secondGeneration.files).not.toContain('backups');
  });

  it('lists generations newest-first', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 10);
    const first = await service.create();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await service.create();

    const list = await service.list();
    expect(list[0]!.id).toBe(second.id);
    expect(list.some((g) => g.id === first.id)).toBe(true);
  });

  it('restore drill: backup -> delete data -> restore -> content matches original (ARC-PM-002)', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 10);
    const generation = await service.create();

    // データを破損させる（削除）。
    await rm(join(DATA_DIR, 'reflections.json'));
    await writeFile(join(DATA_DIR, 'tasks.json'), 'not valid json at all', 'utf-8');

    await service.restore(generation.id);

    const reflections = JSON.parse(await readFile(join(DATA_DIR, 'reflections.json'), 'utf-8'));
    const tasks = JSON.parse(await readFile(join(DATA_DIR, 'tasks.json'), 'utf-8'));
    expect(reflections).toEqual([{ id: 'r1', date: '2026-07-19' }]);
    expect(tasks).toEqual([{ id: 't1', title: 'test task' }]);
  });

  it('restore takes an automatic safety snapshot before overwriting (復元操作自体を不可逆にしない)', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 10);
    const original = await service.create();

    await writeFile(join(DATA_DIR, 'tasks.json'), JSON.stringify([{ id: 't2', title: 'changed after backup' }]), 'utf-8');

    const beforeRestoreCount = (await service.list()).length;
    await service.restore(original.id);
    const afterRestoreCount = (await service.list()).length;

    // create()（安全網スナップショット）分、世代数が増えている。
    expect(afterRestoreCount).toBeGreaterThan(beforeRestoreCount);
  });

  it('refuses to restore when a backed-up file has been tampered with (checksum mismatch)', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 10);
    const generation = await service.create();

    await writeFile(
      join(DATA_DIR, 'backups', generation.id, 'tasks.json'),
      JSON.stringify([{ id: 'tampered' }]),
      'utf-8',
    );

    await expect(service.restore(generation.id)).rejects.toThrow(/checksum mismatch/);
  });

  it('prunes generations beyond the retention count', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 2);
    const first = await service.create();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.create();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const third = await service.create();

    const list = await service.list();
    expect(list).toHaveLength(2);
    expect(list.map((g) => g.id)).toContain(third.id);
    expect(list.map((g) => g.id)).not.toContain(first.id);
  });

  it('returns an empty list when no backups exist yet', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 10);
    expect(await service.list()).toEqual([]);
  });

  it('throws a clear error when restoring a non-existent generation', async () => {
    const service = new BackupService(DATA_DIR, 'backups', 10);
    await expect(service.restore('no-such-generation')).rejects.toThrow('Backup generation not found');
  });
});
