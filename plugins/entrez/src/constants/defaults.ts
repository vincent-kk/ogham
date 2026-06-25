/**
 * @file defaults.ts
 * @description Default values, limits, and E-utilities constraints. The hard
 * search rules (10k cap, auto-POST thresholds, rate limits, budgets) live here
 * so the deterministic service — not the LLM — enforces them.
 */
import {
  Db,
  FetchMode,
  CapStrategy,
  DateField,
  SortOrder,
  RetMode,
} from "../types/enums.js";
import { DOWNLOAD_DIR } from "./paths.js";

/** Base URLs (single-host scope; SSRF allowlist enforces these). */
export const DEFAULT_EUTILS_BASE =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
export const IDCONV_BASE =
  "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/";
export const OA_SERVICE_BASE =
  "https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi";

/** SSRF allowlist hosts. */
export const EUTILS_HOST = "eutils.ncbi.nlm.nih.gov";
export const NCBI_SERVICE_HOST = "www.ncbi.nlm.nih.gov";
export const ALLOWED_HOSTS = [EUTILS_HOST, NCBI_SERVICE_HOST] as const;

/** Defaults derived from enums. */
export const DEFAULT_OUTPUT_DIR = DOWNLOAD_DIR;
export const DEFAULT_DB = Db.PUBMED;
export const DEFAULT_FETCH_MODE = FetchMode.SUMMARY;
export const DEFAULT_CAP_STRATEGY = CapStrategy.DATE_SEGMENT;
export const DEFAULT_DATE_FIELD = DateField.PUBLICATION;
export const DEFAULT_SORT = SortOrder.RELEVANCE;
export const DEFAULT_RETMODE = RetMode.XML;

/** 🔴 E-utilities hard limits. */
export const UID_HARD_CAP = 10_000;
export const COUNT_PROBE_RETMAX = 0;
/** retmax is always explicit; never rely on the NCBI default of 20. */
export const DEFAULT_RETMAX = 10_000;
export const DEFAULT_BATCH_SIZE = 200;
export const MAX_BATCH_SIZE = 500;
/** auto-POST switch thresholds (GET 414 avoidance). */
export const AUTO_POST_ID_THRESHOLD = 200;
export const AUTO_POST_URL_THRESHOLD = 2_000;
/** Recursive date-segmentation depth guard. */
export const MAX_SEGMENT_DEPTH = 6;
/** Max date buckets created per segmentation level. */
export const SEGMENT_MAX_BUCKETS = 12;
/** Default lower bound for segmentation when a query has no date range
 *  (PubMed's earliest records predate 1800; 1781 is a safe floor). */
export const DEFAULT_SEGMENT_FROM_DATE = "1781/01/01";

/** Convergence guards. */
export const RECALL_ITER_MAX = 4;
export const RATE_RETRY_MAX = 5;

/** Rate limits (requests per second). */
export const RATE_LIMIT_NO_KEY_PER_SEC = 3;
export const RATE_LIMIT_WITH_KEY_PER_SEC = 10;

/** HTTP retry / backoff policy. */
export const DEFAULT_TIMEOUT_MS = 30_000;
export const RETRY_MAX_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 1_000;
export const RETRY_BACKOFF_MULTIPLIER = 2;
export const RETRY_MAX_DELAY_MS = 10_000;
export const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504] as const;
export const TOO_MANY_REQUESTS = 429;

/** Operation budget (resource ceiling for the recall loop). */
export const DEFAULT_OPERATION_BUDGET = {
  maxRequests: 300,
  maxRecords: 10_000,
  maxWallMs: 600_000,
} as const;

/** Search plan version stamped into SearchManifest. */
export const SEARCH_PLAN_VERSION = "1.0.0";

/** Setup web server idle auto-shutdown. */
export const SETUP_AUTO_SHUTDOWN_MS = 5 * 60 * 1_000;
