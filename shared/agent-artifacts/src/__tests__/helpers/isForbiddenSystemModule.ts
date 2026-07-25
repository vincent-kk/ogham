const forbiddenSystemModules = new Set(["fs", "path", "os", "child_process"]);

export function isForbiddenSystemModule(specifier: string): boolean {
  if (!specifier.startsWith("node:")) return false;
  const [moduleName] = specifier.slice("node:".length).split("/");
  return forbiddenSystemModules.has(moduleName ?? "");
}
