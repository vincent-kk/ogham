import { createHmac } from 'node:crypto';

/**
 * Bind an actor capability to its role and round without disclosing the group secret.
 * @param secret Random generation-local group secret.
 * @param kind Currently assigned actor role.
 * @param round Reviewer round, absent for independent verification.
 * @returns A capability unusable for any other assignment.
 */
export function computeReviewContextToken(
  secret: string,
  kind: 'review' | 'verify',
  round?: number,
): string {
  return createHmac('sha256', secret)
    .update(JSON.stringify([kind, round ?? null]))
    .digest('hex');
}
