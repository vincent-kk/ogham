import { pathForCompare } from "./path-for-compare.js";

export function samePath(a: string, b: string): boolean {
  return pathForCompare(a) === pathForCompare(b);
}
