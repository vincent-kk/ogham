import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
  FACTS_SUBMISSION_MAX_BYTES,
} from '../../../../../constants/facts.js';
import { readSubmissionFile } from '../../../../../core/facts/index.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';

/** Each refusal reason paired with the diagnostic key that explains it. */
const REASON_KEYS = {
  'not-absolute': 'FILE_PATH_NOT_ABSOLUTE',
  'inside-project': 'FILE_INSIDE_PROJECT',
  symlink: 'FILE_NOT_REGULAR',
  'not-regular': 'FILE_NOT_REGULAR',
  'too-large': 'FILE_TOO_LARGE',
  unreadable: 'FILE_UNREADABLE',
  'not-json': 'FILE_NOT_JSON',
} as const;

/**
 * Open the caller's extraction output, turning a refusal into a typed error.
 *
 * Every message is built here from the caller's own path and a fixed sentence —
 * never from the filesystem error, the JSON parser or the file itself. The
 * server runs outside the agent's sandbox, so a message carrying any byte of the
 * opened file would make this call a read oracle for the host.
 *
 * @param projectRoot - Absolute project root the file must stay outside of.
 * @param filePath - Absolute path the caller supplied.
 * @returns The submitted JSON array's elements, still unvalidated.
 * @throws {ToolDiagnosticError} One of the `facts-file-*` codes, each carrying
 * the next action that changes the outcome.
 */
export function openSubmission(
  projectRoot: string,
  filePath: string,
): unknown[] {
  const read = readSubmissionFile(projectRoot, filePath);
  if (read.ok) return read.entries;
  const key = REASON_KEYS[read.reason];
  throw new ToolDiagnosticError(
    FACTS_DIAGNOSTIC_CODES[key],
    `${filePath} cannot be read as a facts submission${
      key === 'FILE_TOO_LARGE'
        ? `: the cap is ${FACTS_SUBMISSION_MAX_BYTES} bytes`
        : ''
    }.`,
    FACTS_DIAGNOSTIC_NEXT_ACTIONS[key],
  );
}
