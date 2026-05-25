import { apiFor } from "./api-for.js";

export function portableResolve(...parts: string[]): string {
  return apiFor(...parts).resolve(...parts);
}
