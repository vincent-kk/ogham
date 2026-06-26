import { FetchMode } from "../../../types/enums.js";
import type { PaperRecord } from "../../../types/record.js";
import type {
  UnionResult,
  DateSegment,
  CapEvent,
} from "../../../types/index.js";
import type {
  PaperSearchInput,
  PaperSearchOutput,
  PerQueryResult,
  SearchWarning,
  SearchError,
  FailedBatch,
} from "../../../types/tool.js";
import type { ToolContext } from "../../shared/index.js";
import { mergeRecords } from "../../../core/union/index.js";
import {
  DEFAULT_FETCH_MODE,
  DEFAULT_BATCH_SIZE,
} from "../../../constants/defaults.js";
import { Messages } from "../../../constants/messages.js";
import { executeQuery } from "./operations/executeQuery.js";
import { fetchMetadata } from "./operations/fetchMetadata.js";
import { writeManifest } from "./operations/writeManifest.js";

const MAX_RECORDS_CODE = "MAX_RECORDS";

function stub(
  pmid: string,
  term: string,
  role: PerQueryResult["query_role"],
): PaperRecord {
  return { pmid, title: "", authors: [], hit_by: [term], query_role: [role] };
}

/**
 * Deterministic paper_search orchestration:
 * lint → count probe → date segment → fetch ids → union/dedup → fetch records
 * (batched, partial recovery) → manifest. Zero-loss is the contract: the LLM
 * never decides what to drop.
 */
export async function runPaperSearch(
  input: PaperSearchInput,
  ctx: ToolContext,
): Promise<PaperSearchOutput> {
  const per_query: PerQueryResult[] = [];
  const segments: DateSegment[] = [];
  const warnings: SearchWarning[] = [];
  const errors: SearchError[] = [];
  const caps: CapEvent[] = [];
  const stubs: PaperRecord[] = [];

  for (const query of input.queries) {
    const r = await executeQuery(query, ctx, input);
    per_query.push(r.perQuery);
    warnings.push(...r.warnings);
    if (r.error) errors.push(r.error);
    if (r.capEvent) caps.push(r.capEvent);
    segments.push(...r.segments);
    for (const pmid of r.ids) stubs.push(stub(pmid, query.term, query.role));
  }

  let union: UnionResult = mergeRecords(stubs);
  let partial = false;

  if (input.maxRecords && union.records.length > input.maxRecords) {
    union = {
      records: union.records.slice(0, input.maxRecords),
      total_unique: input.maxRecords,
      dedup_collisions: union.dedup_collisions,
    };
    partial = true;
    warnings.push({
      code: MAX_RECORDS_CODE,
      message: Messages.BUDGET_EXCEEDED,
    });
  }

  let missing_pmids: string[] = [];
  let failed_batches: FailedBatch[] = [];
  const fetchMode = input.fetchMode ?? DEFAULT_FETCH_MODE;

  if (fetchMode !== FetchMode.IDS_ONLY && union.records.length > 0) {
    const meta = await fetchMetadata(
      union.records.map((r) => r.pmid),
      ctx,
      input,
    );
    union.records = union.records.map((r) => {
      const m = meta.records.get(r.pmid);
      return m ? { ...m, hit_by: r.hit_by, query_role: r.query_role } : r;
    });
    missing_pmids = meta.missing;
    failed_batches = meta.failedBatches;
    if (missing_pmids.length > 0 || failed_batches.length > 0) partial = true;
  }

  const reproducibility = await writeManifest({
    db: input.db ?? ctx.db,
    baseUrl: ctx.baseUrl,
    perQuery: per_query,
    unionUnique: union.total_unique,
    unionPmids: union.records.map((r) => r.pmid),
    caps,
    warnings: warnings.map((w) => w.message),
    apiKeyUsed: Boolean(ctx.credentials.api_key),
    batchSize: input.batchSize ?? DEFAULT_BATCH_SIZE,
    nowMs: ctx.nowMs,
    manifestDir: ctx.manifestDir,
  });

  return {
    per_query,
    union,
    segments,
    warnings,
    errors,
    partial,
    missing_pmids,
    failed_batches,
    reproducibility,
  };
}
