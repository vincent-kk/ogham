export function hasAsciiControlCharacter(
  value: string,
  scope: "all" | "line",
): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);
    if (
      scope === "all"
        ? characterCode <= 31 || characterCode === 127
        : characterCode === 0 || characterCode === 10 || characterCode === 13
    )
      return true;
  }
  return false;
}
