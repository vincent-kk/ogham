import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Result of building a context chain from a file to its boundary */
export interface ChainResult {
  /** Directory containing package.json (boundary) */
  boundary: string;
  /** Ancestor directories from leaf to root */
  chain: string[];
  /** Which directories have INTENT.md */
  intents: Map<string, boolean>;
  /** Which directories have DETAIL.md */
  details: Map<string, boolean>;
}

/**
 * Walk upward from filePath to find the nearest package.json.
 * Returns the directory containing package.json, or null if none found.
 */
export function findBoundary(filePath: string): string | null {
  let dir = resolve(dirname(filePath));

  while (true) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Build a context chain from filePath up to the boundary (nearest package.json).
 * Returns the chain of directories and which ones have INTENT.md/DETAIL.md.
 */
export function buildChain(filePath: string): ChainResult | null {
  const boundary = findBoundary(filePath);
  if (!boundary) return null;

  const chain: string[] = [];
  const intents = new Map<string, boolean>();
  const details = new Map<string, boolean>();

  let dir = resolve(dirname(filePath));

  while (true) {
    chain.push(dir);

    // Check INTENT.md
    const hasIntent = existsSync(join(dir, 'INTENT.md'));
    intents.set(dir, hasIntent);

    // Check DETAIL.md
    const hasDetail = existsSync(join(dir, 'DETAIL.md'));
    details.set(dir, hasDetail);

    if (dir === boundary) break;

    const parent = dirname(dir);
    if (parent === dir) break; // safety: filesystem root
    dir = parent;
  }

  return { boundary, chain, intents, details };
}
