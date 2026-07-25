import envPaths from "env-paths";

export function cacheDir(scope: string): string {
  return envPaths(scope, { suffix: "" }).cache;
}
