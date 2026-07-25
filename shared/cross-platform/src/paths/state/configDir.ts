import envPaths from "env-paths";

export function configDir(scope: string): string {
  return envPaths(scope, { suffix: "" }).config;
}
