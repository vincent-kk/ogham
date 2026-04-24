# Implementation Plan v3 — filid Schema Validation & Waiver Mechanisms (v0.4.0)

- **Source request**: `packages/filid/docs/requests/2026-04-24-schema-validation-and-waiver-mechanisms.md`
- **Plan version**: v3 (consensus: Planner → Architect → Critic, 2 iterations)
- **Verdict trail**: Architect v1 SYNTHESIS 78 → Critic v1 ITERATE 72 → Architect v2 ITERATE-LIGHT 76 → Critic v2 ACCEPT-WITH-RESERVATIONS 82
- **User-confirmed decisions**: P1=C (zod strict + warn fallback), P2=unified `exempt`, Release=single v0.4.0

---

## 1. Architecture Decision Record (ADR)

### Decision

Deliver a single v0.4.0 minor release that fixes P1-P6 as a unified change set, split into 7 layer-ordered commits with per-commit changeset entries and a revert dependency matrix.

### Drivers

1. **Recurrence prevention** — the pipeline PASSing a no-op commit must become structurally impossible at both upstream (Phase D validation) and downstream (revalidate gate).
2. **Waiver consistency** — a single `RuleOverride.exempt` glob mechanism instead of per-rule escape hatches that accumulate over time.
3. **Observability** — config warnings must reach the LLM through MCP tool responses, not be lost to a gated stderr logger.

### Alternatives Considered

| Alternative | Status | Reason for rejection |
|---|---|---|
| v0.3.8 patch (P1+P4+P5+P6) + v0.4.0 minor (P2+P3), per source request §8 | Rejected | User chose single-release cadence. Mitigated by per-layer commit graph + per-commit changeset enabling `git revert` at layer granularity. |
| P1 A-only (manual allowlist warn, no zod) | Rejected | Drift risk: allowlist must track schema by hand. zod already in `dependencies@3.23.8`, zero new dep. |
| P1 B-only (zod strict, fail on unknown) | Rejected | Returning `null` for legacy configs with harmless unknown keys breaks existing users. |
| P2 per-rule `allowed-no-entry` field | Rejected | Violates Principle 3; each future rule needing waiver would accrue its own field. |
| Keep `loadConfig` signature + separate `mcp_t_config_diagnose` tool | Rejected | Dual API is a drift source; `configWarnings` belongs alongside the config it describes. |
| Phase D chairperson reads `filid-config.ts`/`rules.ts` each run (no new MCP tool) | Rejected | SKILL.md is an LLM directive — it cannot execute zod. Token cost grows with fix_item count. MCP tool encapsulates validation as a single call. |

### Why Chosen

- **P1 C hybrid** catches 100% of unknown keys on the strict path, preserves backward compat on fallback with *loud-drop* (warn + remove from parsed object), so downstream cannot mistake a dropped key for applied config.
- **Unified `exempt`** is wrapped in `applyOverrides` exactly once — no boilerplate across the 8 rule bodies, `Rule.check` purity preserved.
- **`mcp_t_config_patch_validate`** operationalises the "import zod schema" intent as an MCP round-trip; Phase D chairperson calls it instead of reading source.
- **Layer-ordered commit graph** matches actual dependency direction (type → runtime → surface → skill → docs), making `git revert` safe at layer granularity rather than spurious P granularity.

### Consequences

- **Internal API break**: `loadConfig` returns `{ config, warnings }` instead of `FilidConfig | null`. Ships in v0.4.0 minor under 0.x semver relaxation with a `BREAKING CHANGE:` footer on Commit C and a migration block in CHANGELOG (`const config = loadConfig(p)` → `const { config } = loadConfig(p)`).
- `FilidConfig` interface is removed and replaced by `z.infer<typeof FilidConfigSchema>` — type-shape preservation is guarded by AC12.
- MCP tool count: 17 → 18. CLAUDE.md updated.
- `configWarnings?: string[]` added to all config-loading MCP tool responses (additive, non-breaking external).

### Follow-ups (out of v0.4.0 scope)

- Promote `agents/` to a fractal and extract a shared "Config Proposal Discipline" doc (currently duplicated across 4 persona files).
- Consider `docs/plans/` lifecycle policy (archive criteria, naming).

---

## 2. RALPLAN-DR Summary

### Principles

1. Silent failure is worse than loud failure.
2. Backward compatibility over strictness.
3. One waiver mechanism, consistently applied.
4. File-diff is necessary but not sufficient.
5. Hallucination containment at source AND sink.

### Pre-mortem (deliberate mode)

