# Disk Inventory

## Requirements

Inventory is independent of graph freshness and relevance so maintenance can enumerate damaged or unindexed documents. Malformed frontmatter must remain visible instead of disappearing from the repair workload. Follow the scanner exclusion policy rather than introducing a second definition of active knowledge.

## API Contracts

Pagination binds the normalized filters and the disk snapshot; changed snapshots require restarting from the first page. Concurrent change detection is not a filesystem transaction. The schema and tests define field shapes, bounds, deterministic order and error codes.

## Acceptance Criteria

The inventory tests pin enumeration, filter boundaries, snapshot changes and malformed-document visibility.

## Last Updated

Update when inventory scope, pagination consistency or concurrent-change guarantees change.
