import type { EditNoticeKind } from '../../../constants/editNotice.js';
import { INJECTION_PREFIX } from '../../../constants/plugin.js';

/**
 * Restates the election at an unbound turn's edit moment. Names only skills
 * and a file count — never a path or the election line itself.
 * @param kind `first` for the turn's first edited file, `spread` once the
 *   turn's distinct edited files reach the notice threshold.
 * @param fileCount Distinct files edited this turn; rendered only for `spread`.
 * @returns The edit notice to inject.
 */
export function renderEditNotice(
  kind: EditNoticeKind,
  fileCount: number,
): string {
  return kind === 'first'
    ? `${INJECTION_PREFIX} First edit this turn with no active task. A change touching 2+ files or their tests → seiri:write-plan (or seiri:execute for an approved plan) before continuing; a single surgical change → proceed.`
    : `${INJECTION_PREFIX} ${fileCount} files edited this turn with no active task — this is no longer a surgical change. Stop and load seiri:write-plan (or seiri:execute for an approved plan) before the next edit.`;
}
