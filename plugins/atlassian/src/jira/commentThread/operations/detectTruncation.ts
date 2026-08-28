import type { JiraChangelog } from "./wire.js";

/**
 * Compare `total` with the histories actually returned.
 * @returns `known: false` when `total` is absent (no verdict possible); otherwise whether histories are missing and how many.
 */
export function detectTruncation(changelog: JiraChangelog | undefined): {
  known: boolean;
  truncated: boolean;
  missing: number;
} {
  if (!changelog || typeof changelog.total !== "number")
    return { known: false, truncated: false, missing: 0 };
  const have = changelog.histories?.length ?? 0;
  const missing = Math.max(0, changelog.total - have);
  return { known: true, truncated: missing > 0, missing };
}
