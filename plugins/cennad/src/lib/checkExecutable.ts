import { spawnCli } from '@ogham/cross-platform';

export interface ExecutableStatus {
  status: 'available' | 'unavailable' | 'unknown';
  available: boolean;
  version?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

export async function checkExecutable(
  bin: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecutableStatus> {
  const result = await spawnCli(bin, ['--version'], { timeoutMs });
  const spawnError = result.spawnError as NodeJS.ErrnoException | null;
  if (spawnError?.code === 'ENOENT') {
    return { status: 'unavailable', available: false };
  }
  if (result.spawnError || result.timedOut || result.code !== 0) {
    return { status: 'unknown', available: false };
  }
  const version = result.stdout.trim();
  return {
    status: 'available',
    available: true,
    version: version || undefined,
  };
}
