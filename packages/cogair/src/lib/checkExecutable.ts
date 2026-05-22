import { spawn } from 'node:child_process';

export interface ExecutableStatus {
  available: boolean;
  version?: string;
}

const DEFAULT_TIMEOUT_MS = 1500;

export function checkExecutable(
  bin: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecutableStatus> {
  return new Promise((resolve) => {
    let stdout = '';
    let settled = false;
    const settle = (status: ExecutableStatus): void => {
      if (settled) return;
      settled = true;
      resolve(status);
    };

    const child = spawn(bin, ['--version'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const timer = setTimeout(() => {
      child.kill();
      settle({ available: false });
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on('error', () => {
      clearTimeout(timer);
      settle({ available: false });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        settle({ available: true, version: stdout.trim() || undefined });
      } else {
        settle({ available: false });
      }
    });
  });
}
