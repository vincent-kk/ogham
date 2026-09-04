/** Completion state asserted by a verifier opinion. */
export type VerifyOpinionState = 'COMPLETE' | 'INDETERMINATE';

/** Verdict assigned to one reviewer or FCA candidate. */
export type VerifyDecisionVerdict = 'CONFIRMED' | 'REFUTED' | 'INDETERMINATE';

/** One verifier decision for a required reviewer or FCA candidate. */
export interface VerifyDecision {
  /** Reviewer or FCA candidate identifier being decided. */
  findingId: string;
  /** Verifier disposition for the candidate. */
  verdict: VerifyDecisionVerdict;
  /** Concrete repository evidence supporting the disposition. */
  evidence: string;
  /** Falsifiable explanation for the disposition. */
  reason: string;
}

/** Verdict-neutral concern recorded outside the candidate set. */
export interface VerifyObservation {
  /** Project-relative path related to the concern. */
  path: string;
  /** Concrete description of the concern. */
  detail: string;
}

/** Validated verifier opinion for one review group. */
export interface VerifyOpinion {
  /** Opinion artifact schema version. */
  schema: 7;
  /** At-least-two-digit review group identifier. */
  group: string;
  /** Whether the verifier completed all required decisions. */
  state: VerifyOpinionState;
  /** Immutable committed-source identity copied from review state. */
  sourceHash: string;
  /** Exact decision set required by the verifier brief. */
  decisions: VerifyDecision[];
  /** Verdict-neutral concerns retained for the final report. */
  observations: VerifyObservation[];
  /** Stable paths and identifiers checked by the verifier. */
  checked: string[];
}
