/**
 * @file listMarkdownFiles.ts
 * @description 디렉토리를 재귀 순회하여 .md 절대 경로 목록을 반환한다 (Node builtin only).
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function listMarkdownFiles(
  rootDirectory: string,
): Promise<string[]> {
  const markdownPaths: string[] = [];
  const walkDirectory = async (directory: string): Promise<void> => {
    const directoryEntries = await readdir(directory, { withFileTypes: true });
    for (const directoryEntry of directoryEntries) {
      const entryPath = join(directory, directoryEntry.name);
      if (directoryEntry.isDirectory()) await walkDirectory(entryPath);
      else if (directoryEntry.name.endsWith('.md'))
        markdownPaths.push(entryPath);
    }
  };
  await walkDirectory(rootDirectory);
  return markdownPaths;
}
