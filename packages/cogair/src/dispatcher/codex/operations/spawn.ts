import { spawn } from 'node:child_process';

export interface CodexSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
}

export interface CodexSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export function spawnCodex(
  args: string[],
  options: CodexSpawnOptions = {},
): Promise<CodexSpawnResult> {
  return new Promise((resolve) => {
    const child = spawn('codex', args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer =
      typeof options.timeoutMs === 'number' && options.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
          }, options.timeoutMs)
        : null;
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({
        exitCode: -1,
        stdout,
        stderr,
        spawnError: err as NodeJS.ErrnoException,
      });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        const err = new Error(
          `codex spawn timed out after ${options.timeoutMs}ms`,
        ) as NodeJS.ErrnoException;
        err.code = 'ETIMEDOUT';
        resolve({ exitCode: -1, stdout, stderr, spawnError: err });
        return;
      }
      resolve({
        exitCode: code ?? 0,
        stdout,
        stderr,
        spawnError: null,
      });
    });
    child.stdin.end();
  });
}
