import { apiFor } from "./apiFor.js";

export function portableDirname(p: string): string {
  return apiFor(p).dirname(p);
}
