---
name: reporting
user_invocable: true
description: '[r-statistics:reporting] Assemble a statistical report — descriptive Table 1, effect sizes with confidence intervals, multiple-comparison correction — and render it to DOCX/HTML/PDF via Quarto. Trigger: "make a Table 1", "write up the results", "export a report", "effect size", "결과 보고서", "표 1 만들어줘"'
argument-hint: '[--format docx|html|pdf]'
version: '1.0.0'
complexity: moderate
plugin: r-statistics
---

# reporting — Tables · Effect Sizes · Quarto Export

Turn analysis results into a reproducible report. Execution runs through
`mcp_tools_run_r`; a full pipeline also routes the draft past
`methodology-validator` for the multiplicity / effect-size review.

## Steps

1. **Descriptive Table 1.** Build a summary table (by group when relevant) with
   `gtsummary::tbl_summary` and save it (`table.descriptive`).
2. **Effect sizes.** Report the effect size and its confidence interval, not
   just the p-value — Cohen's d / Hedges' g (`rstatix`), η²/partial η² for ANOVA,
   odds/hazard ratios for regression. Save as `table.effect_size`.
3. **Multiplicity.** With multiple tests, apply and state a correction
   (`p.adjust`: Bonferroni / Holm / BH-FDR). Uncorrected multiple testing is a
   soft block — surface it for the validator (strict in `--auto`).
4. **Render.** Assemble a Quarto document and render to the requested format
   (`quarto`: DOCX / HTML / PDF). Save the rendered file as `report.document`.

## Output

- `table.descriptive`, `table.effect_size`, and the rendered `report.document`.
- A note on which multiplicity correction was applied (or why none was needed).

## Boundaries

### Always do

- Report effect sizes + CIs alongside p-values.
- State the multiple-comparison correction explicitly.

### Never do

- Export uncorrected multiple-testing results as final without flagging it.
- Overstate conclusions beyond what the results support.

Reply in the user's language. Technical terms and identifiers stay as-is.
