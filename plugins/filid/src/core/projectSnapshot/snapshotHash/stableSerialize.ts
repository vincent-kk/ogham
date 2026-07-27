export function stableSerialize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '{"$undefined":true}';
  if (typeof value === 'bigint') return `{"$bigint":"${value.toString()}"}`;
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  if (value instanceof Map)
    return stableSerialize(
      [...value.entries()].sort(([left], [right]) =>
        String(left).localeCompare(String(right)),
      ),
    );
  if (value instanceof Set)
    return stableSerialize(
      [...value.values()].sort((left, right) =>
        String(left).localeCompare(String(right)),
      ),
    );

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
    .join(',')}}`;
}
