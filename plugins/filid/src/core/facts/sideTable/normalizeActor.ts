/**
 * Fold an actor identity to the form the confirmation rule compares.
 *
 * The rule the spec states is "a different actor", and the server cannot verify
 * identity at all — it is self-declared. What it can do is stop the difference
 * from being an accident of spelling: `A` and `A ` and `a` are one actor typed
 * three ways, and treating them as three would let a single reviewer confirm its
 * own dismissal and remove a real edge.
 *
 * Compatibility folding, not security. Two actors who both call themselves
 * `reviewer` are still one actor to this rule; what the rule buys is a second
 * READING of the lines, which the skill supplies by standing up a separate
 * subagent, not a second identity.
 *
 * @param actor - Actor string as the caller declared it.
 * @returns The comparable form, or null when nothing is left to compare.
 */
export function normalizeActor(actor: string): string | null {
  const folded = actor.normalize('NFKC').trim().toLowerCase();
  return folded === '' ? null : folded;
}
