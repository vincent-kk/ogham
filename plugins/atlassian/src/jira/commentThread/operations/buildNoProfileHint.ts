/** Skill section the hint points at — loaded by the jira skill; renaming that heading or moving the file must update this string (INTENT.md, Conventions). */
const CLUE_CHECK_PATH = 'skills/jira/tools/comment/schema.md → "Thread clues"';

/**
 * Compose the `hint` returned when a site has no reply-plugin profile.
 * @param hostname Site the missing profile would be keyed by.
 * @param issue Issue just read; the probe sample the skill may reuse.
 * @param rootCount Standard comments returned — zero means a probe has nothing to observe.
 * @returns Evidence plus the pointer to the skill's clue check — declarative only; the decision rule lives in the skill, never in this string.
 */
export function buildNoProfileHint(
  hostname: string,
  issue: string,
  rootCount: number,
): string {
  const evidence = `No reply-plugin profile for ${hostname}: standard comments only (${rootCount} root comment(s) returned).`;
  const rule = `Decision rule: ${CLUE_CHECK_PATH}.`;
  if (rootCount === 0)
    return `${evidence} Nothing to probe on ${issue} (no root comment). ${rule}`;
  return `${evidence} Probe sample_issue_key "${issue}" (read-only). ${rule}`;
}
