import { INJECTION_PREFIX, RULE_ID_PREFIX } from '../../../constants/plugin.js';
import type { InterventionLevel } from '../../../types/config.js';
import type { RuleDocStatus } from '../../../types/manifest.js';

const RULES_DIR_LABEL = '.claude/rules/';
const CONFIG_LABEL = '.seiri/config.json';
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
  intervention: InterventionLevel,
  configWarning?: string,
): string[] {
  const deployed = statuses.filter((status) => status.deployed);
  if (deployed.length === 0) return [];

  const names = deployed.map((status) => shortName(status.id)).join(', ');
  const lines = [
    `${INJECTION_PREFIX} Active rules: ${names} (${deployed.length}/${statuses.length}) — ${RULES_DIR_LABEL}`,
  ];

  if (intervention !== 'advisory')
    lines.push(`${INJECTION_PREFIX} Intervention: ${intervention}`);

  if (intervention === 'strict')
    lines.push(
      `${INJECTION_PREFIX} Precedence: repository instructions > repository conventions > these rules.`,
    );

  const drifted = deployed.filter((status) => !status.inSync);
  if (drifted.length > 0)
    lines.push(
      `${INJECTION_PREFIX} ${drifted.length} rule(s) differ from the shipped template: ${drifted
        .map((status) => shortName(status.id))
        .join(', ')}. Run ${SETUP_COMMAND} to review.`,
    );

  if (configWarning)
    lines.push(
      `${INJECTION_PREFIX} Ignored ${CONFIG_LABEL} — ${configWarning}.`,
    );

  return lines;
}

/** `seiri_agent-legible` reads as `agent-legible` once the source is known. */
function shortName(id: string): string {
  return id.startsWith(RULE_ID_PREFIX) ? id.slice(RULE_ID_PREFIX.length) : id;
}
