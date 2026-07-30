import { apiFor } from "./apiFor.js";

export function portableJoin(...parts: string[]): string {
  return apiFor(...parts).join(...parts);
}
