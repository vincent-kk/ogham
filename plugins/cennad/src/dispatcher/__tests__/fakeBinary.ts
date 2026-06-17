import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { env } from '@ogham/cross-platform';

export interface FakeBinaryHandle {
  dir: string;
  cleanup: () => void;
}

export function installFakeBinary(
  name: string,
  script: string,
): FakeBinaryHandle {
  const dir = mkdtempSync(join(tmpdir(), `cennad-fake-${name}-`));
  const file = join(dir, name);
  writeFileSync(file, script);
  chmodSync(file, 0o755);
  if (env.isWindows)
    writeFileSync(
      join(dir, `${name}.cmd`),
      `@echo off\r\nnode "%~dp0${name}" %*\r\n`,
    );
  return {
    dir,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export interface FakeBinaryOnPath {
  dir: string;
  cleanup: () => void;
}

export function prependToPath(dir: string): () => void {
  const original = process.env.PATH;
  process.env.PATH = `${dir}${env.pathDelimiter}${original ?? ''}`;
  return () => {
    process.env.PATH = original;
  };
}
