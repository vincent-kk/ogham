import { FetchMode, type Db } from "../../../../types/enums.js";
import type { PaperRecord, Author } from "../../../../types/record.js";
import type { PaperSearchInput, FailedBatch } from "../../../../types/tool.js";
import type { ToolContext } from "../../../shared/index.js";
import { esummary, efetch } from "../../../../adapters/eutils/index.js";
import {
  DEFAULT_FETCH_MODE,
  DEFAULT_BATCH_SIZE,
} from "../../../../constants/defaults.js";

export interface MetadataResult {
  records: Map<string, PaperRecord>;
  missing: string[];
  failedBatches: FailedBatch[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Best-effort split of an ESummary "Last F" author string into structure. */
function splitAuthorName(name: string): Author {
  const trimmed = name.trim();
  const idx = trimmed.lastIndexOf(" ");
  if (idx <= 0) return { lastName: trimmed };
  return { lastName: trimmed.slice(0, idx), initials: trimmed.slice(idx + 1) };
}

async function fetchBatch(
  pmids: string[],
  db: Db,
  fetchMode: FetchMode,
  ctx: ToolContext,
): Promise<PaperRecord[]> {
  if (fetchMode === FetchMode.ABSTRACTS || fetchMode === FetchMode.FULL) {
    return efetch({ db, ids: pmids, baseUrl: ctx.baseUrl }, ctx.deps);
  }
  const summaries = await esummary({ db, ids: pmids, baseUrl: ctx.baseUrl }, ctx.deps);
  return summaries.map((s) => ({
    pmid: s.pmid,
    doi: s.doi,
    pmcid: s.pmcid,
    title: s.title ?? "",
    authors: s.authorNames.map(splitAuthorName),
    journal: s.journal,
    year: s.year,
    hit_by: [],
    query_role: [],
  }));
}

/**
 * Fetch metadata for the union PMIDs in batches, isolating per-batch failures
 * (partial recovery): a failed batch is recorded and its PMIDs marked missing,
 * while successful batches are preserved.
 */
export async function fetchMetadata(
  pmids: string[],
  ctx: ToolContext,
  input: PaperSearchInput,
): Promise<MetadataResult> {
  const db: Db = input.db ?? ctx.db;
  const fetchMode = input.fetchMode ?? DEFAULT_FETCH_MODE;
  const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;

  const records = new Map<string, PaperRecord>();
  const failedBatches: FailedBatch[] = [];
  const batches = chunk(pmids, batchSize);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    try {
      for (const rec of await fetchBatch(batch, db, fetchMode, ctx)) {
        records.set(rec.pmid, rec);
      }
    } catch (error) {
      failedBatches.push({
        retstart: i * batchSize,
        retmax: batchSize,
        pmidCount: batch.length,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const missing = pmids.filter((pmid) => !records.has(pmid));
  return { records, missing, failedBatches };
}
