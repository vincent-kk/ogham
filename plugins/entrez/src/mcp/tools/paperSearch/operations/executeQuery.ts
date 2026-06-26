import {
  CapStrategy,
  DateType,
  ErrorCode,
  type Db,
} from "../../../../types/enums.js";
import type {
  SearchQuery,
  SearchDateRange,
  PaperSearchInput,
  PerQueryResult,
  SearchWarning,
  SearchError,
} from "../../../../types/tool.js";
import type { DateSegment, CapEvent } from "../../../../types/index.js";
import type { ToolContext } from "../../../shared/index.js";
import { lintQuery } from "../../../../core/queryLint/index.js";
import {
  planSegments,
  type CountFn,
} from "../../../../core/segmenter/index.js";
import { esearch } from "../../../../adapters/eutils/index.js";
import {
  UID_HARD_CAP,
  DEFAULT_CAP_STRATEGY,
  DEFAULT_DATE_FIELD,
  DEFAULT_SEGMENT_FROM_DATE,
} from "../../../../constants/defaults.js";
import { Messages } from "../../../../constants/messages.js";

const WARN_CODE = {
  CAP_WARN: "CAP_WARN",
  SEGMENT_CAPPED: "SEGMENT_CAPPED",
} as const;

export interface ExecuteQueryResult {
  perQuery: PerQueryResult;
  ids: string[];
  segments: DateSegment[];
  capEvent?: CapEvent;
  warnings: SearchWarning[];
  error?: SearchError;
}

/** Build a date-bounded PubMed term: `(term) AND ("from"[field] : "to"[field])`. */
function datedTerm(
  term: string,
  field: string,
  from: string,
  to: string,
): string {
  return `(${term}) AND ("${from}"[${field}] : "${to}"[${field}])`;
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "/");
}

function todayDate(nowMs?: number): string {
  return formatDay(new Date(nowMs ?? Date.now()));
}

/**
 * Derive a relative search window (`run date − N days … run date`, by PubMed
 * entry date) from the configured default. Returns undefined when no window is
 * configured, so the default behavior stays "no date limit" to preserve recall.
 */
function defaultWindowRange(
  windowDays: number | undefined,
  nowMs?: number,
): SearchDateRange | undefined {
  if (!windowDays) return undefined;
  const now = new Date(nowMs ?? Date.now());
  const from = new Date(now.getTime());
  from.setUTCDate(from.getUTCDate() - windowDays);
  return { from: formatDay(from), to: formatDay(now), type: DateType.ENTREZ };
}

/**
 * Execute one query: lint → ESearch (count + first-page ids) → cap handling
 * (DATE_SEGMENT recursively retrieves every UID; WARN keeps the first 10k;
 * ABORT errors). Returns per-query stats, the full UID set, and segments.
 */
export async function executeQuery(
  query: SearchQuery,
  ctx: ToolContext,
  input: PaperSearchInput,
): Promise<ExecuteQueryResult> {
  const db: Db = input.db ?? ctx.db;
  const warnings: SearchWarning[] = lintQuery(query.term).issues.map((i) => ({
    code: i.code,
    message: i.message,
    query_role: query.role,
  }));
  const dateRange =
    input.dateRange ??
    defaultWindowRange(ctx.config.default_window_days, ctx.nowMs);

  const initial = await esearch(
    {
      db,
      term: query.term,
      retmax: UID_HARD_CAP,
      baseUrl: ctx.baseUrl,
      datetype: dateRange?.type,
      mindate: dateRange?.from,
      maxdate: dateRange?.to,
    },
    ctx.deps,
  );

  const count = initial.count;
  const translation =
    input.includeQueryTranslation === false
      ? undefined
      : initial.queryTranslation;
  let ids = initial.idList;
  let segments: DateSegment[] = [];
  let capEvent: CapEvent | undefined;
  let capped = false;
  let segmented = false;

  if (count > UID_HARD_CAP) {
    const strategy = input.capStrategy ?? DEFAULT_CAP_STRATEGY;

    if (strategy === CapStrategy.ABORT) {
      return {
        perQuery: {
          query: query.term,
          query_role: query.role,
          count,
          translation,
          capped: true,
          segmented: false,
          retrieved: 0,
        },
        ids: [],
        segments: [],
        warnings,
        error: {
          code: ErrorCode.CAP_EXCEEDED,
          message: Messages.CAP_EXCEEDED,
          retryable: false,
          query: query.term,
        },
      };
    }

    if (strategy === CapStrategy.WARN) {
      capped = true;
      warnings.push({
        code: WARN_CODE.CAP_WARN,
        message: Messages.CAP_EXCEEDED,
        query_role: query.role,
      });
    } else {
      const dateField = input.dateField ?? DEFAULT_DATE_FIELD;
      const from = dateRange?.from ?? DEFAULT_SEGMENT_FROM_DATE;
      const to = dateRange?.to ?? todayDate(ctx.nowMs);
      const countFn: CountFn = async (term, range) => {
        const dated = range
          ? datedTerm(term, range.dateField, range.from, range.to)
          : term;
        const r = await esearch(
          { db, term: dated, retmax: 0, baseUrl: ctx.baseUrl },
          ctx.deps,
        );
        return r.count;
      };
      segments = await planSegments(
        query.term,
        count,
        { dateField, from, to },
        countFn,
      );
      segmented = true;
      capEvent = {
        query_role: query.role,
        count,
        strategy: CapStrategy.DATE_SEGMENT,
        segments: segments.length,
        dateField,
      };

      const collected: string[] = [];
      for (const seg of segments) {
        if (seg.capped) {
          capped = true;
          warnings.push({
            code: WARN_CODE.SEGMENT_CAPPED,
            message: Messages.SEGMENT_DEPTH_EXCEEDED,
            query_role: query.role,
          });
        }
        const r = await esearch(
          {
            db,
            term: datedTerm(query.term, seg.field, seg.from, seg.to),
            retmax: UID_HARD_CAP,
            baseUrl: ctx.baseUrl,
          },
          ctx.deps,
        );
        collected.push(...r.idList);
      }
      ids = [...new Set(collected)];
    }
  }

  return {
    perQuery: {
      query: query.term,
      query_role: query.role,
      count,
      translation,
      capped,
      segmented,
      retrieved: ids.length,
    },
    ids,
    segments,
    capEvent,
    warnings,
  };
}
