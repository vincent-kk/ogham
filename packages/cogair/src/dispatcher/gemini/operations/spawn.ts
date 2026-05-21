import { spawn } from 'node:child_process';

export interface GeminiSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
}

export interface GeminiSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export function spawnGemini(
  args: string[],
  options: GeminiSpawnOptions = {},
): Promise<GeminiSpawnResult> {
  return new Promise((resolve) => {
    const child = spawn('gemini', args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        GEMINI_CLI_TRUST_WORKSPACE: 'true',
        ...options.env,
      },
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
