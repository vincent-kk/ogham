# kgInventory

## Purpose

Enumerate active vault documents independently of graph freshness, relevance and tags.

## Boundaries

### Always do

- Use the scanner allowlist, vault path guard and document parser through public entries.
- Bind pagination to filters and the disk snapshot; retain malformed documents as error items.

### Ask first

- Expanding enumeration beyond active L1–L5 knowledge areas.

### Never do

- Write vault files, follow symlinks, or require a graph rebuild.
