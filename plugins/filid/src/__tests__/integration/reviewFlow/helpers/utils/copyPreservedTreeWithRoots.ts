import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';

/** Values substituted for the placeholders of a preserved review tree. */
export interface PreservedTreeRoots {
  /** Replaces `<PROJECT_ROOT>`. */
  projectRoot: string;
  /** Replaces `<PLUGIN_ROOT>`. */
  pluginRoot: string;
}

/**
 * Copy a preserved fixture file or directory, replacing the root placeholders.
 * @param from Fixture file or directory.
 * @param to Destination path mirroring `from`; missing parents are created.
 * @param roots Placeholder values.
 * @returns Nothing; every copied file is written at its mirrored destination.
 */
export function copyPreservedTreeWithRoots(
  from: string,
  to: string,
  roots: PreservedTreeRoots,
): void {
  const sources = statSync(from).isFile()
    ? [from]
    : readdirSync(from, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => join(entry.parentPath, entry.name));
  for (const source of sources) {
    const target = join(to, relative(from, source));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      readFileSync(source, 'utf8')
        .replaceAll('<PROJECT_ROOT>', roots.projectRoot)
        .replaceAll('<PLUGIN_ROOT>', roots.pluginRoot),
    );
  }
}
