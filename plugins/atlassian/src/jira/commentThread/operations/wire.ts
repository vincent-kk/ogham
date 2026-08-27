/** Subset of `GET /rest/api/2/issue/{key}/comment` items the recipe reads. */
export interface JiraComment {
  id: string;
  author?: { displayName?: string; name?: string };
  created: string;
  body?: string;
  renderedBody?: string;
}

/** Subset of one Jira changelog item used to identify a reply root and body. */
export interface JiraChangeItem {
  field?: string;
  to?: string | number | null;
  toString?: string | null;
}

/** Subset of a Jira changelog history containing one or more change items. */
export interface JiraHistory {
  id: string;
  author?: { displayName?: string; name?: string };
  created: string;
  items?: JiraChangeItem[];
}

/** `issue.changelog` from `expand=changelog`; `total` is absent on some builds. */
export interface JiraChangelog {
  startAt?: number;
  maxResults?: number;
  total?: number;
  histories?: JiraHistory[];
}

/** One reply recovered from a `Comment` change item. */
export interface ReplyCandidate {
  id: string;
  rootId: string;
  author: string;
  created: string;
  body: string;
}

/** The last-reply snapshot a root comment's entity property carries. */
export interface ReplyProperty {
  parentThreadId: string | null;
  deleted: boolean;
  lastBody: string | null;
}
