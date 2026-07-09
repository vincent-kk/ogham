/**
 * @file generateCommitMessage.ts
 * @description Render the auto-commit message from a template, with the placeholder
 * replacer registry it depends on.
 */
import {
  DEFAULT_MESSAGE_TEMPLATE,
  MESSAGE_PLACEHOLDERS,
} from '../../../../constants/vaultCommitter.js';
import { formatDate } from '../../../../core/dateFormat/operations/formatDate.js';
import { formatTime } from '../../../../core/dateFormat/operations/formatTime.js';

/** Values available to message-template placeholder replacers. */
export interface CommitMessageContext {
  topLevels: readonly string[];
  fileCount: number;
  now: Date;
}

type PlaceholderToken =
  (typeof MESSAGE_PLACEHOLDERS)[keyof typeof MESSAGE_PLACEHOLDERS];

/**
 * Message-template placeholder registry, keyed by MESSAGE_PLACEHOLDERS
 * tokens. To support a new placeholder: add its token to
 * MESSAGE_PLACEHOLDERS, register the replacer here (the `satisfies` clause
 * fails to compile while the pairing is incomplete, extending
 * CommitMessageContext if it needs a new value source), and document it in
 * vaultCommitter DETAIL.md.
 */
export const MESSAGE_TEMPLATE_REPLACERS = {
  [MESSAGE_PLACEHOLDERS.DIRS]: ({ topLevels }) => topLevels.join(', '),
  [MESSAGE_PLACEHOLDERS.COUNT]: ({ fileCount }) => String(fileCount),
  [MESSAGE_PLACEHOLDERS.DATE]: ({ now }) => formatDate(now),
  [MESSAGE_PLACEHOLDERS.TIME]: ({ now }) => formatTime(now),
} as const satisfies Record<
  PlaceholderToken,
  (context: CommitMessageContext) => string
>;

/**
 * Render the auto-commit message from a template, default e.g.
 * `chore(maencof): session wrap [01_Core, 04_Action] (2026-07-08 10:05)`.
 * Placeholders come from MESSAGE_TEMPLATE_REPLACERS; unknown ones pass
 * through untouched. The template's static prefix doubles as a fold marker
 * (see AUTO_COMMIT_SUBJECT_MARKERS and foldDaily) — keep them consistent.
 */
export function generateCommitMessage(
  topLevels: readonly string[],
  fileCount: number,
  template: string = DEFAULT_MESSAGE_TEMPLATE,
): string {
  const context: CommitMessageContext = {
    topLevels,
    fileCount,
    now: new Date(),
  };
  return Object.entries(MESSAGE_TEMPLATE_REPLACERS).reduce(
    (message, [placeholder, replace]) =>
      message.replaceAll(placeholder, replace(context)),
    template,
  );
}
