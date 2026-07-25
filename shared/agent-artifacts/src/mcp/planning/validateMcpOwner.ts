export function validateMcpOwner(owner: string): string | null {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(owner)
    ? null
    : "owner must be lowercase kebab case";
}
