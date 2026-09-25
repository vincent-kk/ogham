# Document Readability Budget

## Requirements

Warn about oversized documents without discarding knowledge.

## API Contracts

`measureDocumentBudget(markdown)` returns total_lines, body_chars, exceeded and reasons. Physical lines include frontmatter; LF and CRLF are equivalent, a final newline adds no phantom line, and an empty file has zero lines. Body characters are Unicode code points after a complete opening YAML frontmatter block; line endings normalize to LF. An unterminated block counts as body. Thresholds are strictly above 100 lines or 6,000 body characters.

`documentBudgetWarnings(markdown)` returns zero or one stable document_size_exceeded warning with measurements and maintenance advice. Consumers merge warnings.

## Acceptance Criteria

### AC-measurement — Document measurement

- Empty content, exact thresholds, CRLF, trailing newlines, frontmatter and supplementary Unicode characters follow the declared counting rules.
- Measurement and warnings never modify content.

## Last Updated

2026-09-26
