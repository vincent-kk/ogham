# Disk Inventory

## Requirements

Read active L1–L5 Markdown paths without graph or seed requirements. Exclude archive, root files, hidden files and symlinks using the existing scanner policy. Malformed frontmatter remains visible with parse_error.

## API Contracts

`handleKgInventory(vaultPath, {path_prefix?, layer_filter?, cursor?, limit?})` returns items, total, snapshot_id, optional next_cursor/warnings, or error. Limit defaults to 100 and is an integer from 1 through 200. An empty layer filter includes all layers. Prefix is a contained vault-relative directory or exact document path; matching respects directory boundaries.

Items include path, mtime and available validated title/layer/sub_layer/gist/tags. Pagination uses deterministic code-unit path order and binds the cursor to normalized filters and a fingerprint of all active paths, mtimes and sizes. A changed snapshot returns inventory_changed and requires restarting from the first page. Invalid cursor/input returns invalid_inventory_input. Concurrent scan/read failure returns inventory_changed; this is detection, not a filesystem transaction.

## Acceptance Criteria

### AC-enumeration — Disk inventory

- More than 200 documents paginate exactly once without a graph; damaged documents remain countable.
- Filter boundaries, limit bounds, changed files, changed filters and symlink exclusions are enforced.
- Registration is a read tool with needsFreshness:false and preserves all declared inputs.

## Last Updated

2026-09-26
