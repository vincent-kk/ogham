export const HOOK_GUIDE_BLOCK = [
  '[filid:guide]',
  '[filid:ctx] — module boundary rules, delivered on your first read or write in a module and re-delivered when stale.',
  '  intent: INTENT.md path. --- ... --- is its inline content. Obey these rules.',
  '  chain: parent INTENT.md paths (nearest > root). Each is a readable file — read to learn parent rules.',
  '  detail: DETAIL.md path. Read BEFORE writing code in this module.',
  "[filid:gate] — a mutation was blocked once because this module's rules were not yet delivered; the rules are included below — review them and retry the same call (the retry will pass).",
  '[filid:map] — directories visited this turn (reset on each user prompt), emitted when the visit set changes. /* marks the directory just accessed.',
].join('\n');

export const HOOK_GATE_RETRY_GUIDANCE =
  'Review the rules below, then retry the same call — the retry will pass.';
