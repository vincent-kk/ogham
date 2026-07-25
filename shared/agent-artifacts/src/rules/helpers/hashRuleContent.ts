import { createHash } from "node:crypto";

export function hashRuleContent(
  content: string | Uint8Array | null,
): string | null {
  if (content === null) return null;
  return createHash("sha256").update(content).digest("hex");
}
