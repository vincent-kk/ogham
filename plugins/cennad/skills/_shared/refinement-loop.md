# Refinement loop (shared by codex / antigravity / claude)

Load this to judge and, when warranted, improve a single provider's response
over the SAME session. Skip it for a `--no-refine` invocation or a trivial /
already-complete answer — a single dispatch is the whole job there.

Before dispatching, derive a completion checklist from the user's request —
required deliverables, explicit constraints, and the expected format / evidence.
Judge each response against THAT checklist, not against the response's own claim
to be complete (a provider can sound finished while silently dropping a
constraint).

Continue the SAME session only when you can NAME a specific gap:

- a checklist item the response left uncovered, partial, or ambiguous;
- a blocking question from the provider WHOSE ANSWER you already hold (in the user's request or this session) — pass it explicitly;
- a correctness defect you can actually explain or test, not merely suspect.

Stop and surface to the USER instead (do NOT continue, do NOT invent an answer) when:

- the provider asks about intent, scope, or a constraint the user never stated — relay its question verbatim and let the user resume via `--continue`;
- the only doubt is a correctness issue you cannot independently verify — state it alongside the answer and let the user decide;
- the provider merely offers optional extras ("want me to also…?") — that is not a gap; do not accept on the user's behalf.

To continue, call `mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt })`
with the previous response's `session_id` — NOT a fresh `start_conversation`, which
drops the prior turn's context. State the exact gap, supply any context the provider
could not see, and ask for the corrected / completed answer (not just a critique).

Stop the loop when any holds:

- every checklist item is met;
- no specific, closable gap remains to name;
- you reach 3 provider calls in this session (initial + 2 continuations; a failed call still counts) — a rate-limit / budget ceiling, not a target. Use the 2nd continuation only if the 1st made material progress and one concrete gap remains;
- a call returns `status: 'failure'` or empty / unusable output — do not retry; handle it per the skill's Failure dispatch and return the best successful answer so far.

Do not loop on trivial or already-complete answers; under a `high` tier each extra
round multiplies rate-limit / budget cost. When you went beyond the initial call,
note it to the user (e.g. "refined over N follow-up(s)").
