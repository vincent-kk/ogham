/**
 * @file tool.ts
 * @description MCP tool I/O contracts. Input schemas are zod (reused as
 * `registerTool` inputSchema and for validation); outputs are interfaces.
 */
import { z } from "zod";

import {
  DbSchema,
  FetchModeSchema,
  CapStrategySchema,
  DateFieldSchema,
  DateTypeSchema,
  QueryRoleSchema,
  BreadthSchema,
  RecordFieldSchema,
  SortOrderSchema,
  FulltextFormatSchema,
} from "./enumSchemas.js";
import type { UnionResult, DateSegment } from "./search.js";
import type { JobStatus, RateLimit, MeshMatch, ErrorCode } from "./enums.js";

/* ── paper_search ─────────────────────────────────────────────── */

export const SearchQuerySchema = z.object({
  term: z.string().min(1),
  role: QueryRoleSchema,
  breadth: BreadthSchema.optional(),
  rationale: z.string().optional(),
  seedPmids: z.array(z.string()).optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchDateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: DateTypeSchema.optional(),
});
export type SearchDateRange = z.infer<typeof SearchDateRangeSchema>;

export const PaperSearchInputSchema = z.object({
  queries: z.array(SearchQuerySchema).min(1),
  db: DbSchema.optional(),
  fetchMode: FetchModeSchema.optional(),
  capStrategy: CapStrategySchema.optional(),
  dateRange: SearchDateRangeSchema.optional(),
  dateField: DateFieldSchema.optional(),
  maxRecords: z.number().int().positive().optional(),
  batchSize: z.number().int().positive().optional(),
  fields: z.array(RecordFieldSchema).optional(),
  sort: SortOrderSchema.optional(),
  includeQueryTranslation: z.boolean().optional(),
  cursor: z.string().optional(),
});
export type PaperSearchInput = z.infer<typeof PaperSearchInputSchema>;

export interface PerQueryResult {
  query: string;
  query_role: SearchQuery["role"];
  count: number;
  translation?: string;
  capped: boolean;
  segmented: boolean;
  retrieved: number;
}

export interface SearchWarning {
  code: string;
  message: string;
  query_role?: SearchQuery["role"];
}

export interface SearchError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  query?: string;
}

export interface FailedBatch {
  retstart: number;
  retmax: number;
  pmidCount: number;
  reason: string;
}

export interface ReproducibilityRef {
  manifestPath: string;
  searchPlanVersion: string;
  fetchedPmidChecksum: string;
  webEnv?: string;
  queryKey?: string;
}

export interface PaperSearchOutput {
  per_query: PerQueryResult[];
  union: UnionResult;
  segments: DateSegment[];
  warnings: SearchWarning[];
  errors: SearchError[];
  partial: boolean;
  missing_pmids: string[];
  failed_batches: FailedBatch[];
  reproducibility: ReproducibilityRef;
  cursor?: string;
}

export const PaperSearchStartInputSchema = PaperSearchInputSchema;
export interface PaperSearchStartOutput {
  jobId: string;
  status: JobStatus;
  estimate?: { totalCount: number; segments: number };
}

export const PaperSearchStatusInputSchema = z.object({ jobId: z.string() });
export interface PaperSearchStatusOutput {
  jobId: string;
  status: JobStatus;
  progress?: { fetched: number; total: number; currentSegment?: number; segments: number };
  partial?: boolean;
  error?: SearchError;
}

export const PaperSearchResultsInputSchema = z.object({
  jobId: z.string(),
  cursor: z.string().optional(),
});

/* ── mesh_lookup ──────────────────────────────────────────────── */

export const MeshLookupInputSchema = z.object({
  terms: z.array(z.string().min(1)).min(1),
  includeScopeNote: z.boolean().optional(),
  includeScr: z.boolean().optional(),
});
export type MeshLookupInput = z.infer<typeof MeshLookupInputSchema>;

export interface ScrMapping {
  scrName: string;
  scrUi: string;
  mappedDescriptors: string[];
}

export interface MeshMapping {
  input: string;
  matched: MeshMatch;
  descriptorName?: string;
  descriptorUi?: string;
  treeNumbers?: string[];
  entryTerms?: string[];
  scopeNote?: string;
  scrMappings?: ScrMapping[];
}

export interface MeshLookupOutput {
  mappings: MeshMapping[];
}

/* ── fetch_fulltext ───────────────────────────────────────────── */

export const FetchFulltextInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  formats: z.array(FulltextFormatSchema).optional(),
  outDir: z.string().optional(),
  overwrite: z.boolean().optional(),
});
export type FetchFulltextInput = z.infer<typeof FetchFulltextInputSchema>;

export interface DownloadedItem {
  pmcid: string;
  pmid?: string;
  format: z.infer<typeof FulltextFormatSchema>;
  path: string;
  sha256: string;
  bytes: number;
  oaStatus: string;
  license?: string;
}

export interface UnavailableItem {
  id: string;
  reason: string;
  format?: z.infer<typeof FulltextFormatSchema>;
  links: { doi?: string; publisher?: string };
}

export interface FetchFulltextOutput {
  downloaded: DownloadedItem[];
  unavailable: UnavailableItem[];
}

/* ── auth-check ───────────────────────────────────────────────── */

export const AuthCheckInputSchema = z.object({
  probeEInfo: z.boolean().optional(),
});
export type AuthCheckInput = z.infer<typeof AuthCheckInputSchema>;

export interface AuthCheckOutput {
  configured: boolean;
  reachable: boolean;
  hasApiKey: boolean;
  rateLimit: RateLimit;
  toolEmailConfigured: boolean;
  dbList?: string[];
}