1. **External CI treats warnings as errors** — zod warnings break downstream CI.
   *Mitigation*: warn text includes `(ignored, non-fatal; see migration guide)` marker; CHANGELOG has migration section.
2. **`exempt: ['**']` overly broad — incident recurs because a fractal tree-wide wildcard disables the rule.**
   *Mitigation*: `loadConfig` rejects the bare `**` pattern at load time (log.warn + drop). Users must name concrete scopes (`packages/**`, `src/legacy/**`).
3. **`mcp_t_config_patch_validate`'s schema drifts from `filid-config.ts`** — the fix becomes the new hallucination source.
   *Mitigation*: SSoT — the new MCP tool *re-exports* `FilidConfigSchema` and performs zero local schema definition. AC12 greps for `z.object({` inside the tool directory (expected: 0).

---

## 3. Layer-Ordered Commit Graph

| # | Layer | Scope | Changeset |
|---|---|---|---|
| A | type/schema | `src/types/rules.ts` (`RuleOverride.exempt?: string[]`) · `src/core/infra/config-loader/loaders/filid-config.ts` (new `FilidConfigSchema`, `RuleOverrideSchema`, `AllowedEntrySchema`; `FilidConfig = z.infer<…>`, interface removed) | minor |
| B | runtime | `src/core/rules/rule-engine/utils/is-exempt.ts` (new, throw-safe glob via `fast-glob`) · `rule-engine.ts` (`withExempt` wrapper inside `applyOverrides`, object-entry branch in `zero-peer-file`) | minor |
| C | loader sanitize | `filid-config.ts` `loadConfig` → `{ config, warnings }` · `parseWithAllowlistWarn` fallback (unknown-key **drop + warn**, not pass-through) · load-time exempt glob dry-validation · callsite refactor (structure-validate, rule-query, drift-detect, build-minimal-context, agent-enforcer, fractal-scan — 6 consumers) | minor + BREAKING footer |
| D | MCP surface | `src/mcp/tools/config-patch-validate/` (new fractal: INTENT.md ≤ 20 lines + index.ts + config-patch-validate.ts; tests in `src/__tests__/unit/mcp/` per repo convention) · server registration · `configWarnings?: string[]` on `structure-validate`/`rule-query`/`drift-detect` responses · CLAUDE.md "17 → 18 MCP tools" | minor |
| E | skill | `skills/filid-revalidate/DETAIL.md` (new — Writer Responsibility contract) · `skills/filid-revalidate/SKILL.md` Step 3/6 rewrite (template tokens + parse-fail gate) · `skills/filid-revalidate/reference.md` (ledger template) · `skills/filid-review/phases/phase-d-deliberation.md` Step D.6.4 (call `mcp_t_config_patch_validate`) · `skills/filid-review/contracts.md` (config-patch contract) | minor |
| F | agents | `agents/{engineering-architect,knowledge-manager,operations-sre,adjudicator}.md` — append `## Config Proposal Discipline` section (4 files, ≤15 lines each) | patch |
| G | docs+archive | `.claude/rules/filid_fca-policy.md` — append "Full `.filid/config.json` Example" section · `git mv docs/requests/2026-04-24-…md docs/incidents/2026-04-24-no-op-config-incident.md` | no bump |

### Revert Dependency Matrix

| Revert | Mandatory co-revert | Reason |
|---|---|---|
| A | B, C, D, E | Schemas and types are consumed downstream |
| B | (none) | Runtime rollback; types remain valid |
| C | (none) | Sanitize softens; callers still accept legacy shape if E/D co-reverted or if B still uses wrapped check |
| D | E | E's Phase D Step D.6.4 calls `mcp_t_config_patch_validate` — missing tool = runtime error |
| E | (none) | Skill rollback only |
| F | (none) | Agents rollback only |
| G | (none) | Docs/archive rollback only |

---

## 4. Scope (P1-P6) — File-level summary

### P1 — zod strict + strict-sanitize fallback
- `filid-config.ts`: new `FilidConfigSchema` (top-level `.strict()`) and `RuleOverrideSchema` (`.strict()`, includes `exempt`). `AllowedEntrySchema` union for P3.
- `loadConfig`: `FilidConfigSchema.safeParse` on success returns as-is; on failure logs each `ZodIssue` and delegates to `parseWithAllowlistWarn`, which **removes** unknown keys from the parsed object (not pass-through).
- Remove legacy `scan.maxDepth` numeric guard — ownership moved to schema.
- Validate each `override.exempt[]` pattern at load time; drop invalid or bare-`**` patterns with warn.
- `FilidConfig` = `z.infer<typeof FilidConfigSchema>`; the standalone interface is deleted.

