export interface JiraUrlParts {
  issueKey: string;
  projectKey: string;
  focusedCommentId?: string;
}

const BROWSE_PATTERN = /\/(?:jira\/)?browse\/([A-Z][A-Z0-9_]+-\d+)/;

/** Parse a Jira browse URL into structured parts. Returns null for non-Jira URLs. */
export function parseJiraUrl(url: string): JiraUrlParts | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const match = parsed.pathname.match(BROWSE_PATTERN);
  if (!match) return null;

  const issueKey = match[1];
  const projectKey = issueKey.split('-')[0];

  const focusedCommentId =
    parsed.searchParams.get('focusedCommentId') ??
    parsed.searchParams.get('focusedId') ??
    undefined;

  return { issueKey, projectKey, focusedCommentId };
}
