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
 * Spell a root for the file its placeholder sits in.
 * @param root Absolute root path.
 * @param intoJson Whether the placeholder sits inside a JSON string literal.
 * @returns The root, with its backslashes escaped when JSON has to parse it.
 */
function spellRoot(root: string, intoJson: boolean): string {
  return intoJson ? JSON.stringify(root).slice(1, -1) : root;
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
    const intoJson = target.endsWith('.json');
    writeFileSync(
      target,
      readFileSync(source, 'utf8')
        .replaceAll('<PROJECT_ROOT>', spellRoot(roots.projectRoot, intoJson))
        .replaceAll('<PLUGIN_ROOT>', spellRoot(roots.pluginRoot, intoJson)),
    );
  }
}
