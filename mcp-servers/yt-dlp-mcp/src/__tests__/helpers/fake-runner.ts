import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { RunOptions, RunResult, Runner } from '../../ytdlp/runner.js';

export interface FakeRunnerSpec {
  stdout?: string;
  stderr?: string;
  /** filename → content, written into the directory derived from `-o`/`--paths`. */
  files?: Record<string, string>;
  error?: unknown;
  onRun?: (args: string[]) => void;
}

export interface FakeRunner extends Runner {
  calls: string[][];
}

/**
 * Test double for the yt-dlp Runner. Records calls, optionally throws, and
 * simulates file-writing operations (json3 captions, downloads) by materializing
 * `files` into the output directory parsed from the args.
 */
export function makeFakeRunner(spec: FakeRunnerSpec = {}): FakeRunner {
  const calls: string[][] = [];
  return {
    calls,
    async run(args: string[], _opts?: RunOptions): Promise<RunResult> {
      calls.push(args);
      spec.onRun?.(args);
      if (spec.error !== undefined) {
        throw spec.error;
      }
      if (spec.files) {
        const dir = outputDir(args);
        if (dir) {
          await mkdir(dir, { recursive: true });
          for (const [name, content] of Object.entries(spec.files)) {
            await writeFile(path.join(dir, name), content, 'utf8');
          }
        }
      }
      return { stdout: spec.stdout ?? '', stderr: spec.stderr ?? '' };
    },
  };
}

function outputDir(args: string[]): string | null {
  const o = args.indexOf('-o');
  if (o >= 0 && args[o + 1]) {
    return path.dirname(args[o + 1]);
  }
  const p = args.indexOf('--paths');
  if (p >= 0 && args[p + 1]) {
    return args[p + 1];
  }
  return null;
}
