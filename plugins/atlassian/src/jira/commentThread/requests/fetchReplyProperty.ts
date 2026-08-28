import type { FetchContext } from "../../../types/index.js";
import { attachPrefix } from "../../../utils/index.js";
import { parseReplyProperty } from "../operations/parseReplyProperty.js";
import type { ReplyProperty } from "../operations/wire.js";
import type { RequestFn } from "./requestFn.js";

/** First readable property among `keys` for one root comment; a warning per key that failed. `key` reaches the URL only through `encodeURIComponent`. */
export async function fetchReplyProperty(
  context: FetchContext,
  request: RequestFn,
  rootId: string,
  keys: readonly string[],
): Promise<{ property: ReplyProperty | null; warnings: string[] }> {
  const warnings: string[] = [];
  for (const key of keys) {
    const endpoint = attachPrefix(
      `/comment/${encodeURIComponent(rootId)}/properties/${encodeURIComponent(key)}`,
      "jira",
      context.apiVersion,
    );
    const response = await request(context.http, { method: "GET", endpoint });
    if (!response.success) {
      warnings.push(
        `comment ${rootId}: property ${key} unavailable (HTTP ${response.status})`,
      );
      continue;
    }
    const property = parseReplyProperty(
      (response.data as { value?: unknown } | null)?.value,
    );
    if (property) return { property, warnings };
  }
  return { property: null, warnings };
}
