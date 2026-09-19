import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FACTS_HASH_PREFIX, FACTS_SCHEMA_VERSION } from '../../../../../constants/facts.js';
import type { FileFacts } from '../../../../../core/facts/index.js';

/** A throwaway project plus the places its facts state and submissions live. */
export interface FactsProject {
  /** Absolute project root, free of symbolic link components. */
  root: string;
  /** A writable directory outside the project, for submission files. */
  outside: string;
  /**
   * Write a file into the project.
   * @param relativePath Project-relative POSIX path.
   * @param contents File body.
   */
  write: (relativePath: string, contents: string) => void;
  /**
   * Write a submission document outside the project.
   * @param name File name.
   * @param body JSON text, or any bytes when testing the guard.
   * @returns Absolute path of the written file.
   */
  submission: (name: string, body: string) => string;
  /**
   * Build a minimal valid record for a file already written.
   * @param relativePath Project-relative POSIX path.
   * @param overrides Fields to replace on the built record.
   * @returns A record whose `contentHash` matches the file on disk.
   */
  facts: (relativePath: string, overrides?: Partial<FileFacts>) => FileFacts;
}

/** Roots created by this helper, removed together by `cleanupFactsProjects`. */
const created: string[] = [];

/**
 * Create a project and a sibling output directory.
 *
 * The temp base is canonicalized by default so a test fails on what it means to
 * check rather than on an incidental platform link — on macOS the runtime
 * spells the temp directory through `/tmp` or `/var`, both symbolic links.
 *
 * `throughSymlink` deliberately gives that property back: the returned root
 * reaches the real directory through a link, which is what a project rooted
 * under macOS `/tmp` or `/var` looks like. Every path filid resolves against the
 * root then has a symlinked ancestor, and a guard that walks ancestors from the
 * filesystem root would refuse the lot. At least one fixture must keep this
 * shape or that whole class of failure goes unseen.
 *
 * `CLAUDE_CONFIG_DIR` decides where the facts store lands, so a caller must
 * point it at a temp directory before exercising the store.
 *
 * @param files - Project-relative POSIX paths mapped to their contents.
 * @param options - `throughSymlink` roots the project behind a symbolic link.
 * @returns The project root, an outside directory and record builders.
 */
export function createFactsProject(
  files: Record<string, string> = {},
  options: { throughSymlink?: boolean } = {},
): FactsProject {
  const base = mkdtempSync(join(realpathSync(tmpdir()), 'filid-facts-'));
  created.push(base);
  const container = options.throughSymlink ? join(base, 'alias') : base;
  if (options.throughSymlink) {
    mkdirSync(join(base, 'real'), { recursive: true });
    symlinkSync(join(base, 'real'), container);
  }
  const root = join(container, 'project');
  const outside = join(container, 'outside');
  mkdirSync(root, { recursive: true });
  mkdirSync(outside, { recursive: true });
  const write = (relativePath: string, contents: string): void => {
    const absolute = join(root, ...relativePath.split('/'));
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, contents);
  };
  for (const [path, contents] of Object.entries(files)) write(path, contents);
  return {
    root,
    outside,
    write,
    submission: (name, body) => {
      const path = join(outside, name);
      writeFileSync(path, body);
      return path;
    },
    facts: (relativePath, overrides = {}) => ({
      schemaVersion: FACTS_SCHEMA_VERSION,
      path: relativePath,
      contentHash: hashOf(join(root, ...relativePath.split('/'))),
      references: [],
      provenance: {
        tool: 'test-extractor',
        version: '1.0.0',
        command: 'test',
        tier: 'tool',
        resolutionInputs: [],
      },
      ...overrides,
    }),
  };
}

/** Remove every project this helper created. */
export function cleanupFactsProjects(): void {
  while (created.length > 0)
    rmSync(created.pop() as string, { recursive: true, force: true });
}

/**
 * Digest a file's bytes the way a facts record spells it.
 * @param absolutePath File to hash.
 * @returns `sha256:<hex>` of the file's contents.
 */
function hashOf(absolutePath: string): string {
  const bytes = readFileSync(absolutePath);
  return `${FACTS_HASH_PREFIX}${createHash('sha256').update(bytes).digest('hex')}`;
}
