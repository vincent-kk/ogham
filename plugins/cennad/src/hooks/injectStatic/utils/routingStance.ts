import type { InterventionStrength } from '../../shared/configTypes.js';

// The Routing guidance lines that intervention_strength actually swaps.
//
// The five levels are separated by three discrete axes — what happens with no
// match, whether the user must name a provider, and whether the exception list
// is open or closed — rather than by degrees of confidence ("clearly stronger"),
// which a session grades itself on and always passes.
const STANCE = {
  '-2': [
    '- Dispatch only when the user asks for a provider by name.',
    '- Otherwise handle it here.',
  ],
  '-1': [
    '- Dispatch only when a provider owns most of the work in front of you.',
    '- Otherwise handle it here; the ratio line is a report, not a quota.',
  ],
  '0': [
    '- A domain above matches → choose between the owning skill and this session before you start, not after.',
    '- Lean dispatch when the work is self-contained and sizable, or needs live web, a sandbox, or an outside view.',
    '- Lean local when it is small, or leans on state this session already built.',
    '- Nothing matches → handle it here.',
  ],
  '1': [
    '- A domain above matches → dispatch it through the owning skill rather than handling it here.',
    '- Keeping matched work here is a decision — name the part this session must own.',
    '- Nothing matches → handle it here.',
  ],
  '2': [
    '- A domain above matches → dispatch it through the owning skill before starting the work.',
    '- Keeping matched work here is allowed only for one of these:',
    '  (1) the user asked this session to do it;',
    '  (2) it needs files, state, or tools the provider cannot reach;',
    '  (3) the whole change is one file and under ~20 lines;',
    '  (4) a dispatch for this same task already failed this session.',
    '  Name the number in your reply — "keeping here (2)". Nothing else is an exception.',
    '- A failed dispatch is not a retry loop: report it, then handle it here.',
  ],
} as const;

// True at every strength: the ratio is a record, not a quota to fill, and the
// user outranks the policy.
const COMMON = [
  '- The ratio line reports past turns. Never dispatch to move it.',
  '- An explicit user instruction outranks every line above.',
];

export function routingStance(strength: InterventionStrength): string[] {
  return [...STANCE[String(strength) as keyof typeof STANCE], ...COMMON];
}
