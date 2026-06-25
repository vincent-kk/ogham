/**
 * @file enums.ts
 * @description Single source of truth for every value-set string literal in
 * entrez. All domain strings live here as `as const` objects (or in
 * `constants/*`); inline string literals are forbidden elsewhere. Each enum
 * exports a value object and a matching value-union type of the same name.
 */

/** Search target database (single db family). */
export const Db = {
  PUBMED: "pubmed",
  PMC: "pmc",
  MESH: "mesh",
} as const;
export type Db = (typeof Db)[keyof typeof Db];

/** ESearch result ordering (`sort` param). */
export const SortOrder = {
  RELEVANCE: "relevance",
  PUB_DATE: "pub_date",
  FIRST_AUTHOR: "Author",
  JOURNAL: "JournalName",
} as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

/** `datetype` parameter for date-range filtering. */
export const DateType = {
  PUBLICATION: "pdat",
  ENTREZ: "edat",
  MODIFICATION: "mdat",
} as const;
export type DateType = (typeof DateType)[keyof typeof DateType];

/** Date field tag used for 10k-cap date segmentation. */
export const DateField = {
  PUBLICATION: "dp",
  ENTREZ: "edat",
  CREATED: "crdt",
} as const;
export type DateField = (typeof DateField)[keyof typeof DateField];

/** PaperRecord field keys (projection selector). */
export const RecordField = {
  PMID: "pmid",
  DOI: "doi",
  PMCID: "pmcid",
  TITLE: "title",
  ABSTRACT: "abstract",
  AUTHORS: "authors",
  JOURNAL: "journal",
  YEAR: "year",
  MESH: "mesh",
  HIT_BY: "hit_by",
  QUERY_ROLE: "query_role",
  EXPANSION_SOURCE: "expansion_source",
} as const;
export type RecordField = (typeof RecordField)[keyof typeof RecordField];

/** Role of a generated query in the recall spectrum. */
export const QueryRole = {
  ATM_BROAD: "ATM_BROAD",
  MESH_EXPLODED: "MESH_EXPLODED",
  MESH_NOEXP: "MESH_NOEXP",
  TIAB_SYNONYM: "TIAB_SYNONYM",
  ALL_FIELDS: "ALL_FIELDS",
  SIMILAR: "SIMILAR",
} as const;
export type QueryRole = (typeof QueryRole)[keyof typeof QueryRole];

/** Query breadth (recall gate input). */
export const Breadth = {
  BROAD: "BROAD",
  MEDIUM: "MEDIUM",
  NARROW: "NARROW",
} as const;
export type Breadth = (typeof Breadth)[keyof typeof Breadth];

/** MeSH match kind for a looked-up term. */
export const MeshMatch = {
  DESCRIPTOR: "DESCRIPTOR",
  SCR: "SCR",
  ENTRY_TERM: "ENTRY_TERM",
  NONE: "NONE",
} as const;
export type MeshMatch = (typeof MeshMatch)[keyof typeof MeshMatch];

/** Full-text download format. */
export const FulltextFormat = {
  PDF: "pdf",
  XML: "xml",
  TAR: "tgz",
} as const;
export type FulltextFormat = (typeof FulltextFormat)[keyof typeof FulltextFormat];

/** Reason a full text could not be provided. */
export const UnavailableReason = {
  NO_PMCID: "NO_PMCID",
  NOT_OA: "NOT_OA",
  NOT_FOUND: "NOT_FOUND",
  FETCH_FAILED: "FETCH_FAILED",
  LICENSE_UNVERIFIED: "LICENSE_UNVERIFIED",
} as const;
export type UnavailableReason =
  (typeof UnavailableReason)[keyof typeof UnavailableReason];

/** Open-access status from oa.fcgi. */
export const OaStatus = {
  OPEN_ACCESS: "open_access",
  NOT_OPEN_ACCESS: "not_open_access",
  UNKNOWN: "unknown",
} as const;
export type OaStatus = (typeof OaStatus)[keyof typeof OaStatus];

