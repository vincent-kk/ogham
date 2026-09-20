import type {
  ReviewGenerationReplacement,
  ReviewGenerationReplacementLink,
} from '../../state/reviewStateTypes.js';

/**
 * State in one line that this review replaced an earlier generation.
 *
 * A re-run that nothing blocked must still be visible in what it produces, so
 * the sealed artifacts name the superseded generation, why it was replaced and
 * the verdict it had published.
 *
 * @param replacement Replacement record carried by the sealed state, if any.
 * @returns The sentence, or null when this generation replaced nothing.
 */
export function renderGenerationReplacement(
  replacement: ReviewGenerationReplacement | undefined,
): string | null {
  if (!replacement) return null;
  const parts = [
    `This review replaces ${replacement.priorGenerationId ? `generation ${replacement.priorGenerationId}` : 'an earlier generation'} (${replacement.reason}).`,
  ];
  const published: ReviewGenerationReplacementLink | undefined =
    replacement.priorVerdict === undefined
      ? replacement.chain?.find((link) => link.priorVerdict !== undefined)
      : {
          reason: replacement.reason,
          ...(replacement.priorGenerationId
            ? { priorGenerationId: replacement.priorGenerationId }
            : {}),
          priorVerdict: replacement.priorVerdict,
        };
  if (published?.priorVerdict)
    parts.push(
      `The nearest generation that published a verdict ${published.priorGenerationId ? `(${published.priorGenerationId}) ` : ''}had ${published.priorVerdict}.`,
    );
  if (replacement.chain?.length)
    parts.push(
      `It follows ${replacement.chain.length + (replacement.olderCount ?? 0)} earlier replacement(s).`,
    );
  if (replacement.archivePath)
    parts.push(`Its state is kept at ${replacement.archivePath}.`);
  if (replacement.discardedGroups?.length)
    parts.push(
      `Stored rounds were discarded and reviewed again for group ${replacement.discardedGroups.join(', ')}.`,
    );
  return parts.join(' ');
}
