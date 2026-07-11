import { findUnresolvedTokens } from "../../tokens/findUnresolvedTokens.js";
import type { FileMap } from "../../types/output.js";

/**
 * Find emitted skill `.md` files that still contain `{{…}}` tokens after
 * substitution — a typo or an unsupported token, which must fail the build.
 * Scoped to skill files: verbatim assets (e.g. vendored renderer bundles) may
 * legitimately contain `{{` and are not our tokens. Returns `"<path>: <tokens>"`.
 */
export function lintSkillTokens(files: FileMap): string[] {
  const problems: string[] = [];
  for (const [relPath, bytes] of files) {
    if (!relPath.startsWith("skills/") || !relPath.endsWith(".md")) continue;
    const unresolved = findUnresolvedTokens(bytes.toString("utf8"));
    if (unresolved.length)
      problems.push(`${relPath}: ${[...new Set(unresolved)].join(", ")}`);
  }
  return problems;
}
