import type { Db } from "../../../../types/enums.js";
import type {
  SearchManifest,
  ManifestQuery,
  CapEvent,
} from "../../../../types/index.js";
import type {
  PerQueryResult,
  ReproducibilityRef,
} from "../../../../types/tool.js";
import { SearchManifestSchema } from "../../../../types/manifest.js";
import { writeJson } from "../../../../lib/fileIo.js";
import { sha256Hex } from "../../../../utils/sha256.js";
import { isoNow } from "../../../../utils/isoNow.js";
import { manifestPath } from "../../../../constants/paths.js";
import { SEARCH_PLAN_VERSION } from "../../../../constants/defaults.js";
import { VERSION } from "../../../../version.js";

export interface WriteManifestParams {
  db: Db;
  baseUrl: string;
  perQuery: PerQueryResult[];
  unionUnique: number;
  unionPmids: string[];
  caps: CapEvent[];
  warnings: string[];
  apiKeyUsed: boolean;
  batchSize: number;
  webEnv?: string;
  queryKey?: string;
  nowMs?: number;
  manifestDir?: string;
}

/**
 * Build and persist the SearchManifest, returning the reproducibility ref. The
 * fetched-PMID checksum (sorted) is the primary replay anchor — identical input
 * yields an identical checksum (and manifest path), independent of timestamp.
 */
export async function writeManifest(
  params: WriteManifestParams,
): Promise<ReproducibilityRef> {
  const sortedPmids = [...params.unionPmids].sort();
  const checksum = `sha256:${sha256Hex(sortedPmids.join(","))}`;

  const queries: ManifestQuery[] = params.perQuery.map((p) => ({
    role: p.query_role,
    term: p.query,
    translation: p.translation,
    count: p.count,
    capped: p.capped,
  }));
  const perQueryCounts: Record<string, number> = {};
  for (const p of params.perQuery) perQueryCounts[p.query] = p.count;

  const manifest: SearchManifest = {
    pluginVersion: VERSION,
    baseUrl: params.baseUrl,
    db: params.db,
    queries,
    counts: { perQuery: perQueryCounts, unionUnique: params.unionUnique },
    timestamp: isoNow(params.nowMs),
    paging: { retmax: 10000, retstart: 0, batchSize: params.batchSize },
    apiKeyUsed: params.apiKeyUsed,
    history:
      params.webEnv && params.queryKey
        ? { webEnv: params.webEnv, queryKey: params.queryKey }
        : undefined,
    fetchedPmidChecksum: checksum,
    caps: params.caps,
    warnings: params.warnings,
  };

  const validated = SearchManifestSchema.parse(manifest);
  const path = params.manifestDir
    ? `${params.manifestDir}/${checksum.replace(":", "_")}.json`
    : manifestPath(checksum.replace(":", "_"));
  await writeJson(path, validated, { mode: 0o600 });

  return {
    manifestPath: path,
    searchPlanVersion: SEARCH_PLAN_VERSION,
    fetchedPmidChecksum: checksum,
    webEnv: params.webEnv,
    queryKey: params.queryKey,
  };
}