### P2 — unified `exempt`
- `types/rules.ts`: add `exempt?: string[]`.
- `rule-engine.ts`: introduce internal `withExempt(rule, override)` that wraps `rule.check`; applied inside `applyOverrides`. No changes to the 8 rule bodies.
- `utils/is-exempt.ts`: `fast-glob` `isDynamicPattern` + `picomatch`-style match; swallows its own exceptions and returns `false` to defeat the `evaluateRule` silent-swallow edge.

### P3 — object-form `additional-allowed`
- Union entry type: `string | { basename: string; paths?: string[] }`.
- `zero-peer-file` branches on entry shape; string entries retain current global semantics for backward compat.

### P4 — revalidate strict gate + ledger
- SKILL.md Step 3: subagent writes ledger row with **literal `TBD` tokens** in `post_count` and `status`. Prompt mandates this exactly; writing any other value is a protocol violation.
- SKILL.md Step 6 (main orchestrator): for each row, detect tampering (`post_count != 'TBD'` or `status != 'TBD'`), log warn, discard subagent values. Then independently call `mcp_t_structure_validate(path=<target_path>)`, filter by `ruleId`, write `post_count`, derive `status` from `(pre_count, post_count, file_was_modified)`. If any row is `UNRESOLVED`, verdict = FAIL (unoverridable).
- SKILL.md Step 6 also detects missing rows (`ledger rows < fix-requests count`) and marks absent fixes as auto-UNRESOLVED.
- Cleanup (Step 8) removes `verification-ledger.md` as part of the review dir teardown on PASS.
- New DETAIL.md codifies the Writer Responsibility contract.

### P5 — Phase D validation + 4-persona discipline
- New MCP tool `mcp_t_config_patch_validate(patch_json, source_context?)` returns `{ valid, errors[], suggestion? }` using a `FilidConfigSchema` re-export (no local schema).
- Phase D Step D.6.4: for each `.filid/config.json` code-patch fix, call the tool; rewrite per `suggestion` if provided, else mark `Type: blocked` with zod errors as rationale.
- 4 persona files (`engineering-architect`, `knowledge-manager`, `operations-sre`, `adjudicator`) gain a `## Config Proposal Discipline` section requiring schema citation before proposing config patches. `business-driver`, `product-manager`, `design-hci` are out of scope (no config-patch causal link).

### P6 — policy docs
- `filid_fca-policy.md` gets a full `.filid/config.json` example section clearly marking `additional-allowed` as top-level and `exempt` as per-rule.
- Skill INTENT.md files stay unchanged (50-line constraint); they reference the policy doc as the single source.

### Archive
- `git mv docs/requests/2026-04-24-schema-validation-and-waiver-mechanisms.md docs/incidents/2026-04-24-no-op-config-incident.md`.
- `docs/` stays an organ (known-organ absence + leaf heuristic); `docs/incidents/` is a new organ sibling. Phase 8 runs `/filid:filid-scan` to confirm classification.

---

## 5. Acceptance Criteria

### Automated (CI: `yarn filid test:run`, `yarn filid typecheck`, grep)

| ID | Scenario | Expectation |
|---|---|---|
| AC1 | config with `rules["zero-peer-file"].additional-allowed = […]` | `log.warn` emitted; unknown key removed from parsed object |
| AC2 | config with `rules["module-entry-point"].exempt = ["packages/**"]` | `packages/foo` fractal reports 0 `module-entry-point` violations |
| AC3 | `additional-allowed: [{basename:"CLAUDE.md", paths:["packages/**"]}]` | `packages/foo/CLAUDE.md` allowed, `src/CLAUDE.md` not |
| AC5a | `mcp_t_config_patch_validate({ patch_json: "<invalid>" })` | `valid: false`, non-empty `errors[]` |
| AC6 | grep `.claude/rules/filid_fca-policy.md` | Contains "Full `.filid/config.json` Example" section |
| AC7 | `yarn filid test:run` | Pass; 3+12 rule respected per spec |
| AC8 | `yarn filid typecheck` | 0 errors |
| AC10a | `is-exempt(node, ['[invalid glob'])` | returns `false`, throws nothing |
| AC10b | `loadConfig` with `rules[x].exempt = ['[invalid']` | warn + pattern dropped from override |
| AC11 | unknown-key config → `mcp_t_structure_validate` / `rule-query` / `drift-detect` | All three responses include `configWarnings[]` with matching messages |
| AC12 | `grep -R "z.object(" src/mcp/tools/config-patch-validate/` + TS type-level `IsEqual<FilidConfig_before, FilidConfig_after>` | 0 matches; type equality holds |
| AC-L1 | grep SKILL.md ledger template | Contains literal `post_count: TBD` and `status: TBD` |
| AC-L2 | Mock ledger with `post_count: 0` | Main emits warn, discards value, re-derives from independent MCP call |
| AC-E2E | `tests/e2e/config-lifecycle.test.ts` based on source §9 minimal repro | Legacy unknown-key config produces expected warnings and retains original violations |
| AC-Obs | `log.warn` spy output vs MCP `configWarnings` array | Same message set, same order |

