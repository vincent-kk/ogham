/**
 * The per-turn reminder the UserPromptSubmit hook re-raises at the top of
 * every turn. SessionStart states the posture once; a long session scrolls
 * it away and a compaction drops it, so this restores the one fact that
 * decays — that a moment may call for a skill — at the moment work begins.
 *
 * Skill dispatch is the leading axis on purpose. The failure this closes is
 * "the moment arrived and no skill fired", so the line maps moments to
 * skills first and lets the rule reminder ride second. Silent at advisory —
 * the level the dispatch rates were measured against — where the hook reads
 * the dial and returns without injecting.
 *
 * It carries the election vocabulary of `ELECTION_STANDARD_LINE` and names
 * the same one skill it does: the done-claim moment, which arrives with no
 * tool call to mark it — whether the model says it or the user does.
 */
export const TURN_REMINDER_STANDARD =
  "This turn, elect before acting: a failure appearing, multi-step work starting, or review arriving or departing means loading the skill that owns the moment first — and when done, fixed, or passing is said or heard, your claim or the user's, that skill is `/seiri:verify`. Keep changes within the active rules.";

/**
 * Strict widens the same reminder rather than replacing it: borderline and
 * small work still dispatch, and the rules bind rather than advise. Where
 * standard names one moment's owner, this names them all — the turn is
 * where a compaction has already dropped the SessionStart election line,
 * so the mapping has to survive without it.
 *
 * The repetition against `ELECTION_STRICT_LINE` is deliberate and is the
 * whole point of the strict position: once per session is not once per
 * turn, and the moment that decays is the one that arrives late.
 */
export const TURN_REMINDER_STRICT =
  "This turn, elect the owning skill by name — a failure → `/seiri:trace-cause` · multi-step work → `/seiri:write-plan` · a plan in hand → `/seiri:execute` · before implementing → `/seiri:implement` · done, fixed, or passing said or heard, yours or the user's → `/seiri:verify` · sending work out → `/seiri:request-review` · feedback arriving → `/seiri:receive-review`. Borderline and small work included; the active rules bind rather than advise.";
