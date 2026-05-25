import { apiFor } from "./api-for.js";

export function portableBasename(p: string): string {
  return apiFor(p).basename(p);
}
