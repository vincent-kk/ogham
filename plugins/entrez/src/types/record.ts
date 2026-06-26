/**
 * @file record.ts
 * @description `PaperRecord` — the deduped paper record contract. Authors are
 * kept structured (LastName/ForeName/Initials/Collective/ORCID separate); never
 * concatenate into a single string.
 */
import { z } from "zod";

import { QueryRoleSchema, ExpansionSourceSchema } from "./enumSchemas.js";

/** Structured author. Collective = group/consortium author. */
export const AuthorSchema = z.object({
  lastName: z.string().optional(),
  foreName: z.string().optional(),
  initials: z.string().optional(),
  orcid: z.string().optional(),
  collective: z.string().optional(),
});
export type Author = z.infer<typeof AuthorSchema>;

/** Deduped union record. `pmid` is the primary key. */
export const PaperRecordSchema = z.object({
  pmid: z.string(),
  doi: z.string().optional(),
  pmcid: z.string().optional(),
  title: z.string(),
  abstract: z.string().optional(),
  authors: z.array(AuthorSchema),
  journal: z.string().optional(),
  year: z.number().int().optional(),
  mesh: z.array(z.string()).optional(),
  /** Query terms that matched this record (recall attribution). */
  hit_by: z.array(z.string()),
  /** Roles that matched this record. */
  query_role: z.array(QueryRoleSchema),
  expansion_source: ExpansionSourceSchema.optional(),
});
export type PaperRecord = z.infer<typeof PaperRecordSchema>;
