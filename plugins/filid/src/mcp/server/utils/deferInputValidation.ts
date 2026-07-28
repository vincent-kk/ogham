import type { z } from 'zod';
import { type ZodTypeAny } from 'zod';

/**
 * Keep the advertised schema while forwarding invalid input to wrapHandler.
 */
export function deferInputValidation<Schema extends ZodTypeAny>(
  schema: Schema,
): Schema {
  const deferred = schema.catch(
    ({ input }: { input: unknown }) => input as z.output<Schema>,
  );
  return deferred as unknown as Schema;
}
