import { apiFor } from "./api-for.js";

export function portableJoin(...parts: string[]): string {
  return apiFor(...parts).join(...parts);
}
