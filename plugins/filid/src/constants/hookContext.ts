/** Legend prepended once per scope to the first [filid:ctx]: what each block and line means. */
export const HOOK_GUIDE_BLOCK = [
  '[filid:guide]',
  '[filid:ctx] — module boundary pointer, emitted on your first read or write in a module this session and again when it goes stale. It names the rule files; it never contains them.',
  '  intent: the owning INTENT.md path. Read it with the Read tool before continuing — its rules bind every read and edit in this module.',
  '  action: the standing read directive for the intent file above.',
  '  chain: parent INTENT.md paths (nearest > root). Each is a readable file — read to learn parent rules.',
  '  detail: DETAIL.md path. Read BEFORE writing code in this module.',
  '[filid:map] — directories visited this turn (reset on each user prompt), emitted when the visit set changes. /* marks the directory just accessed.',
].join('\n');

/** Read directive carried by every [filid:ctx] block, right after the intent: line. */
export const HOOK_CTX_READ_DIRECTIVE =
  'action: READ the intent file above with the Read tool before your next step in this module — its rules are binding and are not reproduced here.';
