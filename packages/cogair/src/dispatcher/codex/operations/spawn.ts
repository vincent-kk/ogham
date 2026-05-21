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
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      resolve({
        exitCode: -1,
        stdout,
        stderr,
        spawnError: err as NodeJS.ErrnoException,
      });
    });
    child.on('close', (code) => {
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
