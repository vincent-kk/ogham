import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function gitExec(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trimEnd();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`git ${args[0]} failed in ${cwd}: ${msg}`, { cause: error });
  }
}

/** Compute content hash from committed (HEAD) blob state, not working tree. */
export async function computeContentHash(
  projectRoot: string,
  baseCommit: string,
  changedFiles: string[],
): Promise<{ sessionHash: string; fileHashes: Record<string, string> }> {
  const fileHashes: Record<string, string> = {};

  if (changedFiles.length > 0) {
    let lsTreeOutput = '';
    try {
      lsTreeOutput = await gitExec(projectRoot, [
        'ls-tree',
        '-r',
        'HEAD',
        '--',
        ...changedFiles,
      ]);
    } catch {
      // ls-tree may fail if all files are deleted; proceed with empty output.
    }

    // Parse "<mode> <type> <hash>\t<path>" lines.
    const headBlobs = new Map<string, string>();
    if (lsTreeOutput) {
      for (const line of lsTreeOutput.split('\n')) {
        if (!line) continue;
        const tabIdx = line.indexOf('\t');
        if (tabIdx === -1) continue;
        const filePath = line.slice(tabIdx + 1);
        const blobHash = line.slice(0, tabIdx).split(' ')[2];
        headBlobs.set(filePath, blobHash);
      }
    }

    for (const file of changedFiles) {
      fileHashes[file] = headBlobs.get(file) ?? 'DELETED';
    }
  }

  const sortedEntries = Object.keys(fileHashes)
    .sort()
    .map((p) => `${p}:${fileHashes[p]}`)
    .join('\n');
  const hashInput =
    baseCommit + '\n' + (sortedEntries ? sortedEntries + '\n' : '');
  const sessionHash = createHash('sha256').update(hashInput).digest('hex');

  return { sessionHash, fileHashes };
}
