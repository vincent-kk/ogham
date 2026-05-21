import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface FakeBinaryHandle {
  dir: string;
  cleanup: () => void;
}

export function installFakeBinary(
  name: string,
  script: string,
): FakeBinaryHandle {
  const dir = mkdtempSync(join(tmpdir(), `cogair-fake-${name}-`));
  const file = join(dir, name);
  writeFileSync(file, script);
  chmodSync(file, 0o755);
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
  process.env.PATH = `${dir}:${original ?? ''}`;
  return () => {
    process.env.PATH = original;
  };
}
