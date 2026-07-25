import { SILENT_INTERVENTION } from '../../constants/intervention.js';
import { INJECTION_PREFIX, RULE_ID_PREFIX } from '../../constants/plugin.js';
import { describeDial } from '../../core/infra/configLoader/utils/describeDial.js';
import { renderElectionLine } from '../../core/infra/configLoader/utils/renderElectionLine.js';
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
  const election = renderElectionLine(dial.effective);

  // Two facts, two gates. Which rules are active is only worth saying
  // when a deployed file exists to point at; which workflow owns a moment
  // is true of any repository that opted into the dial, so the election
  // line is gated on the dial alone (D7-E B1). A project with the plugin
  // installed and no rule deployed still elects.
  const lines =
    deployed.length === 0 ? [] : [activeRulesLine(deployed, statuses.length)];

  // Compact is for a subagent, which starts without the parent's context
  // and needs the two facts it cannot recover: which rules this
  // repository turned on, and which workflow owns the moment it is about
  // to hit. Drift and stored-file warnings are the parent's business, and
  // precedence is already in the rule files the subagent can read.
  //
  // Silence at advisory is the dial's opt-out, not an accident of having
  // nothing deployed: `renderElectionLine` has no entry there, so a
  // subagent spawn stays exactly as the dispatch measurements found it.
  if (options.compact)
    return election === undefined
      ? []
      : [...lines, `${INJECTION_PREFIX} ${election}`];

  // Nothing deployed leaves nothing to report about rules — the dial
  // position, drift and stored-file warnings all describe deployed files.
  // The election line is the one fact that survives that emptiness.
  if (deployed.length === 0)
    return election === undefined ? [] : [`${INJECTION_PREFIX} ${election}`];

  // A valve that lowered the dial to advisory still prints: silence there
  // would be indistinguishable from a project that simply never set one.
  if (dial.effective !== SILENT_INTERVENTION || dial.source === 'runtime')
    lines.push(`${INJECTION_PREFIX} ${describeDial(dial)}`);

  if (dial.effective === 'strict')
    lines.push(
      `${INJECTION_PREFIX} Precedence: repository instructions > repository conventions > these rules.`,
    );

  for (const line of renderPostureLines(dial.effective))
    lines.push(`${INJECTION_PREFIX} ${line}`);

  // Last of the posture block, after the chain it depends on: the chain
  // says which workflow follows which, this says a matched moment is
  // loaded before it is acted on.
  if (election !== undefined) lines.push(`${INJECTION_PREFIX} ${election}`);

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

/** Which rules this repository turned on, counted against the manifest. */
function activeRulesLine(deployed: RuleDocStatus[], total: number): string {
  const names = deployed.map((status) => shortName(status.id)).join(', ');
  return `${INJECTION_PREFIX} Active rules: ${names} (${deployed.length}/${total}) — ${RULES_DIR_LABEL}`;
}

/** `seiri_agent-legible` reads as `agent-legible` once the source is known. */
function shortName(id: string): string {
  return id.startsWith(RULE_ID_PREFIX) ? id.slice(RULE_ID_PREFIX.length) : id;
}
