import type { VerificationCaseCount } from '../../../types/adapters.js';

/**
 * Prefix of the reason a count carries when the scanner lost track of token
 * boundaries. That reason makes the count uncountable, but it is no evidence
 * that any verification syntax exists.
 */
export const LOST_TRACK_REASON = 'lexer lost track';

/**
 * Prefix of the reason a count carries when untrusted literal content reads
 * as case-call text. The count becomes uncountable, but the text is as likely
 * prose — JSX text such as `Don't touch it (please)` — so it is no evidence of
 * a case either. A titled call found there carries a different reason.
 */
export const UNCONFIRMED_CASE_REASON = 'unterminated string may hide cases';

/**
 * Whether a count shows verification syntax: a counted case, or uncertainty
 * the counter traced to case syntax it could not resolve. Lost track and
 * untitled case-call text in untrusted literals do not qualify — JSX text
 * produces both in plain code, and a rename must not buy the exemption a
 * verification role grants.
 * @param count - Result of counting one source text
 * @returns True when the text evidences at least one case or case construct
 */
export function showsVerificationSyntax(count: VerificationCaseCount): boolean {
  return (
    count.knownLowerBound > 0 ||
    count.reasons.some(
      (reason) =>
        !reason.startsWith(LOST_TRACK_REASON) &&
        !reason.startsWith(UNCONFIRMED_CASE_REASON),
    )
  );
}
