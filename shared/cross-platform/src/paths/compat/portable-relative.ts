import { apiFor } from "./api-for.js";

export function portableRelative(from: string, to: string): string {
  return apiFor(from, to).relative(from, to);
}
