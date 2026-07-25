import type { RuleDocumentSelector } from "../../types/rules.js";

export function validateRuleDocumentSelector(
  selector: RuleDocumentSelector,
): void {
  const filenames = [selector.filename, ...(selector.legacyFilenames ?? [])];
  if (new Set(filenames).size !== filenames.length)
    throw new Error(`Duplicate rule document filename: "${selector.filename}"`);

  for (const filename of filenames)
    if (
      !/^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/.test(filename) ||
      filename === "." ||
      filename === ".."
    )
      throw new Error(`Invalid rule document filename: "${filename}"`);
}
