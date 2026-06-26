/**
 * @file eutils.ts
 * @description Adapter I/O contracts for the NCBI E-utility responses. efetch
 * yields full `PaperRecord[]`; the lighter endpoints return shaped subsets.
 */
import type { OaStatus } from "./enums.js";

/** ESearch (count probe / id list / history / translation). */
export interface EsearchResult {
  count: number;
  idList: string[];
  queryTranslation?: string;
  webEnv?: string;
  queryKey?: string;
  warnings: string[];
}

/** ESummary record (lighter than efetch; author names are unstructured). */
export interface EsummaryRecord {
  pmid: string;
  title?: string;
  journal?: string;
  year?: number;
  doi?: string;
  pmcid?: string;
  authorNames: string[];
}

/** ELink Similar Articles result. */
export interface ElinkResult {
  seedPmids: string[];
  linkedPmids: string[];
}

/** A single idconv mapping row. */
export interface IdConvMapping {
  pmid?: string;
  pmcid?: string;
  doi?: string;
  status?: string;
  errmsg?: string;
}

export interface IdConvResult {
  status: string;
  records: IdConvMapping[];
}

/** A downloadable format link from oa.fcgi. */
export interface OaFormatLink {
  format: string;
  href: string;
}

/** oa.fcgi open-access record (or error). */
export interface OaRecord {
  pmcid: string;
  oaStatus: OaStatus;
  license?: string;
  formats: OaFormatLink[];
  errorCode?: string;
}
