# @ogham/r-statistics

Turn Claude into a domain-agnostic **statistics expert** — hypothesis testing, R
code generation, and reproducible analysis via headless `Rscript`. The only
domain is statistical methodology itself; it never anchors to an application
field (medicine, physics, social science…).

## What it does

Given a dataset and a hypothesis, `r-statistics` runs a guided pipeline:

1. **Classify** the request and **select a method** (a statistician agent's
   decision tree over outcome type × design × assumptions).
2. **Check assumptions** and pass a **deterministic statistical gate** that
   blocks inappropriate methods before any analysis runs.
3. **Execute R** in an isolated workspace via headless `Rscript`, collecting
   plots, tables, and models as hash-verified artifacts.
4. **Validate** the result (assumption handling, multiplicity, effect sizes) and
   **report** it — optionally rendered to DOCX/HTML/PDF via Quarto.

A non-deterministic reasoning layer (agents) is wrapped above and below by a
deterministic state machine (the dispatcher) and deterministic execution (the
MCP tools) — so the analysis stays reproducible and the gate stays honest.

## How it works

A local MCP server (`tools`) exposes four execution tools — `run_r`,
`get_r_job`, `cancel_r_job`, `assert_analysis_plan`. The `analyze` skill is the
dispatcher; `statistician`, `r-expert`, and `methodology-validator` are the
reasoning agents. R runs `--vanilla` in a temp workspace behind a command gate
(no process spawning, filesystem escape, dynamic install, or network), against a
pre-built package whitelist.

## Usage

```
# Full analysis from data + hypothesis (interactive)
/r-statistics:analyze --data results.csv --question "does treatment change the outcome?"

# Unattended strict pipeline
/r-statistics:analyze --auto --data results.csv

# Single steps
/r-statistics:data-preparation   /r-statistics:assumption-check
/r-statistics:visualization      /r-statistics:reporting

# Check / install R
/r-statistics:r-setup
```

## Requirements

- Node.js ≥ 20.
- A local R installation (`Rscript`). Run `/r-statistics:r-setup` to detect or
  install it; set `R_STATISTICS_RSCRIPT` if R is on a non-standard path.

## Documentation

Design specification lives in [`.metadata/r-statistics/`](../../.metadata/r-statistics/). Korean: [README-ko_kr.md](./README-ko_kr.md).
