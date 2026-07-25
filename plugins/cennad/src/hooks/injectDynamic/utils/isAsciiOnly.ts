// Decides which matching rule a keyword gets: ASCII keywords are
// boundary-checked, keywords carrying anything else match as substrings.
export function isAsciiOnly(value: string): boolean {
  for (let index = 0; index < value.length; index += 1)
    if (value.charCodeAt(index) > 0x7f) return false;
  return true;
}
