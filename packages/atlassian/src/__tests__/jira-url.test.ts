import { describe, it, expect } from 'vitest';
import { parseJiraUrl } from '../utils/index.js';

describe('parseJiraUrl', () => {
  it('extracts issueKey and projectKey from Cloud URL', () => {
    const result = parseJiraUrl('https://foo.atlassian.net/browse/KAN-27');
    expect(result).toEqual({ issueKey: 'KAN-27', projectKey: 'KAN', focusedCommentId: undefined });
  });

  it('extracts focusedCommentId from query param', () => {
    const result = parseJiraUrl('https://foo.atlassian.net/browse/KAN-27?focusedCommentId=10110');
    expect(result).toEqual({ issueKey: 'KAN-27', projectKey: 'KAN', focusedCommentId: '10110' });
  });

  it('handles focusedId alias', () => {
    const result = parseJiraUrl('https://foo.atlassian.net/browse/KAN-27?focusedId=10110');
    expect(result).toEqual({ issueKey: 'KAN-27', projectKey: 'KAN', focusedCommentId: '10110' });
  });

  it('handles /jira/browse/ path prefix', () => {
    const result = parseJiraUrl('https://jira.company.com/jira/browse/PROJ-123');
    expect(result).toEqual({ issueKey: 'PROJ-123', projectKey: 'PROJ', focusedCommentId: undefined });
  });

  it('handles Server URL without .atlassian.net', () => {
    const result = parseJiraUrl('https://jira.company.com/browse/PROJ-1');
    expect(result).toEqual({ issueKey: 'PROJ-1', projectKey: 'PROJ', focusedCommentId: undefined });
  });

  it('returns null for non-Jira URLs', () => {
    expect(parseJiraUrl('https://google.com')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(parseJiraUrl('not-a-url')).toBeNull();
  });

  it('returns null for Jira URL without issue key', () => {
    expect(parseJiraUrl('https://foo.atlassian.net/')).toBeNull();
  });

  it('prefers focusedCommentId over focusedId when both present', () => {
    const result = parseJiraUrl('https://foo.atlassian.net/browse/KAN-1?focusedCommentId=111&focusedId=222');
    expect(result?.focusedCommentId).toBe('111');
  });
});
