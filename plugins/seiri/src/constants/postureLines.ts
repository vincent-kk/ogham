/**
 * Rendered by the SessionStart status block and the MCP posture echo —
 * separate from the hook wiring (constants/hooks.ts) every entry imports,
 * so a bundle that never renders posture never carries these sentences.
 */

/**
 * Announced from `standard` up: the order the automatic skills run in.
 *
 * It names skills, never their content — the skills carry their own
 * procedure, and restating any of it here would be the second copy the
 * whole delivery split exists to avoid. What the chain adds is routing:
 * which moment hands off to which, so a long session that has drifted
 * away from the sequence has something to snap back to.
 *
 * Written as `/seiri:<name>`, the form a reader can invoke and a model can
 * dispatch on. A bare name is a word; the namespaced one is an address.
 */
export const WORKFLOW_CHAIN_LINE =
  'Workflow: `/seiri:write-plan` → `/seiri:review-plan` → `/seiri:execute` → `/seiri:implement` → `/seiri:verify` → `/seiri:request-review`; failures → `/seiri:trace-cause`; indirect code → `/seiri:trace-structure`; review feedback → `/seiri:receive-review`.';

/**
 * Added at `strict`. Widens which moments count as one of the above, and
 * puts a verification run behind any claim that something is done.
 */
export const STRICT_POSTURE_LINE =
  'Borderline moments included. Completion claims name their verification run first.';
