# Readable Knowledge Maintenance

Loaded by remember, ingest, recall and organize; this reference owns their shared writing and placement procedure.

## Rewrite the current account

1. Search for an existing account of the same subject, then `read` its complete body before writing. Search snippets are insufficient evidence.
2. Choose replace, merge or split. Integrate changed facts into the paragraphs they supersede; remove obsolete statements and repeated summaries. Preserve qualifications, uncertainty, dates that still matter, and original source links with their locations.
3. Send the complete revised body to `update`, retaining the document's identity and valid metadata. Read it back and check for contradictory old/new claims and broken references. With the same information, aim for equal or shorter length. Additional facts may justify growth, but repeated corrections do not.
4. Append only when the document's declared purpose is a chronological log, journal or source transcript. Label dated events so historical statements cannot be confused with the current account.

## Size and semantic chunks

`create`, `update` and `read` warn with `document_size_exceeded` above 100 physical Markdown lines (including frontmatter) or 6,000 body Unicode code points. LF/CRLF count equally; the final newline adds no line. Treat warnings as maintenance work, never as permission to truncate facts.

First remove repetition and integrate superseded passages. If independent topics remain, split at conceptual/heading boundaries. Keep a table, code block or quotation with the explanation and evidence needed to understand it. A child must stand alone without copying the whole parent context.

Before splitting, capture original bytes, metadata and references in a host execution artifact outside the knowledge graph. Choose stable meaningful child paths; inspect existing children on retries and reuse matching content. Create each child through MCP and `read` it back before shortening the original. Preserve source links/locations in each relevant child and retain the original path as a concise overview linking to the children. Preserve cited headings/block IDs in the overview or explicitly repair their inbound references before retiring them. Do not give independent children one shared `cluster_key`: search collapses that key to one representative.

If any child fails, leave the original complete and report created/failed/unattempted children. Do not delete the only complete copy or create timestamp-suffixed duplicates on retry. Recheck changed source hashes before replacing originals; do not overwrite concurrent edits.

## Place by subject

Within the selected layer and L3 sub-layer, compare existing directory purposes with the title, gist and full body. Choose a folder by the principal subject and kind of information; tags and graph relevance are secondary cross-cutting hints. Reuse existing folders. Propose a new meaningful topic folder only for a coherent group or an explicit user destination; leave an isolated document where it is otherwise. Never create tag-combination folders or one folder per document.

L2/L3/L4 allow at most two topic levels; L1/L5 remain flat. One canonical document belongs in one place; use links for secondary topics. Mixed-topic documents need a split before confident placement. Existing-vault relocation belongs to `/maencof:classify`; layer promotion remains `/maencof:organize`. Use returned actual paths rather than assuming create and move normalize names identically.

## Cite evidence where it supports a claim

Place the original source URL or vault-file link beside each substantive sourced claim, with its verified section/heading, full-file line range, page or timestamp. File line numbers include frontmatter. Prefer stable headings/anchors when appropriate. Preserve the claim's conditions and nuance; distinguish direct quotation from interpretation or inference. Read the surrounding source context before citing it.

Keep the existing `source` frontmatter as the representative source; use inline links or footnotes for multiple sources and claim-specific locations. Never invent line numbers or claim to have read inaccessible originals. Cite the secondary source actually consulted and state the limitation. Greetings and unsupported proposals do not need fabricated citations.
