import { spawnCli } from '@ogham/cross-platform';

export interface ExecutableStatus {
  available: boolean;
  version?: string;
}

const DEFAULT_TIMEOUT_MS = 1500;

export async function checkExecutable(
  bin: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecutableStatus> {
  const result = await spawnCli(bin, ['--version'], { timeoutMs });
  if (result.spawnError || result.timedOut || result.code !== 0) {
    return { available: false };
  }
  const version = result.stdout.trim();
  return { available: true, version: version || undefined };
}
