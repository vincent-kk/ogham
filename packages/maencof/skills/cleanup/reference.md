# cleanup — Reference

Detailed mode workflows, safety checks, and error handling.

## Document Mode — Vault Document Deletion

### Step 1 — Identify Target Document

Determine the deletion target from user input:

- Direct file path → use as target
- Keyword/title → search with `kg_search` and confirm with user
- Not specified → ask "Which document would you like to delete?"

### Step 2 — Preview Document

Read the target document to show content before deletion:

```
maencof_read(path: target path)
```

Display Frontmatter summary (title, layer, tags) and content preview.

### Step 3 — Layer 1 Check

If the target is in `01_Core/`:

```
Layer 1 (Core Identity) documents cannot be deleted.
These documents contain the core identity of the knowledge vault.

Alternative: Create a derived document in Layer 2 (02_Derived/) instead.
```

Abort the operation.

### Step 4 — Backlink Check

Check for documents that reference the target:

```
kg_navigate(path: target path, include_inbound: true)
```

If inbound links exist:

```
Warning: The following documents reference this file:
  - {referencing_doc_1}
  - {referencing_doc_2}

Deleting this document will break these links.
Proceed anyway? (y/n) or use --force to skip this warning.
```

### Step 5 — Execute Deletion

After user confirmation:

```
maencof_delete(path: target path, force: --force flag)
```

### Step 6 — Completion Report

```
Deleted: {title}
Path: {path}
Layer: {layer_name}

Note: Run `/maencof:rebuild` to update the index.
```

If backlinks were broken, list the affected documents.

---

## CLAUDE.md Mode — Section Management

### read submode

```
claudemd_read()
```

Display the section content or "No maencof section found in CLAUDE.md."

### remove submode

**Step 1** — Dry run first:

```
claudemd_remove(dry_run: true)
```

Display what would be removed.

**Step 2** — Confirm with user:

```
The following maencof section will be removed from CLAUDE.md:
{preview}

Proceed? (y/n)
```

**Step 3** — Execute removal:

```
claudemd_remove(dry_run: false)
```

Report success or failure.

## Error Handling

- **Layer 1 deletion attempt**: "Layer 1 (Core Identity) documents cannot be deleted."
- **Backlinks exist**: display referencing documents and request confirmation (or use `--force`)
- **Document not found**: "No document found at the specified path."
- **CLAUDE.md not found**: "No CLAUDE.md file found in the current directory."
- **No maencof section**: "No maencof section found in CLAUDE.md."
