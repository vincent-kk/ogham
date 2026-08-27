import { readFileSync } from "node:fs";

/** Parse `fixtures/<name>.json` next to the tests. */
export function loadFixture<T = unknown>(name: string): T {
  const url = new URL(`../fixtures/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf-8")) as T;
}
