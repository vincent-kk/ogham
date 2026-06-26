/**
 * @file config.ts
 * @description Zod schemas for entrez configuration and credentials. Secret
 * (`api_key`) and non-secret settings live in separate files on disk
 * (config.json / credentials.json); these schemas validate both.
 */
import { z } from "zod";

import { Db } from "./enums.js";
import { DbSchema, RateLimitSchema } from "./enumSchemas.js";
import {
  DEFAULT_EUTILS_BASE,
  DEFAULT_OUTPUT_DIR,
} from "../constants/defaults.js";

/** Non-secret configuration (config.json). */
export const EntrezConfigSchema = z.object({
  tool: z.string().min(1),
  email: z.string().email(),
  default_db: DbSchema.default(Db.PUBMED),
  base_url: z.string().url().default(DEFAULT_EUTILS_BASE),
  output_path: z.string().default(DEFAULT_OUTPUT_DIR),
  date_tag: z.boolean().default(true),
  rate_limit: RateLimitSchema.optional(),
  /**
   * Optional relative search window in days. When set, searches that don't
   * carry their own date range default to "run date − N days … run date"
   * (filtered by PubMed entry date). Unset = no limit, to preserve recall.
   */
  default_window_days: z.number().int().positive().optional(),
});
export type EntrezConfig = z.infer<typeof EntrezConfigSchema>;
/** Input shape (defaults optional) — what setup/save accept before parsing. */
export type EntrezConfigInput = z.input<typeof EntrezConfigSchema>;

/** Secret configuration (credentials.json, 0o600). LLM never reads this. */
export const EntrezCredentialsSchema = z.object({
  api_key: z.string().min(1).optional(),
});
export type EntrezCredentials = z.infer<typeof EntrezCredentialsSchema>;
