import { apiFor } from "./apiFor.js";

export function portableBasename(p: string): string {
  return apiFor(p).basename(p);
}