### Manual checklist (Claude Code session)

| ID | Scenario | Expectation |
|---|---|---|
| AC4 | Apply a fix, re-run `mcp_t_structure_validate`, keep same violation | verdict FAIL; ledger row status UNRESOLVED |
| AC5b | Phase D live run where a persona hallucinates `allowed-no-entry` | D.6.4 blocks or rewrites via `mcp_t_config_patch_validate` |
| AC9 | `/filid:filid-structure-review` | Passes on the branch including the new fractal |
| AC-Scan | `/filid:filid-scan` after archive move | `docs/incidents/` classified as organ |

---

## 6. Test Strategy

| Level | Scope | Tool |
|---|---|---|
| Unit | `is-exempt`, `parseWithAllowlistWarn`, zod schemas | vitest |
| Unit | `applyOverrides` + `withExempt` across all 8 rules | vitest |
| Unit | `config-patch-validate` handler | vitest |
| Integration | `loadConfig` + `rule-engine` + `structure-validate` end-to-end | vitest |
| E2E | Source §9 repro (fractal + `CLAUDE.md` peer + nested `additional-allowed`) | vitest scripted |
| Observability | `log.warn` spy equality with MCP `configWarnings` | vitest spy |
| Manual | `filid-scan`, `filid-structure-review`, live Phase D | Claude Code session |

---

## 7. Execution Plan

### Phase 0 — Preflight (1 session, parallel where possible)

- P0a: trace `createLogger('config-loader')` — stdout/stderr/file? Needed to confirm `configWarnings` is the only reliable observability path.
- P0b: inspect `.github/workflows/` — decides whether Phase 8 CI hooks are automated or manual.
- P0c: reconfirm `src/index.ts` barrel (✅ `loadConfig` at :87, `FilidConfig` via `core/` re-export).
- P0d (optional): npm registry search for external consumers of `@ogham/filid` `loadConfig`.

### Phase 1-7 — Commits A → G

Delegate each layer to the appropriate agent per `.claude/CLAUDE.md` routing:
- Commits A, B, C, D → `implementer` (opus)
- Commits E, F → `context-manager`
- Commit G → `context-manager` + Bash `git mv`

Each commit must independently pass `yarn filid typecheck` before moving on; tests added in the same commit as the feature.

### Phase 8 — CI + Release

1. `yarn filid typecheck && yarn filid lint && yarn filid test:run && yarn filid build` (locally; GitHub Actions if P0b finds a workflow).
2. `yarn changeset add` per commit (A/B/C/D/E = minor; C carries `BREAKING CHANGE:` footer; F = patch; G = no bump).
3. Manual `/filid:filid-structure-review` and `/filid:filid-scan`.
4. PR via `/filid:filid-pull-request` (or manual `gh pr create`).
5. v0.4.0 release with CHANGELOG migration guide.

---

## 8. Breaking Change Migration Guide (CHANGELOG excerpt)

```md
### BREAKING: `loadConfig` return type

Before (v0.3.x):
  const config = loadConfig(projectRoot); // FilidConfig | null

After (v0.4.0):
  const { config, warnings } = loadConfig(projectRoot);
  // config: FilidConfig | null
  // warnings: string[]

Migration: destructure. If you previously ignored load warnings, you can
continue ignoring them by destructuring only `config`.
```

---

## 9. References

- Source request: `packages/filid/docs/requests/2026-04-24-schema-validation-and-waiver-mechanisms.md`
- FCA policy: `.claude/rules/filid_fca-policy.md`
- Cognitive discipline: `.claude/rules/filid_cognitive-discipline.md`
- Reuse-first: `.claude/rules/filid_reuse-first.md`
- Key source files: `src/core/infra/config-loader/loaders/filid-config.ts`, `src/core/rules/rule-engine/rule-engine.ts`, `src/types/rules.ts`, `skills/filid-revalidate/SKILL.md`, `skills/filid-review/phases/phase-d-deliberation.md`
- Consensus artifacts: Architect v1 / Architect v2 / Critic v1 / Critic v2 agent outputs (session transcript)
