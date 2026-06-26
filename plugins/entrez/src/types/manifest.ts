/**
 * @file manifest.ts
 * @description `SearchManifest` — the reproducibility snapshot every search
 * writes. WebEnv expires (~1h) so `fetchedPmidChecksum` is the primary replay
 * anchor. `api_key` is never recorded — only a usage boolean.
 */
import { z } from "zod";

import {
  DbSchema,
  QueryRoleSchema,
  CapStrategySchema,
  DateFieldSchema,
} from "./enumSchemas.js";

/** One query as executed, with its PubMed translation and count. */
export const ManifestQuerySchema = z.object({
  role: QueryRoleSchema,
  term: z.string(),
  translation: z.string().optional(),
  count: z.number().int(),
  capped: z.boolean(),
});
export type ManifestQuery = z.infer<typeof ManifestQuerySchema>;

/** A 10k-cap event and how it was handled. */
export const CapEventSchema = z.object({
  query_role: QueryRoleSchema,
  count: z.number().int(),
  strategy: CapStrategySchema,
  segments: z.number().int(),
  dateField: DateFieldSchema,
});
export type CapEvent = z.infer<typeof CapEventSchema>;

/** Full reproducibility snapshot (JSON-persisted). */
export const SearchManifestSchema = z.object({
  pluginVersion: z.string(),
  baseUrl: z.string(),
  db: DbSchema,
  queries: z.array(ManifestQuerySchema),
  counts: z.object({
    perQuery: z.record(z.number().int()),
    unionUnique: z.number().int(),
  }),
  timestamp: z.string(),
  paging: z.object({
    retmax: z.number().int(),
    retstart: z.number().int(),
    batchSize: z.number().int(),
  }),
  apiKeyUsed: z.boolean(),
  history: z.object({ webEnv: z.string(), queryKey: z.string() }).optional(),
  fetchedPmidChecksum: z.string(),
  caps: z.array(CapEventSchema),
  warnings: z.array(z.string()),
});
export type SearchManifest = z.infer<typeof SearchManifestSchema>;
