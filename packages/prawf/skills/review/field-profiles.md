# prawf Field Profiles (Field Profile Data)

> The **data layer that injects field expertise** into the universal core personas.
> A persona's identity (defined in `../../agents/<id>.md`) is a field-agnostic
> *invariant question*; the field-specific frameworks are injected as a *menu* by the
> profiles in this document. This data is the **field data that review P0 uses when it
> auto-detects the field from the paper content** — it is *reference data*, not an
> evaluation behavior, and it feeds P0 auto-detection directly without any separate
> injection channel.
>
> Ported from the Korean SSoT in `.metadata/prawf/`.

## 1. Concept — Axes Are Core, Frameworks Are Data

| Component                                            | Location                  | Field-dependent |
| --------------------------------------------------- | ------------------------- | --------------- |
| Persona identity (invariant question)               | `agents/<id>.md` (core)   | **no**          |
| Framework menu · type taxonomy · severity examples  | field profile (config)    | **yes**         |

This lets the same nine reviewers operate on a medical paper or an ML paper alike —
only the injected profile changes. It is the concrete realization of the principle
"axis = invariant question, framework = variable menu" and of the four shared review
concerns (transparency, soundness, reproducibility, contextualization).

## 2. Profile Schema

```yaml
# .prawf/profiles/<name>.yaml
profile: <name>
axis_frameworks: # axis id → active framework menu
  argument: [<framework>, ...]
  methodology: [...]
  statistics: [...]
  causality: [...]
  bias: [...]
  integrity: [...]
  impact: [...]
disabled_axes: [<axis>, ...] # statistics·causality·bias only (argument·methodology·integrity cannot be disabled)
absorb_map: { <disabled-axis>: <absorbing axis> } # which axis inherits the checks of a disabled axis
paper_types: # type → axes to convene (P0 panel-election input)
  - { type: <name>, axes: [...], guideline: <ref> }
severity_examples: # per-axis critical/major/minor anchor examples
  <axis>: { critical: "...", major: "...", minor: "..." }
external_checks: [<item>, ...] # handled as reasoning_gap when the capability is absent
```

## 3. Default Profile: `natural-science` (Natural Science · Medicine Focus)

See [`./profiles/natural-science.yaml`](./profiles/natural-science.yaml). The native
domain of the source report; applied by default when no field is specified. Focuses
on EQUATOR reporting guidelines (CONSORT/STROBE/PRISMA), risk-of-bias frameworks
(rob2, robins-i, grade), and Bradford-Hill causal inference. No axes are disabled —
all seven axes are active.

## 4. Additional Profiles

### 4.1 `cs-ml` (Computer Science · Machine Learning)

See [`./profiles/cs-ml.yaml`](./profiles/cs-ml.yaml). Focuses on reproducibility
(ablation studies, artifact availability), data-leakage and benchmark/baseline
fairness, and contribution clarity. No axes are disabled, but `causality` is weakened
— it applies only to papers that make causal claims.

### 4.2 `math-theory` (Mathematics · Theory)

See [`./profiles/math-theory.yaml`](./profiles/math-theory.yaml). Focuses on
line-by-line proof verification, assumption strength, and inference-leap checks.
`causality` and `bias` are disabled and absorbed — `causality` into `argument` and
`bias` into `methodology` (via `absorb_map`).

### 4.3 `humanities-qualitative` (Humanities · Qualitative)

See [`./profiles/humanities-qualitative.yaml`](./profiles/humanities-qualitative.yaml).
Focuses on interpretive validity, groundedness, researcher positionality, and source
attribution. `statistics` and `causality` are disabled and absorbed — `statistics`
into `methodology` and `causality` into `argument` (via `absorb_map`).

> `social-science` inherits `natural-science` but emphasizes construct validity and
> WEIRD-sample caveats; it is the default fallback when its profile is omitted.

## 5. Injection Mechanism

Priority (higher wins):

1. **`--profile <name>` override** — `/prawf:review --profile=cs-ml` (explicit, optional)
2. **P0 auto-detection (default)** — the chair infers the type and field from the
   paper content and selects a built-in profile
3. **Universal fallback** — §6 (an unknown field with no built-in)
4. **(Optional) custom yaml** — added as a candidate only when a user-authored
   `.prawf/profiles/<name>.yaml` exists

**Integrity constraint (P0 verification)**: an injected profile must satisfy (1)
required-key and axis-reference consistency and (2) the presence of
`severity_examples`, and the **required soundness axes `argument·methodology·integrity`
cannot be turned off via `disabled_axes`** (only statistics·causality·bias may be
conditionally disabled when accompanied by an `absorb_map`). On violation the chair
rejects the profile and falls back to the universal menu.

> It works without any separate config file — the built-in profiles in this document
> are sufficient as field data. A config file (`.prawf/profiles/<name>.yaml`) appears
> only when a user adds a custom field.

## 6. Fallback — Universal Menu (No Profile Specified · Unknown Field)

When a profile cannot be determined, each axis falls back to its *field-agnostic core*:

| Axis        | Universal fallback question                                              |
| ----------- | ----------------------------------------------------------------------- |
| argument    | Are there any formal errors or leaps in the reasoning?                  |
| methodology | Are the methods and procedures reported transparently and reproducibly? |
| statistics  | Are arbitrary choices in the data or analysis left concealed?           |
| causality   | Are causal/mechanism claims proportional to the evidence? (disabled if N/A) |
| bias        | Are inherent biases controlled and the results reproducible?            |
| integrity   | Is there any plagiarism, fabrication, or conflict of interest?          |
| impact      | Is the contribution clear and situated within its context? (advisory)   |

When the fallback is used, the chair notes _"generic profile — no field-specific
checks applied"_ in `review-report.md`.
