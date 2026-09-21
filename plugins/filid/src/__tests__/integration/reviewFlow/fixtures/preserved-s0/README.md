# preserved-s0

Review state prepared by the filid code of step S0 (branch `fix/filid-lexer-restructure-issues`, on top of `0bbe832a`). `preservedStateReplay.test.ts` replays it on the current code. **Never regenerate it:** its job is to prove that an old state still works with new code. A new state schema field must default when it is missing from this state.

## Layout

The fixture is kept flat. `helpers/restorePreservedReviewState.ts` recomputes the canonical `.filid/review/<normalizedBranch>/…` locations.

| Fixture path | Restored to |
| --- | --- |
| `config.json` | `.filid/config.json` (ignored review config) |
| `review-state.json` | `.filid/review/<normalizedBranch>/review-state.json` |
| `generation/` | `.filid/review/<normalizedBranch>/generations/<generationId>/` (2 groups, 2 FCA candidates) |
| `plugin/` | a temporary plugin root: `rules.json`, `default.md`, and the `reviewer.md`/`verifier.md` actor methods as they stood in S0 |

Every file keeps the bytes it was written with. Moving files into this layout changed no content.

## Placeholders

`<PROJECT_ROOT>` stands for the repository root, and `<PLUGIN_ROOT>` for the plugin root.

- `review-state.json` and `generation/generation-state.json`: only the `projectRoot` and `incremental.pluginRoot` fields use a placeholder. Both FCA candidate `message` strings keep the temporary path they were prepared under (`/private/tmp/claude-501/filid-review-flow-KUsiSg/…`). `evidenceHash` hashes those messages, so replacing that path would make every replay `review-inputs-stale`.
- `generation/evidence.md`, `generation/session.md` and `generation/briefs/review-0{1,2}.md`: every occurrence of the root is a placeholder, including the root inside candidate messages. No hash covers these files.
- The other files contain no absolute path.

## How it was produced

1. `createReviewRulePluginRoot()`, with `CLAUDE_PLUGIN_ROOT` pointed at the result.
2. `createPreservedReviewRepository()`. This builds `INTENT_GAP_REVIEW_REPOSITORY` through `createPinnedReviewRepository`, then applies `configureReviewGroups(root, 1)`. Git runs with a pinned identity and clock: author and committer `Filid Test <filid@example.test>` at `2026-01-01T00:00:00Z`, with `commit.gpgsign=false`, `core.autocrlf=false`, and global and system git config disabled. That makes HEAD `a5b1d465…` and main `bf8d0e9d…` on every machine.
3. `review_state` `prepare` with `{ branchName: 'feature/review-flow', baseRef: 'main', effort: 'low' }`.
4. The repository's `.filid/` tree and the plugin root were copied out from under the system temporary directory, with the placeholders substituted as described above. The files were then moved into the flat layout without changing their bytes.
