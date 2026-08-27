import type { FetchContext } from "../../../types/index.js";
import { runLimited } from "../operations/runLimited.js";
import type { ReplyCandidate, ReplyProperty } from "../operations/wire.js";
import { fetchReplyProperty } from "./fetchReplyProperty.js";
import { MAX_PROPERTY_ROOTS, PROPERTY_CONCURRENCY } from "./limits.js";
import type { RequestFn } from "./requestFn.js";

/** Properties for the roots the changelog referenced, at most `MAX_PROPERTY_ROOTS`, `PROPERTY_CONCURRENCY` at a time. */
export async function collectReplyProperties(
  ctx: FetchContext,
  request: RequestFn,
  keys: readonly string[],
  replies: readonly ReplyCandidate[],
  pageIds: ReadonlySet<string>,
): Promise<{ properties: Map<string, ReplyProperty>; warnings: string[] }> {
  const warnings: string[] = [];
  const properties = new Map<string, ReplyProperty>();
  if (keys.length === 0) return { properties, warnings };
  const rootIds = [...new Set(replies.map((reply) => reply.rootId))].filter(
    (id) => pageIds.has(id),
  );
  const selected = rootIds.slice(0, MAX_PROPERTY_ROOTS);
  if (rootIds.length > selected.length)
    warnings.push(
      `property lookup limited to ${MAX_PROPERTY_ROOTS} root comments (${rootIds.length} needed)`,
    );
  const results = await runLimited(
    selected.map(
      (rootId) => () => fetchReplyProperty(ctx, request, rootId, keys),
    ),
    PROPERTY_CONCURRENCY,
  );
  results.forEach((result, index) => {
    if (result.property) properties.set(selected[index], result.property);
    warnings.push(...result.warnings);
  });
  return { properties, warnings };
}
