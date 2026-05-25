import { apiFor } from "./api-for.js";

export function portableDirname(p: string): string {
  return apiFor(p).dirname(p);
}
