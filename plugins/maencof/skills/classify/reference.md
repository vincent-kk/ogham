# Classification Reference Preservation

## Preview artifact

Store outside the KG: inventory snapshot_id and all pages; original bytes and hashes of every active document; approved old→new map; topic rationale; unchanged/held/error items; affected references; operation results and hashes of this run's writes. A path-limited request still scans all active L1–L5 references. Malformed/unreadable documents leave reference coverage uncertain: hold moves they could affect unless their raw body can be inspected reliably.

Each internal reference has `{source_path, source_hash, occurrence, raw_target, resolved_target_before, fragment, expected_target_after}`. `occurrence` is a unique offset/span in the exact captured source, not a repeated substring. Expected targets come from applying the move map to resolved_target_before. Record already-broken links separately from new failures.

## Resolve before expressing a new path

- Match the graph's resolver semantics: explicit ./ and ../ Markdown targets are relative to the source directory; other paths try vault-root resolution, then the existing basename fallback. Wiki targets omit .md when written; separate #heading or #^block fragments and |display aliases before resolving.
- A basename that resolves only because sorted paths select the first duplicate is ambiguous. Never adopt that arbitrary choice as user intent. Hold the move or obtain evidence for an explicit target, then write a qualified vault path. Unchanged unique basenames may remain only if they still identify the same document after all moves.
- Capture absolute vault target identity before moving either source or target. For a moved source, compute new ./ or ../ expressions relative to its new parent, preserving the original target. For a moved target, apply the approved map before computing the new reference.
- Preserve Markdown display text, wiki aliases and heading/block fragments. A same-file #fragment stays with its source. Verify each fragment in the target text, maintaining a baseline of previously broken anchors. URL-encoded paths, reference-style links, embeds or other syntax that cannot be parsed and preserved reliably are held, not guessed.
- Ignore fenced/inline code and external URLs. Rewrite only identified link target spans in their captured source; never replace every matching string. Re-read a source before update and compare its source_hash.
- L1 references are inspected under existing identity protections; classify itself cannot amend L1. If a move requires changing a protected L1 reference, hold that move for the existing identity-guardian flow. Lack of access to L1 is incomplete reference coverage, not absence of references.

## Preflight and concurrency

Before the first mutation, enumerate all active documents again and compare paths and body hashes, including unchanged and scope-external reference sources. inventory_changed, added/removed documents, a new reference, changed body or target collision invalidates the affected plan. Rebuild the preview; do not overwrite new edits. Recheck each affected source before its update. This detects observed concurrent changes but does not lock external editors or promise an atomic batch.

## Apply, postconditions and partial failure

Use move/update only on the exact approved map and reference edits. Process dependency groups in batches of at most five moves; this is not a new approval boundary. Avoid chains or swaps with occupied destinations until a collision-free explicit sequence is reviewed. Preserve tags, source, created and substantive body; move may update updated and graph directory relationships.

After each group, inventory and read the actual returned paths. Resolve every captured reference again and assert its resolved target equals expected_target_after with the same fragment, alias and display text. A link that merely resolves somewhere is insufficient. Inspect all active sources for newly introduced broken or misdirected links, including those outside --path and beyond graph neighbor limits. Verify source path absence and destination content; a no-op leaves bytes unchanged.

On any partial failure, stop further groups. Record success/failed/unattempted operations. Roll back only paths whose current bytes/hash still match this run's last write. Restore moved files using reverse move (explicit empty target_subdirectory for old roots, original L3 sub-layer) and update original bodies/metadata only where existing APIs can preserve them. Confirm free rollback destinations first. Never overwrite concurrent edits or claim byte-exact recovery if the API changes timestamps; retain originals and list manual recovery needs. Retrying consumes this manifest and the current inventory rather than generating duplicate moves or timestamp-suffixed documents.

## Review examples

Two PostgreSQL notes with different tags may share databases/postgresql. A gardening note with the same performance tag stays separate. A note mixing project architecture and cooking is held for semantic splitting. Unique links outside --path must still be repaired. Duplicate note.md basenames are held or explicitly qualified before relocation. A blocked L1 inbound repair holds its target's move. Archive/root/external-vault references remain outside the stated guarantee.
