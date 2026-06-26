---
name: download
user_invocable: true
description: '[entrez:download] Download PMC Open Access full text (PDF/XML/TAR) for PMIDs/PMCIDs; report links for non-OA. Trigger: "download the pdf", "get full text", "전문 받아줘", "pdf 다운로드"'
argument-hint: "[--format pdf|xml|tar] [--out <dir>] <pmid|pmcid ...>"
version: "1.0.0"
complexity: simple
plugin: entrez
---

# download — PMC Open Access full text

Fetch full text for PMIDs/PMCIDs (or records from a prior `search`). Principle:
**OA → save; non-OA → report links**. Licenses are checked (a PMCID does not
imply redistribution rights).

## Procedure

1. Call `mcp_tools_fetch-fulltext` with `{ ids[], formats?, outDir?, overwrite? }`
   (formats default `[PDF]`).
2. Report:
   - `downloaded[]` — saved files with `path`, `sha256`, `bytes`, `license`,
     `oaStatus`.
   - `unavailable[]` — `reason` (NO_PMCID | NOT_OA | NOT_FOUND | FETCH_FAILED |
     LICENSE_UNVERIFIED) with fallback `links` (doi / publisher).
3. Surface the license for each saved item; if a license cannot be verified the
   tool withholds the file and returns a link instead.

## Notes

- The tool resolves PMID → PMCID (idconv) then checks oa.fcgi; per-format
  failures are isolated. Contract: [`../_shared/mcp-tools.md`](../_shared/mcp-tools.md).
- Files are written only inside the declared `outDir` (path-escape is refused).
