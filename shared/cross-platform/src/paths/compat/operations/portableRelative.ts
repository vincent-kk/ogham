import { apiFor } from "./apiFor.js";

export function portableRelative(from: string, to: string): string {
  return apiFor(from, to).relative(from, to);
}
