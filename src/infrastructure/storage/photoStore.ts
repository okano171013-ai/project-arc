import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, basename } from 'node:path';

/**
 * photoStore
 *
 * 写真ファイルの「管理」のみを行う（画像解析はしない、Owner要件）。
 * 指定されたローカルファイルを、Project ARC管理下のディレクトリに
 * コピーし、保存先の相対パスを返す。
 */
export async function savePhoto(params: {
  sourcePath: string;
  destDir: string;
  filenamePrefix: string;
}): Promise<string> {
  const { sourcePath, destDir, filenamePrefix } = params;

  if (!existsSync(sourcePath)) {
    throw new Error(`写真ファイルが見つかりません: ${sourcePath}`);
  }

  if (!existsSync(destDir)) {
    await mkdir(destDir, { recursive: true });
  }

  const ext = extname(sourcePath) || '.jpg';
  const safeOriginalName = basename(sourcePath, ext).replace(/[^\w\-ぁ-んァ-ヶー一-龠]/gu, '_');
  const destFileName = `${filenamePrefix}-${safeOriginalName}${ext}`;
  const destPath = `${destDir}/${destFileName}`;

  await copyFile(sourcePath, destPath);
  return destPath;
}
