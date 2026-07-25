export function canonicalMcpValue(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((entry) => canonicalMcpValue(entry)).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, entry]) => `${JSON.stringify(key)}:${canonicalMcpValue(entry)}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}
