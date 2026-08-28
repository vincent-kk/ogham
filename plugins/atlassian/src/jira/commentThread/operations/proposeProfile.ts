import {
  PropertyKeySchema,
  type CommentProfile,
  type ProbeEvidence,
} from "../../../types/index.js";
import { REPLY_PROPERTY_KEY_PATTERN } from "./patterns.js";

export { REPLY_PROPERTY_KEY_PATTERN } from "./patterns.js";

/**
 * Turn probe evidence into a profile proposal.
 * @param evidence Observations from the sample issue.
 * @param now Timestamp for `verifiedAt` (the save step overwrites it).
 * @returns A `changelog` proposal when `Comment` items exist (propertyKeys may be empty), otherwise `null` with the reason.
 */
export function proposeProfile(
  evidence: ProbeEvidence,
  now: Date,
): { proposal: CommentProfile | null; reason: string } {
  if (evidence.commentItems === 0)
    return {
      proposal: null,
      reason:
        'no Comment changelog items on the sample issue — the changelog pattern was not observed. If replies are visible in the standard API, save { pattern: "standard", propertyKeys: [] } instead.',
    };
  const usablePropertyKeys = [
    ...new Set(
      evidence.propertyKeys.filter(
        (key) =>
          PropertyKeySchema.safeParse(key).success &&
          REPLY_PROPERTY_KEY_PATTERN.test(key),
      ),
    ),
  ].sort();
  const propertyKeys = usablePropertyKeys.slice(0, 8);
  const ignoredCount = evidence.propertyKeys.length - propertyKeys.length;
  const ignoredReason =
    ignoredCount > 0
      ? `; ${ignoredCount} invalid, duplicate, or excess key(s) ignored`
      : "";
  return {
    proposal: {
      pattern: "changelog",
      propertyKeys,
      verifiedAt: now.toISOString(),
    },
    reason:
      propertyKeys.length > 0
        ? `${evidence.commentItems} Comment item(s) across ${evidence.distinctRoots} root comment(s); reply property key(s): ${propertyKeys.join(", ")}${ignoredReason}`
        : `${evidence.commentItems} Comment item(s) found but no reply-like property key — nesting/deleted corrections will be unavailable${ignoredReason}`,
  };
}
