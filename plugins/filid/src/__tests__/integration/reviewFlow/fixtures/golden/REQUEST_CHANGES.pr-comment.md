## Code Review Governance — REQUEST_CHANGES

| Field | Value |
| --- | --- |
| Verdict | REQUEST_CHANGES |
| Confirmed defects | 1 |
| Review complete | true |
| Human decision required | false |
| Agent next action | Apply the confirmed corrections and run a fresh review. |
| Branch | `feature/review-flow` |
| Base | `main` |
| Snapshot | `310e5bc9971df4bdc1a55507cdbc17cbaa1b65c1cb629e96186ffac2699e06f3` |
| Coverage | 1 reviewed · 1 skipped · 2 total |
| Findings | 1 confirmed · 0 refuted · 0 indeterminate |
| Generated | <SEALED_AT> |

<details><summary>Confirmed findings (1)</summary>

| ID | Severity | Category | Path | Rule | Consequence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R01-001 | error | bug | src/value.ts:1-1 | DEF-1 | Consumers observe the wrong value. | Restore the intended exported value. |

</details>

<details><summary>Coverage and verification log</summary>

### Coverage

1 / 1 reviewable files reviewed; 0 pending; 1 excluded; 2 total

### Exclusions by reason

| Reason | Count | Representative paths |
| --- | --- | --- |
| lockfile | 1 | yarn.lock |

| Path | Change | Group | Result | Reason |
| --- | --- | --- | --- | --- |
| src/value.ts | M | 01 | reviewed |  |
| yarn.lock | M |  | skipped | lockfile |

### Verification Log

| Candidate | Category | Verdict | Evidence | Reason |
| --- | --- | --- | --- | --- |
| R01-001 | bug | CONFIRMED | src/value.ts:1 | The changed export decides the claim. |

</details>

<details><summary>Unresolved evidence</summary>

none

</details>

> Full report: `<ROOT0>/.filid/review/feature-review-flow-2e365613ffba42eb360cbdad7cd561ee3e975c5b9d31ceee76372df880e8545e/generations/<GENERATION>/review-report.md`
