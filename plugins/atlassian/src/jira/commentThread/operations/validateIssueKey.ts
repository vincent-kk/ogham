import { ISSUE_KEY_PATTERN } from "./patterns.js";

/** Normalize a Jira issue key while rejecting path traversal and malformed values. */
export function validateIssueKey(raw: string): string {
  const issueKey = raw.trim();
  if (!ISSUE_KEY_PATTERN.test(issueKey))
    throw new Error("issue_key must look like PROJ-123");
  return issueKey.toUpperCase();
}
