---
name: classify
user-invocable: true
description: 'Group existing vault documents into readable topic directories independently of tags. Use for classification, folder cleanup or reorganizing a vault within its current layers.'
argument-hint: '[--path VAULT_RELATIVE_PREFIX] [--apply]'
version: '1.0.0'
complexity: complex
context_layers: [1, 2, 3, 4, 5]
orchestrator: active agent
plugin: maencof
---

# classify — Topic Directory Organization

Loaded through the plugin skill registry; the active agent performs this workflow without a new specialist agent.

## Contract

Default invocation is read-only preview. `--apply` executes the exact reviewed plan within existing authorization; it never authorizes a new unreviewed plan. Do not repeat approval for an already authorized scope. Load [reference.md](./reference.md) and [document-maintenance.md](../.shared/document-maintenance.md) before planning.

Classify L2/L3/L4 within the same layer and same sub-layer. L1, L5, archive, settings and caches are not move candidates. Keep L1/L5 flat and topic depth at most two. L5 promotion and other layer transitions belong to organize; mixed-topic documents go to organize --maintenance first.

## Workflow

1. Enumerate all active L1–L5 documents with `kg_inventory`, following every `next_cursor`. Restart after inventory_changed. Reconcile totals and retain parse errors as held items. `--path` restricts move candidates only, never the reference scan.
2. Read candidate bodies using `read`. Group by principal subject, kind of information and existing folder purpose; tags are secondary. Reuse coherent folders, keep singletons in place unless a meaningful user destination exists, and use links for secondary topics. Do not clone documents or invent tag-combination folders.
3. Read the full active inventory for references, including outside --path. Build the reference ledger and snapshot described in reference.md; capped kg_navigate results are only supplementary. Identify ambiguous links, forbidden L1 edits and parse errors before proposing moves.
4. Present current/proposed trees and a table: old path → proposed path, topic rationale, inbound/outbound edits, held reason. Account for every candidate as move/unchanged/held/error. State that archive, root nonknowledge documents, other vaults and external applications are outside the reference guarantee.
5. Retain original bytes, hashes, ledger and the reviewed plan in a host execution artifact outside the KG. Before applying, repeat full inventory and body checks to detect concurrent edits or new references, not just changes to moved files. Re-preview changed groups.
6. Apply approved groups using MCP `move` and `update`, at most five moves per execution batch. Keep L3 target_sub_layer explicit; `target_subdirectory: ""` returns to its root. Use the returned actual path. Rebase outbound relative links and repair inbound links while preserving target identity, display text, aliases and fragments. No raw-shell vault I/O or global string replacement.
7. After each group, read and resolve affected links, verify expected target identities and fragments, and check content/metadata preservation. On partial failure stop subsequent moves and follow conditional rollback. Reuse the freshness path without automatically requesting kg_build(force:true).
8. Report moved/unchanged/held/failed/unattempted paths and remaining recovery actions. A second classification of the same final state should propose no moves.

## Tool Roles

- `kg_inventory`: graph-independent complete disk inventory and pagination.
- `read`: full bodies, source locations, snapshots and postconditions.
- `move`: approved same-layer relocation, including explicit root return.
- `update`: complete rewritten bodies for exact link repairs; preserve metadata and obey L1 guards.
- `kg_status` / `kg_navigate`: connection/freshness and supplementary graph evidence; never proof of reference completeness.

If the host cannot retain snapshots, compute hashes, safely identify link occurrences, or access protected reference documents, hold the affected move and explain the missing evidence. Do not substitute confidence for verification.
