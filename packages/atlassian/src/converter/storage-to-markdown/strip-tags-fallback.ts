export function stripTagsFallback(storageXhtml: string): string {
  return storageXhtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
