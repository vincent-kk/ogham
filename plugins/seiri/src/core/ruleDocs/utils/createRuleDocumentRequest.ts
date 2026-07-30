import type {
  ManagedRuleDocument,
  RuleDocumentRequest,
} from '@ogham/agent-artifacts';

export function createRuleDocumentRequest(
  documents: readonly ManagedRuleDocument[],
  selection: Iterable<string>,
  resync: Iterable<string>,
): RuleDocumentRequest {
  const selected = new Set(selection);
  const resynced = new Set(resync);
  const desired = new Set(
    documents
      .filter((document) => selected.has(document.id))
      .map((document) => document.id),
  );
  const replaceDrift = new Set(
    documents
      .filter(
        (document) => desired.has(document.id) && resynced.has(document.id),
      )
      .map((document) => document.id),
  );

  return { documents, desired, replaceDrift };
}
