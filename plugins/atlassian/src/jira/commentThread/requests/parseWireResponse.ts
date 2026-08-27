import type {
  JiraChangeItem,
  JiraChangelog,
  JiraComment,
  JiraHistory,
} from "../operations/wire.js";

/** A validated comment-list response body. */
export interface CommentPageData {
  /** Comments returned in this page. */
  comments: JiraComment[];
  /** Server-reported total when present. */
  total: number | undefined;
}

/** One validated issue from an expanded search response. */
export interface SearchIssueData {
  /** Jira issue key. */
  key: string;
  /** Expanded changelog when Jira returned one. */
  changelog?: JiraChangelog;
}

/** A validated expanded-search response body. */
export interface SearchPageData {
  /** Issues returned in this page. */
  issues: SearchIssueData[];
  /** Server-reported total when present. */
  total: number | undefined;
}

/** Result of distinguishing an omitted changelog from a malformed one. */
export type ChangelogEnvelopeResult =
  | { kind: "valid"; changelog: JiraChangelog }
  | { kind: "missing" }
  | { kind: "malformed" };

/**
 * Validate a successful comment-list body.
 * @param value Untrusted response data.
 * @returns The narrowed page, or `null` when any consumed field has the wrong shape.
 */
export function parseCommentPageData(value: unknown): CommentPageData | null {
  if (!isRecord(value) || !Array.isArray(value.comments)) return null;
  const comments: JiraComment[] = [];
  for (const item of value.comments) {
    const comment = parseComment(item);
    if (comment === null) return null;
    comments.push(comment);
  }
  const total = parseOptionalCount(value.total);
  if (total === null) return null;
  return { comments, total };
}

/**
 * Validate a successful expanded-search body.
 * @param value Untrusted response data.
 * @returns The narrowed page, or `null` when any consumed field has the wrong shape.
 */
export function parseSearchPageData(value: unknown): SearchPageData | null {
  if (!isRecord(value) || !Array.isArray(value.issues)) return null;
  const issues: SearchIssueData[] = [];
  for (const item of value.issues) {
    if (!isRecord(item) || typeof item.key !== "string") return null;
    if (item.changelog === undefined) {
      issues.push({ key: item.key });
      continue;
    }
    const changelog = parseJiraChangelog(item.changelog);
    if (changelog === null) return null;
    issues.push({ key: item.key, changelog });
  }
  const total = parseOptionalCount(value.total);
  if (total === null) return null;
  return { issues, total };
}

/**
 * Validate the `changelog` member of a successful issue response.
 * @param value Untrusted response data.
 * @returns A result that preserves the difference between missing and malformed data.
 */
export function parseChangelogEnvelope(
  value: unknown,
): ChangelogEnvelopeResult {
  if (!isRecord(value)) return { kind: "malformed" };
  if (!("changelog" in value)) return { kind: "missing" };
  const changelog = parseJiraChangelog(value.changelog);
  return changelog === null
    ? { kind: "malformed" }
    : { kind: "valid", changelog };
}

/**
 * Validate the changelog subset consumed by thread reconstruction.
 * @param value Untrusted changelog value.
 * @returns A normalized changelog, or `null` for an incompatible shape.
 */
export function parseJiraChangelog(value: unknown): JiraChangelog | null {
  if (!isRecord(value)) return null;
  const startAt = parseOptionalCount(value.startAt);
  const maxResults = parseOptionalCount(value.maxResults);
  const total = parseOptionalCount(value.total);
  if (startAt === null || maxResults === null || total === null) return null;
  if (value.histories !== undefined && !Array.isArray(value.histories))
    return null;
  const histories: JiraHistory[] = [];
  for (const item of value.histories ?? []) {
    const history = parseHistory(item);
    if (history === null) return null;
    histories.push(history);
  }
  return { startAt, maxResults, total, histories };
}

/**
 * Validate one comment and discard response fields the recipe does not consume.
 * @param value Untrusted comment value.
 * @returns A narrowed comment, or `null` for an incompatible shape.
 */
function parseComment(value: unknown): JiraComment | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.created !== "string" ||
    !isOptionalString(value.body) ||
    !isOptionalString(value.renderedBody)
  )
    return null;
  const author = parseAuthor(value.author);
  if (author === null) return null;
  return {
    id: value.id,
    created: value.created,
    ...(author === undefined ? {} : { author }),
    ...(value.body === undefined ? {} : { body: value.body }),
    ...(value.renderedBody === undefined
      ? {}
      : { renderedBody: value.renderedBody }),
  };
}

/**
 * Validate one changelog history.
 * @param value Untrusted history value.
 * @returns A narrowed history, or `null` for an incompatible shape.
 */
function parseHistory(value: unknown): JiraHistory | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.created !== "string" ||
    (value.items !== undefined && !Array.isArray(value.items))
  )
    return null;
  const author = parseAuthor(value.author);
  if (author === null) return null;
  const items: JiraChangeItem[] = [];
  for (const item of value.items ?? []) {
    const parsed = parseChangeItem(item);
    if (parsed === null) return null;
    items.push(parsed);
  }
  return {
    id: value.id,
    created: value.created,
    ...(author === undefined ? {} : { author }),
    items,
  };
}

/**
 * Validate one changelog item.
 * @param value Untrusted item value.
 * @returns A narrowed item, or `null` for an incompatible shape.
 */
function parseChangeItem(value: unknown): JiraChangeItem | null {
  const rawToString =
    isRecord(value) && Object.prototype.hasOwnProperty.call(value, "toString")
      ? value.toString
      : undefined;
  if (
    !isRecord(value) ||
    !isOptionalString(value.field) ||
    !isOptionalStringOrNumberOrNull(value.to) ||
    !isOptionalStringOrNull(rawToString)
  )
    return null;
  return {
    ...(value.field === undefined ? {} : { field: value.field }),
    ...(value.to === undefined ? {} : { to: value.to }),
    toString: rawToString ?? null,
  };
}

/**
 * Validate an optional Jira author.
 * @param value Untrusted author value.
 * @returns A narrowed author, `undefined` when absent, or `null` when malformed.
 */
function parseAuthor(
  value: unknown,
): { displayName?: string; name?: string } | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (
    !isRecord(value) ||
    !isOptionalString(value.displayName) ||
    !isOptionalString(value.name)
  )
    return null;
  return {
    ...(value.displayName === undefined
      ? {}
      : { displayName: value.displayName }),
    ...(value.name === undefined ? {} : { name: value.name }),
  };
}

/**
 * Parse an optional nonnegative integer count.
 * @param value Untrusted count value.
 * @returns The count, `undefined` when absent, or `null` when malformed.
 */
function parseOptionalCount(value: unknown): number | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * Test for a non-null record.
 * @param value Value to inspect.
 * @returns Whether string-keyed property access is valid.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Test an optional string field.
 * @param value Value to inspect.
 * @returns Whether the field is absent or a string.
 */
function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

/**
 * Test an optional nullable string field.
 * @param value Value to inspect.
 * @returns Whether the field is absent, null, or a string.
 */
function isOptionalStringOrNull(
  value: unknown,
): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

/**
 * Test the wire alternatives accepted for a changelog target.
 * @param value Value to inspect.
 * @returns Whether the field is absent, null, a string, or a finite number.
 */
function isOptionalStringOrNumberOrNull(
  value: unknown,
): value is string | number | null | undefined {
  return (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}
