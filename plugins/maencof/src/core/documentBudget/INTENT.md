# documentBudget

## Purpose

Measure Markdown readability budgets without changing content.

## Boundaries

### Always do

- Count the complete stored document and Unicode code points deterministically.

### Ask first

- Changing the initial 100-line or 6,000-body-character budgets.

### Never do

- Perform I/O, truncate documents, or depend on hooks/MCP.