/** Effective NCBI rate limit (derived from api_key presence). */
export const RateLimit = {
  NO_KEY: "no_key",
  WITH_KEY: "with_key",
} as const;
export type RateLimit = (typeof RateLimit)[keyof typeof RateLimit];

/** E-utility function name (adapter assembly). */
export const EutilFn = {
  ESEARCH: "esearch",
  EFETCH: "efetch",
  ESUMMARY: "esummary",
  ESPELL: "espell",
  ELINK: "elink",
  EINFO: "einfo",
} as const;
export type EutilFn = (typeof EutilFn)[keyof typeof EutilFn];

/** `retmode` parameter. */
export const RetMode = {
  XML: "xml",
  JSON: "json",
} as const;
export type RetMode = (typeof RetMode)[keyof typeof RetMode];

/** HTTP method (auto-POST switch). */
export const HttpMethod = {
  GET: "GET",
  POST: "POST",
} as const;
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

/** PubMed field tags for code-side query assembly. */
export const FieldTag = {
  MESH: "mh",
  MESH_NOEXP: "mh:noexp",
  TIAB: "tiab",
  ALL: "all",
  TITLE: "ti",
  ABSTRACT: "ab",
  TITLE_WORD: "tw",
} as const;
export type FieldTag = (typeof FieldTag)[keyof typeof FieldTag];

/** Record collection depth. */
export const FetchMode = {
  IDS_ONLY: "IDS_ONLY",
  SUMMARY: "SUMMARY",
  ABSTRACTS: "ABSTRACTS",
  FULL: "FULL",
} as const;
export type FetchMode = (typeof FetchMode)[keyof typeof FetchMode];

/** Strategy when ESearch Count exceeds the 10,000 UID cap. */
export const CapStrategy = {
  WARN: "WARN",
  DATE_SEGMENT: "DATE_SEGMENT",
  ABORT: "ABORT",
} as const;
export type CapStrategy = (typeof CapStrategy)[keyof typeof CapStrategy];

/** Async job status. */
export const JobStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  PARTIAL: "partial",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** Source of an expansion-derived record. */
export const ExpansionSource = {
  SIMILAR_ARTICLES: "similar_articles",
} as const;
export type ExpansionSource =
  (typeof ExpansionSource)[keyof typeof ExpansionSource];

/** Dispatcher intent classification. */
export const IntentType = {
  FULL_SEARCH: "FULL_SEARCH",
  QUERY_ONLY: "QUERY_ONLY",
  DOWNLOAD: "DOWNLOAD",
  NEEDS_CLARIFICATION: "NEEDS_CLARIFICATION",
} as const;
export type IntentType = (typeof IntentType)[keyof typeof IntentType];

/** Dispatcher execution mode. */
export const ExecutionMode = {
  INTERACTIVE: "interactive",
  AUTO: "auto",
} as const;
export type ExecutionMode = (typeof ExecutionMode)[keyof typeof ExecutionMode];

/** Standard error codes surfaced in tool output. */
export const ErrorCode = {
  NOT_CONFIGURED: "NOT_CONFIGURED",
  INVALID_QUERY: "INVALID_QUERY",
  CAP_EXCEEDED: "CAP_EXCEEDED",
  RATE_LIMITED: "RATE_LIMITED",
  NETWORK_ERROR: "NETWORK_ERROR",
  SSRF_BLOCKED: "SSRF_BLOCKED",
  EUTILS_ERROR: "EUTILS_ERROR",
  PARSE_ERROR: "PARSE_ERROR",
  TIMEOUT: "TIMEOUT",
  NOT_FOUND: "NOT_FOUND",
  WEBENV_EXPIRED: "WEBENV_EXPIRED",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  JOB_NOT_FOUND: "JOB_NOT_FOUND",
  PATH_TRAVERSAL: "PATH_TRAVERSAL",
  LICENSE_UNVERIFIED: "LICENSE_UNVERIFIED",
  UNKNOWN: "UNKNOWN",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
