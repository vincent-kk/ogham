import { apiFor } from "./apiFor.js";

export function portableIsAbsolute(path: string): boolean {
  return apiFor(path).isAbsolute(path);
}
