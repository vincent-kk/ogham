# documentBudget

## Purpose

Measure Markdown readability budgets without changing content.

## Conventions

Oversize content produces maintenance advice; preserving knowledge takes precedence over satisfying the readability budget.

## Boundaries

### Always do

- Count the complete stored document and Unicode code points deterministically.

### Ask first

- Changing the initial 100-line or 6,000-body-character budgets.

### Never do

- Perform I/O, truncate documents, or depend on hooks/MCP.
