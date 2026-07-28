// Guard for parsing anything that arrives as JSON — CLI streams, agy's on-disk
// transcript, its model catalog. Arrays are excluded: an array indexes by number and
// none of those payloads mean one when they say "object".
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
