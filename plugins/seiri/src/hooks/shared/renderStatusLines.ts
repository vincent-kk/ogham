import {
  DISABLED_INTERVENTION,
  SILENT_INTERVENTION,
} from '../../constants/intervention.js';
import { INJECTION_PREFIX } from '../../constants/plugin.js';
import { describeDial } from '../../core/infra/configLoader/utils/describeDial.js';
import { renderElectionLine } from '../../core/infra/configLoader/utils/renderElectionLine.js';
import { renderPostureLines } from '../../core/infra/configLoader/utils/renderPostureLines.js';
import type { InterventionState } from '../../types/config.js';
import type { RuleDocStatus } from '../../types/manifest.js';

import { activeRulesLine } from './activeRulesLine.js';
import { shortRuleName } from './shortRuleName.js';

const SETUP_COMMAND = '/seiri:setup';

/**
 * Build the SessionStart injection.
 *
 * Deliberately short, and deliberately not the rules themselves: the
 * the host already loads its rule channel into context, so repeating any
 * of that content here would spend the budget twice.
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
  if (dial.effective === DISABLED_INTERVENTION) return [];

  const active = statuses.filter((status) => status.active);
  const election = renderElectionLine(dial.effective);

  // Two facts, two gates. Which rules are active is only worth saying
  // when a deployed file exists to point at; which workflow owns a moment
  // is true of any repository that opted into the dial, so the election
  // line is gated on the dial alone (D7-E B1). A project with the plugin
  // installed and no rule deployed still elects.
  const lines =
    active.length === 0 ? [] : [activeRulesLine(active, statuses.length)];

  // Compact is for a subagent, which starts without the parent's context
  // and needs the two facts it cannot recover: which rules this
  // repository turned on, and which workflow owns the moment it is about
  // to hit. Drift and stored-file warnings are the parent's business, and
  // precedence is already in the rule files the subagent can read.
  //
  // Compact advisory silence is deliberate, not an accident of having no
  // rules deployed: `renderElectionLine` has no entry at that position.
  if (options.compact)
    return election === undefined
      ? []
      : [...lines, `${INJECTION_PREFIX} ${election}`];

  // Nothing deployed leaves nothing to report about rules — the dial
  // position, drift and stored-file warnings all describe deployed files.
  // The election line is the one fact that survives that emptiness.
  if (active.length === 0)
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

  const drifted = active.filter((status) => !status.activeInSync);
  if (drifted.length > 0)
    lines.push(
      `${INJECTION_PREFIX} ${drifted.length} rule(s) differ from the shipped template: ${drifted
        .map((status) => shortRuleName(status.id))
        .join(', ')}. Run ${SETUP_COMMAND} to review.`,
    );

  for (const warning of dial.warnings)
    lines.push(
      `${INJECTION_PREFIX} Ignored ${warning.file} — ${warning.reason}.`,
    );

  return lines;
}
