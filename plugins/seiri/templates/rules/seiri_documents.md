# Documents

> **Precedence**: repository instructions (CLAUDE.md, project rules) > repository conventions > this rule > seiri defaults — the higher source wins. A document stands in for what its reader does not hold: what it omits they never learn, and what it gets wrong they act on. Applies when you are writing or changing a document the repository authors for a person or an agent to use or change its code — agent assets (skills, rules), package documentation, READMEs, documentation sites — or a change record written for consumers (§8). Where the repository's tooling has a rule of its own for a document type, such as module contract documents, that rule applies too and its concrete limits win.

## 1. Record what the reader cannot establish

Every mental model, policy, invariant, rejected alternative, known limit and other idea that the intended reader cannot establish from what they hold (§2) is written down with its reason, and a policy or invariant also names the failure it prevents. Reasons and change permissions stay even when the behavior they govern is visible in code. When it is unclear whether the reader would establish something correctly, keep it.

## 2. Omit what the reader derives

A maintainer holds the source and tests; a consumer holds the published declarations, documents and tooling. A restatement of what that reader derives directly is a second copy that drifts, and stays out. For a sentence that §1 does not require, ask whether deleting it raises the chance that this reader acts wrongly; if it does not, delete it.

## 3. The present, and true

Documents state current behavior, every behavioral claim holds for the current code with its conditions intact, and history lives in version control and change records: no history section, dated note or "previously". A decision and its reason are present facts; when and how the decision was reached is history. Code examples that the repository can execute are copied from tests that run; other examples are checked against the current API whenever they are written or changed. Each stated behavioral limit is grounded in code or a test that the change description cites, and the document names that code or test only when its reader can open it.

## 4. One home per fact

Each fact lives in the one document its reader opens; other documents refer to it instead of restating it. A file that a host loads in place of the canonical one, such as `AGENTS.md` for Codex, points to the canonical file instead of copying it. A translation keeps its source's structure and changes with it in the same change; it is not a second home.

## 5. Sized for attention

Always-loaded text stays short: it keeps within the budgets the repository names, and a file without a budget moves detail out before it grows. Detail sits one link away, in a document whose name states its purpose. A document still over budget after §2 has removed what its reader derives is split by reader or purpose; required content is never dropped to fit.

## 6. Changed with the code

A change that alters a documented policy updates its document in the same change, before the code. A mismatch between a document and the code is a defect, fixed like a bug.

## 7. Judged by a fresh agent

The documents a repository names as evaluation targets (for example its agent rules and skills and its module boundary documents) are done when an agent with no prior context does its role's job correctly from fixed inputs: the role's documents and what §2 says the role holds. A consumer builds the requested feature through the public API, advanced features included; a maintainer makes the right change decision for the right reason. When a change alters what these documents teach, an evaluator other than the writer runs this check: it withholds solutions, grading and anything the role does not hold, counts a task only when it actually passes, compares with a run whose inputs differ only by the absence of the document, and keeps some tasks unseen by the writer. The writer fixes a failure at its general cause rather than by adding that task's answer. Every other document is written to pass the same test.

## 8. Change records for consumers

Change records (commit messages, pull request descriptions, changesets, generated changelogs and release notes) record history by design; this section governs the ones written for consumers. A changelog entry or release note is true and is written for a consumer who did not follow the work: the first sentence states the observable change and the rest says why it matters; a breaking change says so first and shows how to migrate, with code before and after. It names only the public API and leaves out internal paths, work-stage or round names, ticket or ledger IDs and review discussion. One entry covers one independent change, and several changes that build one release-line change, such as a major version, extend one entry instead of adding fragments.

---

**This rule is working if:** an agent with no prior context does its role's job from the documents and what §2 says its role holds, every remaining sentence is required by §1 or its deletion would raise the chance its reader acts wrongly, and a changed fact is edited in one place. **This rule is wrong for you if:** the text is generated — its generator or template owns the wording, so change that instead — or the repository authors no document beyond its code comments, which have their own rule.
