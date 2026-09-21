import { hashResolutionInput } from './utils/hashResolutionInput.js';

/**
 * Build a hasher for record-declared resolution inputs, memoized per call.
 *
 * A whole-repository batch declares the same handful of manifests thousands of
 * times over, and every distinct path is read exactly once per call. The cache
 * lives only as long as the call, so two calls never disagree about a file that
 * changed between them.
 *
 * @param projectRoot - Absolute project root; a relative declared path resolves
 * against it.
 * @returns A function from declared path to `sha256:<hex>`, or null when filid
 * will not or cannot read that file — which includes a path that is not a plain
 * regular file, so a FIFO or device node is refused rather than waited on.
 */
export function createDeclaredInputHasher(
  projectRoot: string,
): (path: string) => string | null {
  const cache = new Map<string, string | null>();
  return (path: string): string | null => {
    const cached = cache.get(path);
    if (cached !== undefined || cache.has(path)) return cached ?? null;
    const hash = hashResolutionInput(projectRoot, path);
    cache.set(path, hash);
    return hash;
  };
}
