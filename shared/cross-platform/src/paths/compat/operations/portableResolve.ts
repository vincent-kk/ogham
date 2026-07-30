import { apiFor } from "./apiFor.js";

export function portableResolve(...parts: string[]): string {
  return apiFor(...parts).resolve(...parts);
}
