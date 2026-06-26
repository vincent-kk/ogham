# query-strategy (generation mode SSoT)

Methodology for building a recall-maximizing query set. The goal is **coverage**,
not precision — precision is the rerank step's job, and the deterministic union
keeps everything.

## 1. Decompose into facets

Break the topic into independent concept facets (PICO: Population, Intervention,
Comparison, Outcome — or domain-appropriate). Each facet is searched several ways
and combined; recall comes from expressing each facet broadly, then ANDing facets.

## 2. MeSH lookup per facet

Call `mesh-lookup`. Use:
- `descriptorName` / `descriptorUi` → the controlled term.
- `treeNumbers` → judge explosion scope (does `[mh]` pull in the right narrower terms?).
- `entryTerms` → synonyms for the `[tiab]` free-text role.
- `scopeNote` → disambiguate near-synonymous descriptors.

## 3. QueryRole spectrum (express each facet multiple ways)

| Role | Form | Breadth | Purpose |
|---|---|---|---|
| `ATM_BROAD` | untagged keywords | BROAD | leverage PubMed Automatic Term Mapping |
| `MESH_EXPLODED` | `Term[mh]` | BROAD | explosion — includes narrower MeSH |
| `MESH_NOEXP` | `Term[mh:noexp]` | NARROW | precise verification slice |
| `TIAB_SYNONYM` | synonyms/variants/abbrevs/US+UK spellings `[tiab]` | MEDIUM | catch not-yet-indexed recent papers |
| `ALL_FIELDS` | broad fallback | BROAD | safety net |
| `SIMILAR` (optional) | ELink Similar Articles via `seedPmids` | — | known-item expansion |

Combine facets with AND; combine roles within a facet with OR (the union does the
OR across queries). Cover synonyms, spelling variants (US/UK), abbreviations.

## 4. Keep mappings alive (recall hazards)

- Do **not** quote phrases — quotes turn off Automatic Term Mapping.
- Do **not** use wildcards (`*`) in broad roles — truncation disables ATM/explosion.
- Reserve `[mh:noexp]` and tight `[tiab]` for narrow roles only.
- Balance parentheses and field tags (the deterministic `queryLint` will warn).

## 5. Recall gate & ESpell

After `paper-search`, inspect `union.total_unique` and `warnings`:
- weak union → broaden: raise `breadth`, add `ATM_BROAD`/`MESH_EXPLODED`/`ALL_FIELDS`,
  relax narrow tags.
- ESpell OOV / spelling-warning / union 0 → apply the correction and regenerate.
- Stop when union growth <5%, or cap is exceeded, or budget/`recallIter ≤ 4` is reached.

Evaluation = facet coverage · role-spectrum completeness · synonym/spelling breadth
· lint-clean · ATM/explosion preserved.
