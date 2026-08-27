import { createHash } from "node:crypto";

import type { CommentProfile } from "../../../types/index.js";

/**
 * Bind a proposal to a site so `save_profile` can only store what `probe` proposed.
 * @returns sha256 hex of the canonical JSON `{hostname, pattern, propertyKeys(sorted)}`; `verifiedAt` is excluded on purpose.
 */
export function digestProposal(
  hostname: string,
  profile: Pick<CommentProfile, "pattern" | "propertyKeys">,
): string {
  const canonical = JSON.stringify({
    hostname,
    pattern: profile.pattern,
    propertyKeys: [...profile.propertyKeys].sort(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}
