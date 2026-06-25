# analyze — Intent Classification

Deterministic-first classification at `CLASSIFY`. Match the strongest signal;
when ambiguous between a full run and a single step, prefer asking
(`needs-clarification`) in `interactive` mode and the fuller path in `--auto`.

| intent | signals | route |
| --- | --- | --- |
| `full-analysis` | data **and** a hypothesis/question **and** a request to analyze, compare, model, or test | full pipeline |
| `partial-step` | a single scoped ask — "just the boxplot", "only check normality", "make a Table 1" | the matching sub-skill directly |
| `troubleshoot` | an R error, stack trace, or a failed job to fix | `r-expert` directly |
| `methodology-query` | a methods question with no execution ask — "which test?", "is a t-test appropriate here?" | `statistician` directly |
| `needs-clarification` | data but no question, or a question but no data, or contradictory asks | ask the user the missing piece |

## Partial-step routing

| ask | sub-skill |
| --- | --- |
| load / profile / clean / impute | `data-preparation` |
| normality / homogeneity / independence test | `assumption-check` |
| plot / chart / figure | `visualization` |
| Table 1 / effect size / report / Quarto / DOCX | `reporting` |
| install / find R / environment | `r-setup` |

## Notes

- A request that supplies data and asks "is the difference significant?" is
  `full-analysis`, not `partial-step`.
- "What test should I use?" with no data to run on is `methodology-query`.
- Treat an explicit `--data PATH` plus a question as `full-analysis`.
