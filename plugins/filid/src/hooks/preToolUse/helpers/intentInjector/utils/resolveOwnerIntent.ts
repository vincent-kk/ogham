/**
 * Locate the fractal that owns a directory: the nearest directory in the
 * chain (fileDir first, then its ancestors) whose INTENT.md presence the
 * chain already recorded. The hook only needs to know that an owner exists
 * and where — it never reads the document body; the agent does.
 * @param fileDir Absolute directory of the visited file (equals chain[0]).
 * @param chain Ancestor directories from fileDir up to the boundary.
 * @param intents INTENT.md presence per chain directory, as built by buildChain.
 * @returns `hasOwner` — an INTENT.md governs this directory; `ownerDir` — the owning directory, or fileDir when none was found.
 */
export function resolveOwnerIntent(
  fileDir: string,
  chain: string[],
  intents: Map<string, boolean>,
): { hasOwner: boolean; ownerDir: string } {
  for (const dir of chain)
    if (intents.get(dir)) return { hasOwner: true, ownerDir: dir };
  return { hasOwner: false, ownerDir: fileDir };
}
