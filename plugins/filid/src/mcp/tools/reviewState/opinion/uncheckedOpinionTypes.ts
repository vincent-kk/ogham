import type { ReviewUnit } from '../state/reviewGroupTypes.js';
import type { ReviewValidationProblem } from '../state/reviewStateTypes.js';

import type {
  ReviewFinding,
  ReviewOpinion,
  ReviewOpinionFile,
} from './reviewOpinionTypes.js';
import type { VerifyDecision, VerifyOpinion } from './verifyOpinionTypes.js';

/** Structurally parsed reviewer coverage record before semantic validation. */
export interface UncheckedReviewOpinionFile extends Omit<
  ReviewOpinionFile,
  'change' | 'result'
> {
  /** Untrusted Git change class checked against the assigned unit. */
  change: string;
  /** Untrusted coverage result checked by the semantic validator. */
  result: string;
}

/** Structurally parsed reviewer finding before enum validation. */
export interface UncheckedReviewFinding extends Omit<
  ReviewFinding,
  'severity' | 'category'
> {
  /** Untrusted severity checked by the semantic validator. */
  severity: string;
  /** Untrusted category checked by the semantic validator. */
  category: string;
}

/** Structurally parsed reviewer opinion before contract validation. */
export interface UncheckedReviewOpinion extends Omit<
  ReviewOpinion,
  'schema' | 'state' | 'files' | 'findings'
> {
  /** Untrusted schema number checked against version seven. */
  schema: number;
  /** Untrusted completion state checked by the semantic validator. */
  state: string;
  /** Structurally valid coverage records requiring assignment checks. */
  files: UncheckedReviewOpinionFile[];
  /** Structurally valid findings requiring semantic checks. */
  findings: UncheckedReviewFinding[];
}

/** Structurally parsed verifier decision before enum validation. */
export interface UncheckedVerifyDecision extends Omit<
  VerifyDecision,
  'verdict'
> {
  /** Untrusted verifier disposition checked by the semantic validator. */
  verdict: string;
}

/** Structurally parsed verifier opinion before contract validation. */
export interface UncheckedVerifyOpinion extends Omit<
  VerifyOpinion,
  'schema' | 'state' | 'decisions'
> {
  /** Untrusted schema number checked against version seven. */
  schema: number;
  /** Untrusted completion state checked by the semantic validator. */
  state: string;
  /** Structurally valid decisions requiring exact-set checks. */
  decisions: UncheckedVerifyDecision[];
}

/** Successful structural parse of one opinion artifact. */
interface OpinionParseSuccess<T> {
  /** Structurally valid opinion requiring semantic validation. */
  opinion: T;
  /** Empty problem list distinguishing successful parsing. */
  problems: [];
}

/** Failed structural parse of one opinion artifact. */
interface OpinionParseFailure {
  /** Null discriminator showing no usable opinion was produced. */
  opinion: null;
  /** Single bounded syntax or structural problem. */
  problems: [ReviewValidationProblem];
}

/** Discriminated structural parse outcome for one opinion artifact. */
export type OpinionParseResult<T> =
  OpinionParseSuccess<T> | OpinionParseFailure;

/** Expected identity and unit roster for reviewer validation. */
export interface CheckReviewOpinionOptions {
  /** Prepared review group identifier. */
  group: string;
  /** One-based review round being validated. */
  round: number;
  /** Immutable committed-source identity from review state. */
  sourceHash: string;
  /** Exact prepared units assigned to the group. */
  units: readonly ReviewUnit[];
}

/** Expected identity and decision roster for verifier validation. */
export interface CheckVerifyOpinionOptions {
  /** Prepared review group identifier. */
  group: string;
  /** Immutable committed-source identity from review state. */
  sourceHash: string;
  /** Exact reviewer and FCA candidate identifiers requiring decisions. */
  decisionIds: readonly string[];
}
