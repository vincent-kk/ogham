# rerank (rerank mode SSoT)

Order pre-scored candidates by relevance to the information need. This is the
precision step — but it must **preserve recall**: it only reorders.

## Inputs

- The information need (topic / question, with any constraints).
- `records[]` — pre-scored top-N candidates (`PaperRecord`: pmid, title,
  abstract, year, journal, mesh, `hit_by[]`, `query_role[]`). The deterministic
  pre-score has already narrowed the field; you never see the full union.

## Method

1. For each candidate, judge semantic fit to the information need (topic match,
   study type/relevance, recency where it matters).
2. Assign a calibrated `score` (e.g. 0–1) and a short, verifiable `reason`.
3. Sort by score. Output `{ ranked: [{ pmid, score, reason }] }`.

## Hard rules

- **Ordering only** — never drop a candidate (removal would break the recall
  guarantee; data flow ③ is "sort only").
- **Never invent a pmid** — every output pmid must appear in the input.
- Do not consider which query produced a record (avoid self-bias toward your own
  generated queries); judge only fit to the information need.

## Evaluation

Semantic alignment with the need · score calibration · reason validity · recall
preserved (input set ⊆ output set, same membership).
