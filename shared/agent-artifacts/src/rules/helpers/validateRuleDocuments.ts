import type { ManagedRuleDocument } from "../../types/rules.js";
import { validateRuleDocument } from "./validateRuleDocument.js";

export function validateRuleDocuments(
  documents: readonly ManagedRuleDocument[],
): void {
  const ids = new Set<string>();
  const filenames = new Set<string>();

  for (const document of documents) {
    validateRuleDocument(document);
    if (ids.has(document.id))
      throw new Error(`Duplicate rule document id: "${document.id}"`);
    ids.add(document.id);

    for (const filename of [
      document.filename,
      ...(document.legacyFilenames ?? []),
    ]) {
      if (filenames.has(filename))
        throw new Error(`Duplicate rule document filename: "${filename}"`);
      filenames.add(filename);
    }
  }
}
