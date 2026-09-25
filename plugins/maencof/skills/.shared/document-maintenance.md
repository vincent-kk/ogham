# Readable Knowledge Maintenance

Loaded by remember, ingest, recall and organize; owns shared writing and placement.

## Rewrite the current account

1. Search for an existing account; `read` its full body before writing. Snippets are insufficient.
2. Replace, merge or split: integrate corrections in place; remove obsolete claims and repetition. Preserve qualifications, uncertainty, relevant dates and source links/locations.
3. `update` the complete revised body, preserving identity and valid metadata; read back for contradictions and broken references. Aim for equal or shorter length unless facts increase; repeated corrections do not justify growth.
4. Append only to declared chronological logs, journals or source transcripts; date events to distinguish history from current claims.

## Size and semantic chunks

`create`/`update`/`read` emit `document_size_exceeded` above 100 physical Markdown lines including frontmatter or 6,000 body Unicode code points. LF/CRLF count equally; final newline adds no line. Resolve warnings; never truncate facts.

Remove repetition and integrate superseded passages first; split remaining independent topics at conceptual/heading boundaries. Keep tables, code and quotations with necessary explanation/evidence. Children must stand alone without copying the whole parent context.

Before splitting, save original bytes, metadata and references in a host execution artifact outside the graph. Choose stable, meaningful child paths; on retries inspect existing children and reuse matches. Create each child through MCP and `read` back; shorten the original only after all children verify. Preserve source links/locations in relevant children. Keep the original path as a concise linked overview; preserve cited headings/block IDs there or repair inbound references before retiring them. Never share one `cluster_key` across independent children: search collapses it to one representative.

On child failure, keep the original complete; report created/failed/unattempted children. Never delete the only complete copy or create timestamp-suffixed retry duplicates. Recheck changed source hashes before replacing originals; never overwrite concurrent edits.

## Place by subject

Within the selected layer and L3 sub-layer, compare directory purposes against title, gist and full body. Choose by principal subject and information kind; tags/graph relevance are secondary hints. Reuse folders. Propose meaningful topic folders only for coherent groups or explicit user destinations; otherwise leave isolated documents in place. Never create tag-combination or per-document folders.

L2/L3/L4: at most two topic levels; L1/L5: flat. Keep one canonical document in one place; link secondary topics. Split mixed topics before confident placement. Existing-vault relocation: `/maencof:classify`; layer promotion: `/maencof:organize`. Use returned actual paths; never assume create/move normalize identically.

## Cite evidence beside claims

For each substantive sourced claim, cite its original URL or vault-file link beside it, with a verified section/heading, full-file line range (including frontmatter), page or timestamp. Prefer stable headings/anchors where appropriate. Read surrounding source context first; preserve conditions/nuance and distinguish quotation from interpretation/inference.

Retain representative `source` frontmatter; use inline links/footnotes for multiple sources and claim-specific locations. Never invent line numbers or claim to read inaccessible originals: cite the consulted secondary source and disclose the limitation. Greetings and unsupported proposals need no fabricated citations.
