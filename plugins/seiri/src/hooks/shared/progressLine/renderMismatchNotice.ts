import { INJECTION_PREFIX } from '../../../constants/plugin.js';

/**
 * Names the requested and bound tasks; state is left untouched.
 * @param requested Task named by the rejected request.
 * @param bound Task currently bound and active.
 * @returns The mismatch notice to inject.
 */
export function renderMismatchNotice(requested: string, bound: string): string {
  return `${INJECTION_PREFIX} Workflow ${requested}: not applied; ${bound} is active — finish or pause it, or enter ${requested} via write-plan/execute.`;
}
