export function canonicalizeAgyModelName(model: string): string {
  const tabIndex = model.indexOf('\t');
  return (tabIndex === -1 ? model : model.slice(0, tabIndex)).trim();
}
