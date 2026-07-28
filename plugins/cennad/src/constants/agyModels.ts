// agy spells one model two ways, and both carry the same variant vocabulary:
// a display name puts it in parentheses ("Gemini 3.6 Flash (High)") and the
// catalog `agy models` prints appends it to the slug ("gemini-3.6-flash-high").
// A slug ending in one of these splits into base + variant; a tail that is not
// one — the version in `claude-sonnet-4-6` — belongs to the base. A variant agy
// adds later stays part of the base, which still dispatches correctly because the
// name is then sent unchanged.
// The settings page mirrors this list (see src/mcp/pages/settings/scripts/app.js).
export const AGY_VARIANT_SUFFIXES = [
  'high',
  'medium',
  'low',
  'thinking',
] as const;
