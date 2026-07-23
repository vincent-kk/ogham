import { DEFAULT_INTERVENTION } from '../../constants/intervention.js';
import { INJECTION_PREFIX, RULE_ID_PREFIX } from '../../constants/plugin.js';
import { describeDial } from '../../core/infra/configLoader/utils/describeDial.js';
import { renderPostureLines } from '../../core/infra/configLoader/utils/renderPostureLines.js';
import type { InterventionState } from '../../types/config.js';
import type { RuleDocStatus } from '../../types/manifest.js';

const RULES_DIR_LABEL = '.claude/rules/';
const SETUP_COMMAND = '/seiri:setup';

/**
 * Build the SessionStart injection.
 *
 * Deliberately short, and deliberately not the rules themselves: the
 * harness already loads every file under `.claude/rules/` into context,
 * so repeating any of that content here would spend the budget twice.
 * What the files cannot say about themselves is what goes in — which are
 * active, where the dial sits, and whether any drifted from the template.
 *
 * The dial changes only how much of this renders. It never changes a
 * deployed document, because the documents are hashed and an edited copy
 * would report as the user's own local drift.
 */
export function renderStatusLines(
  statuses: RuleDocStatus[],
  dial: InterventionState,
  options: { compact?: boolean } = {},
): string[] {
  const deployed = statuses.filter((status) => status.deployed);
  if (deployed.length === 0) return [];

  const names = deployed.map((status) => shortName(status.id)).join(', ');
  const lines = [
    `${INJECTION_PREFIX} Active rules: ${names} (${deployed.length}/${statuses.length}) — ${RULES_DIR_LABEL}`,
  ];

  // Compact is for a subagent, which starts without the parent's context
  // and needs the two facts it cannot recover: which rules this
  // repository turned on, and the order the work runs in. Drift and
  // stored-file warnings are the parent's business, and precedence is
  // already in the rule files the subagent can read.
  //
  // The posture axis being empty at advisory is what makes this silent
  // there, which keeps a subagent spawn exactly as it was measured.
  if (options.compact) {
    const [chain] = renderPostureLines(dial.effective);
    return chain === undefined
      ? []
      : [...lines, `${INJECTION_PREFIX} ${chain}`];
  }

  // A valve that lowered the dial to advisory still prints: silence there
  // would be indistinguishable from a project that simply never set one.
  if (dial.effective !== DEFAULT_INTERVENTION || dial.source === 'runtime')
    lines.push(`${INJECTION_PREFIX} ${describeDial(dial)}`);

  if (dial.effective === 'strict')
    lines.push(
      `${INJECTION_PREFIX} Precedence: repository instructions > repository conventions > these rules.`,
    );

  for (const line of renderPostureLines(dial.effective))
    lines.push(`${INJECTION_PREFIX} ${line}`);

  const drifted = deployed.filter((status) => !status.inSync);
  if (drifted.length > 0)
    lines.push(
      `${INJECTION_PREFIX} ${drifted.length} rule(s) differ from the shipped template: ${drifted
        .map((status) => shortName(status.id))
        .join(', ')}. Run ${SETUP_COMMAND} to review.`,
    );

  for (const warning of dial.warnings)
    lines.push(
      `${INJECTION_PREFIX} Ignored ${warning.file} — ${warning.reason}.`,
    );

  return lines;
}

/** `seiri_agent-legible` reads as `agent-legible` once the source is known. */
function shortName(id: string): string {
  return id.startsWith(RULE_ID_PREFIX) ? id.slice(RULE_ID_PREFIX.length) : id;
}
