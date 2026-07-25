export function normalizeImportTarget(value: string): string {
  return value.replaceAll("\\", "/");
}
