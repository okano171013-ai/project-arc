import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicWriteFile } from '../db/jsonStore.js';

/**
 * BackupService（Version31、ADR 0058）
 *
 * `dataDir`直下の`*.json`ファイルを対象にした、Entityの型を知らない
 * 汎用バックアップ・復元機構。新しいRepository（新しい`data/xxx.json`）
 * が増えても、このServiceの変更は不要。
 */

const SCHEMA_VERSION = '1';

export interface BackupManifest {
  schemaVersion: string;
  createdAt: string;
  files: Array<{ name: string; sha256: string }>;
}

export interface BackupGeneration {
  id: string;
  createdAt: string;
  files: string[];
}

export class BackupService {
  constructor(
    private readonly dataDir: string = 'data',
    private readonly backupsDirName: string = 'backups',
    private readonly retentionCount: number = 10,
  ) {}

  private get backupsDir(): string {
    return join(this.dataDir, this.backupsDirName);
  }

  /**
   * `dataDir`直下の`*.json`のみを対象とする——`backups/`自身や、
   * テストが使う`_test-*`ディレクトリはサブディレクトリのため、
   * この一覧には含まれない。
   */
  private async listSourceFiles(): Promise<string[]> {
    if (!existsSync(this.dataDir)) return [];
    const entries = await readdir(this.dataDir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(entry.name);
      }
    }
    return files.sort();
  }

  async create(): Promise<BackupGeneration> {
    const files = await this.listSourceFiles();
    const id = new Date().toISOString().replace(/[:.]/g, '-');
    const generationDir = join(this.backupsDir, id);
    await mkdir(generationDir, { recursive: true });

    const manifestFiles: BackupManifest['files'] = [];
    for (const name of files) {
      const raw = await readFile(join(this.dataDir, name), 'utf-8');
      await atomicWriteFile(join(generationDir, name), raw);
      manifestFiles.push({ name, sha256: sha256Of(raw) });
    }

    const manifest: BackupManifest = {
      schemaVersion: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      files: manifestFiles,
    };
    await atomicWriteFile(join(generationDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    await this.pruneOldGenerations();

    return { id, createdAt: manifest.createdAt, files };
  }

  async list(): Promise<BackupGeneration[]> {
    if (!existsSync(this.backupsDir)) return [];
    const entries = await readdir(this.backupsDir, { withFileTypes: true });
    const generations: BackupGeneration[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(this.backupsDir, entry.name, 'manifest.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as BackupManifest;
      generations.push({
        id: entry.name,
        createdAt: manifest.createdAt,
        files: manifest.files.map((f) => f.name),
      });
    }

    return generations.sort((a, b) => b.id.localeCompare(a.id));
  }

  /**
   * 復元前に、復元操作自体を不可逆にしないため現状のもう1世代を
   * 自動的にバックアップする（ADR 0058「Principle 4」）。復元対象の
   * manifestに記録されたチェックサムと実ファイルの内容を照合し、
   * 不一致があれば復元を中止する。
   */
  async restore(id: string): Promise<BackupGeneration> {
    const generationDir = join(this.backupsDir, id);
    const manifestPath = join(generationDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      throw new Error(`Backup generation not found: ${id}`);
    }
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as BackupManifest;

    const contents = new Map<string, string>();
    for (const file of manifest.files) {
      const raw = await readFile(join(generationDir, file.name), 'utf-8');
      if (sha256Of(raw) !== file.sha256) {
        throw new Error(`Backup checksum mismatch for ${file.name} in generation ${id} — refusing to restore`);
      }
      contents.set(file.name, raw);
    }

    // 復元前スナップショット（安全網）。
    await this.create();

    for (const [name, raw] of contents) {
      await atomicWriteFile(join(this.dataDir, name), raw);
    }

    return { id, createdAt: manifest.createdAt, files: manifest.files.map((f) => f.name) };
  }

  private async pruneOldGenerations(): Promise<void> {
    const generations = await this.list();
    const excess = generations.slice(this.retentionCount);
    for (const generation of excess) {
      await rm(join(this.backupsDir, generation.id), { recursive: true, force: true });
    }
  }
}

function sha256Of(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}
