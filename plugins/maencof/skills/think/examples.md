# ToT Requirements Engine - Examples

## Scenario 1: Single Feature Request — Profile Photo Upload

**Input**: "Users should be able to upload a profile photo"

---

### Step 1: Candidate Generation

**Interpretation A**: Standard file input (`<input type="file">`) with a preview
**Interpretation B**: Drag-and-drop zone + file input combination with crop tool
**Interpretation C**: In-browser camera capture (via `getUserMedia`)
**Interpretation D**: Upload by pasting an image URL

---

### Step 2: Evaluation

```markdown
**Interpretation A — File input with preview**

- Implementation Complexity: 27/30 (native HTML, minimal JS)
- Requirements Coverage: 24/30 (covers the core case, no cropping or camera)
- UX Quality: 14/20 (familiar but plain)
- Maintainability: 10/10 (minimal code surface)
- Team Capability Fit: 10/10 (standard browser API)
- **Total: 85/100 — Certain**

**Interpretation B — Drag-and-drop + crop tool**

- Implementation Complexity: 18/30 (requires react-dropzone + cropper.js)
- Requirements Coverage: 29/30 (handles all common upload scenarios)
- UX Quality: 19/20 (polished, modern, user-friendly)
- Maintainability: 7/10 (two external libraries to maintain)
- Team Capability Fit: 8/10 (both libraries are well-documented)
- **Total: 81/100 — Very Feasible**

**Interpretation C — Camera capture**

- Implementation Complexity: 12/30 (getUserMedia + canvas drawing)
- Requirements Coverage: 20/30 (only covers camera; misses existing photos)
- UX Quality: 15/20 (good for mobile, awkward on desktop)
- Maintainability: 6/10 (browser compatibility edge cases)
- Team Capability Fit: 6/10 (limited team experience with camera APIs)
- **Total: 59/100 — Not Recommended**

**Interpretation D — URL input**

- Implementation Complexity: 26/30 (simple text input + server-side fetch)
- Requirements Coverage: 16/30 (limited to users who have hosted images)
- UX Quality: 8/20 (unintuitive for most users)
- Maintainability: 9/10 (simple code path)
- Team Capability Fit: 10/10 (trivial implementation)
- **Total: 69/100 — Caution**
```

---

### Step 3: Selection

```yaml
decision:
  selected_interpretation:
    id: 'A'
    description: 'Standard file input with preview'
    score: 85
    rationale: >
      Interpretation A scores highest (85/100) with virtually no implementation
      risk. It delivers all core requirements — file selection, preview, and upload
      — using native browser APIs. The simplicity makes it immediately deployable
      and easy to extend later (e.g., adding crop functionality on top). Given the
      team's familiarity, delivery risk is minimal.

  alternatives:
    - id: 'B'
      description: 'Drag-and-drop + crop tool'
      score: 81
      fallback_condition: 'Upgrade to B if users request cropping after launch'

    - id: 'D'
      description: 'URL input'
      score: 69
      rejected_reason: 'Poor UX for the majority of users; narrow use case'

    - id: 'C'
      description: 'Camera capture'
      score: 59
      rejected_reason: 'Score below 60; does not meet minimum requirements for a general-purpose upload feature'

  lookahead:
    next_decision: 'File size and format validation strategy (client-side vs server-side)'
    expected_complexity: 'Low'
    risks:
      - 'Large files may cause slow uploads — need size limit (e.g., 5MB)'
      - 'Format validation needed (accept only jpg, png, webp)'
      - 'Storage provider selection (S3, Cloudinary, local) must be confirmed'

  backtrack_plan:
    trigger: 'Users request cropping in post-launch feedback within 30 days'
    action: 'Layer crop functionality onto Interpretation A; or migrate to Interpretation B'
    estimated_recovery_time: '2-3 days'
```

---

## Scenario 2: Ambiguous Request — Data Export

**Input**: "Users should be able to export their data"

Note: This request is ambiguous — "data" and "export" are both underspecified. The ToT process expands the solution space before narrowing.

---

### Step 1: Candidate Generation

**Interpretation A**: CSV download of tabular records via a button
**Interpretation B**: JSON export via a REST API endpoint
**Interpretation C**: PDF report with charts and formatted layout
**Interpretation D**: Excel (.xlsx) file with multiple sheets
**Interpretation E**: Print-to-PDF using the browser's native print dialog

---

### Step 2: Evaluation

```markdown
**Interpretation A — CSV download**

- Implementation Complexity: 27/30 (straightforward server generation)
- Requirements Coverage: 26/30 (covers most tabular data use cases)
- UX Quality: 16/20 (familiar to technical/business users)
- Maintainability: 10/10 (simple format, no library dependencies)
- Team Capability Fit: 10/10 (team has done this before)
- **Total: 89/100 — Certain** ✅

**Interpretation B — JSON API export**

- Implementation Complexity: 25/30 (standard REST endpoint)
- Requirements Coverage: 22/30 (developer-friendly but poor for non-technical users)
- UX Quality: 10/20 (no UI, requires technical knowledge)
- Maintainability: 10/10 (standard REST pattern)
- Team Capability Fit: 10/10 (core team competency)
- **Total: 77/100 — Very Feasible**

**Interpretation C — PDF report**

- Implementation Complexity: 12/30 (PDF generation library, templating, charts)
- Requirements Coverage: 25/30 (great for reporting use cases)
- UX Quality: 18/20 (polished output, good for sharing)
- Maintainability: 5/10 (PDF layout is brittle and hard to update)
- Team Capability Fit: 6/10 (limited PDF generation experience)
- **Total: 66/100 — Caution**

**Interpretation D — Excel export**

- Implementation Complexity: 18/30 (requires xlsx library)
- Requirements Coverage: 28/30 (power users expect Excel support)
- UX Quality: 17/20 (familiar to business users)
- Maintainability: 7/10 (xlsx library API is stable)
- Team Capability Fit: 7/10 (used xlsx in a previous project)
- **Total: 77/100 — Very Feasible**

**Interpretation E — Browser print dialog**

- Implementation Complexity: 28/30 (CSS print styles only)
- Requirements Coverage: 15/30 (limited to what fits on a page)
- UX Quality: 10/20 (inconsistent across browsers and printers)
- Maintainability: 10/10 (no dependencies)
- Team Capability Fit: 10/10 (trivial implementation)
- **Total: 73/100 — Feasible**
```

---

### Step 3: Selection

```yaml
decision:
  selected_interpretation:
    id: 'A'
    description: 'CSV download of tabular records'
    score: 89
    rationale: >
      Interpretation A is the clear winner at 89/100. CSV is the lowest-risk format
      that satisfies the broadest range of user needs for tabular data. It requires
      no external library, is universally readable, and the team has prior experience
      delivering it. It can also be combined with Interpretation D (Excel) as a
      parallel enhancement without architectural rework.

  alternatives:
    - id: 'D'
      description: 'Excel export'
      score: 77
      fallback_condition: 'Add Excel as a secondary format if business users request it post-launch'

    - id: 'B'
      description: 'JSON API export'
      score: 77
      fallback_condition: 'Deliver as a developer-facing API export in a later sprint'

    - id: 'E'
      description: 'Browser print dialog'
      score: 73
      rejected_reason: 'Too limited in scope; does not constitute a meaningful data export'

    - id: 'C'
      description: 'PDF report'
      score: 66
      rejected_reason: 'High maintenance burden and team capability gap; revisit when PDF reporting is a specific goal'

  lookahead:
    next_decision: 'Large dataset handling strategy — pagination, streaming, or background job + email delivery'
    expected_complexity: 'Medium'
    risks:
      - 'Exports of large datasets may time out on the server — needs async processing strategy'
      - 'Data privacy: exported files may contain PII — access control and audit logging required'
      - 'Filename and encoding conventions must be standardized (UTF-8 BOM for Excel compatibility)'

  backtrack_plan:
    trigger: 'Server timeout errors reported on datasets larger than 10,000 rows'
    action: 'Switch to background job model — generate file asynchronously and email download link'
    estimated_recovery_time: '3-4 days'
```

---

## Scenario 3: Complex Architecture Decision — State Management Library

**Input**: "Choose a global state management library for the new React application"

Note: This is an architectural decision with long-term consequences. The evaluation weighs team experience and migration cost heavily.

---

### Step 1: Candidate Generation

**Interpretation A**: Redux Toolkit (RTK)
**Interpretation B**: Zustand
**Interpretation C**: Jotai
**Interpretation D**: Recoil
**Interpretation E**: MobX

---

### Step 2: Evaluation

Context: Mid-sized React application (15-20 screens), team of 4 developers, 6-month timeline, previous experience with Redux and React Context.

```markdown
**Interpretation A — Redux Toolkit**

- Implementation Complexity: 18/30 (RTK reduces Redux boilerplate significantly, but still verbose)
- Requirements Coverage: 28/30 (full-featured, handles all state patterns)
- UX Quality: N/A → Developer Experience: 15/20 (good devtools, opinionated structure)
- Maintainability: 10/10 (industry standard, extensive ecosystem)
- Team Capability Fit: 9/10 (team has prior Redux experience)
- **Total: 80/100 — Very Feasible**

**Interpretation B — Zustand**

- Implementation Complexity: 27/30 (minimal API, very low boilerplate)
- Requirements Coverage: 26/30 (covers all mid-scale state needs, less opinionated)
- UX Quality: Developer Experience: 19/20 (simple and flexible)
- Maintainability: 9/10 (small library, stable API)
- Team Capability Fit: 7/10 (learning curve is short — 1-2 days)
- **Total: 88/100 — Certain** ✅

**Interpretation C — Jotai**

- Implementation Complexity: 26/30 (atomic model is simple for co-located state)
- Requirements Coverage: 23/30 (best for fine-grained atom-based state; less suited for complex global state)
- UX Quality: Developer Experience: 17/20 (elegant for React Suspense patterns)
- Maintainability: 8/10 (small API surface, good docs)
- Team Capability Fit: 6/10 (atomic model is unfamiliar to the team)
- **Total: 80/100 — Very Feasible**

**Interpretation D — Recoil**

- Implementation Complexity: 22/30 (atom/selector model, similar to Jotai but heavier)
- Requirements Coverage: 22/30 (good for derived state, less mature ecosystem)
- UX Quality: Developer Experience: 14/20 (Meta-backed but experimental status)
- Maintainability: 6/10 (future uncertain — limited active maintenance signals)
- Team Capability Fit: 5/10 (no team experience, uncertain long-term)
- **Total: 69/100 — Caution**

**Interpretation E — MobX**

- Implementation Complexity: 16/30 (requires understanding observable/action paradigm)
- Requirements Coverage: 25/30 (powerful for reactive patterns)
- UX Quality: Developer Experience: 13/20 (magic-heavy, harder to debug)
- Maintainability: 7/10 (strong ecosystem, but paradigm mismatch with React idioms)
- Team Capability Fit: 4/10 (no team experience, paradigm shift required)
- **Total: 65/100 — Caution**
```

---

### Step 3: Selection

```yaml
decision:
  selected_interpretation:
    id: 'B'
    description: 'Zustand for global state management'
    score: 88
    rationale: >
      Zustand scores highest (88/100) and is the optimal choice for this project's
      scale and team profile. Its minimal API dramatically reduces boilerplate,
      and the learning curve is short enough that the team can be productive within
      1-2 days. Unlike Redux Toolkit, Zustand does not impose a rigid file structure,
      giving the team flexibility as requirements evolve. Its small bundle size and
      lack of provider wrapping also improve runtime performance for a mid-sized app.

  alternatives:
    - id: 'A'
      description: 'Redux Toolkit'
      score: 80
      fallback_condition: >
        Switch to RTK if the application grows to 30+ screens or requires
        complex middleware (e.g., sagas, RTK Query for server state)

    - id: 'C'
      description: 'Jotai'
      score: 80
      fallback_condition: >
        Consider Jotai if the team adopts React Suspense patterns heavily
        in a future sprint; can coexist with Zustand for local atom state

    - id: 'D'
      description: 'Recoil'
      score: 69
      rejected_reason: 'Maintenance trajectory is uncertain; no team experience; caution-level score'

    - id: 'E'
      description: 'MobX'
      score: 65
      rejected_reason: "Paradigm mismatch with the team's React mental model; highest learning cost"

  lookahead:
    next_decision: 'Server state strategy — React Query vs SWR vs RTK Query for async data fetching'
    expected_complexity: 'Medium'
    risks:
      - 'Zustand stores can become unwieldy without enforced slice conventions — establish a store structure guide early'
      - 'If server state is added ad hoc inside Zustand stores, separation of concerns will degrade over time'
      - 'Migration cost to Redux if scale demands it later — estimated 5-8 days of refactoring'

  backtrack_plan:
    trigger: >
      Team consistently struggles with Zustand patterns after 2 weeks, or application
      state complexity exceeds what Zustand handles cleanly (e.g., complex async flows,
      cache invalidation, optimistic updates)
    action: 'Migrate to Redux Toolkit; Zustand and RTK can coexist during transition'
    estimated_recovery_time: '4-5 days for full migration'
```

---

## Scenario 4: Divergent Mode — Onboarding Engagement Ideas

**Input**: `think --mode divergent` invoked downstream of `explore --for-brainstorm` ("아이디어가 막막한데, 신규 사용자 온보딩을 어떻게 더 끈끈하게 만들지?")

Note: Divergent mode does **not** force a single winner-to-build. Output is a candidate list (5-8) plus a top-3 rationale; the remaining candidates are summarized. When seeds arrive from `explore --for-brainstorm`, treat them as the starting set and expand rather than synthesizing from scratch.

---

### Step 1: Candidate Generation (seed intake + expansion)

explore handed off 4 seeds (`title + path + 1-line summary`); candidates E–G are expansions added by think.

**Candidate A** (seed): Interactive product tour — guided tooltips on first login (baseline known pattern, low novelty)
**Candidate B** (seed): Checklist-driven activation — gamified "getting started" checklist with progress bar
**Candidate C** (seed): Personalized setup wizard — branch the flow by role selected at signup
**Candidate D** (seed): Empty-state seeding — pre-populate the workspace with a sample project
**Candidate E**: Cohort buddy match — pair each new user with a peer who joined the same week (cross-domain transfer from social apps)
**Candidate F**: Reverse onboarding — let the user accomplish their _own_ first task immediately, surface guidance contextually as they go (contrarian: violate the "tour first" assumption)
**Candidate G**: AI-narrated walkthrough — an in-app agent that watches the first session and offers just-in-time nudges (prototype-only, speculative)

---

### Step 2: Evaluation (Divergent rubric — Novelty 30 / Feasibility 25 / Coverage 15 / UX 15 / Team 15)

```markdown
| Candidate | Novelty (30) | Feasibility (25) | Coverage (15) | UX (15) | Team (15) | **Total** | **Rating**            |
| --------- | ------------ | ---------------- | ------------- | ------- | --------- | --------- | --------------------- |
| A         | 10           | 23               | 12            | 12      | 14        | **71**    | Derivative but safe   |
| B         | 20           | 22               | 13            | 13      | 13        | **81**    | Novel & Actionable    |
| C         | 20           | 18               | 14            | 13      | 11        | **76**    | Novel & Actionable    |
| D         | 20           | 21               | 12            | 13      | 13        | **79**    | Novel & Actionable    |
| E         | 30           | 15               | 11            | 12      | 9         | **77**    | Novel & Actionable    |
| F         | 30           | 19               | 13            | 14      | 12        | **88**    | Bold & Feasible       |
| G         | 30           | 13               | 10            | 11      | 7         | **71**    | Derivative but safe\* |
```

\*G's total lands in "Derivative but safe" by score, but its high Novelty + low Feasibility flags it as a regenerate-or-pilot candidate, not a discard.

---

### Step 3: Top-3 Rationale (no single winner forced)

```markdown
**Top 3 (prototype-worthy / experiment-ready):**

1. **F — Reverse onboarding (88, Bold & Feasible)**: Highest novelty AND feasible.
   Inverts the default "tour first" assumption to let users reach their own first
   success immediately, which best targets "끈끈한" retention. Recommend a 1-sprint pilot.
2. **B — Activation checklist (81, Novel & Actionable)**: Combinatorial novelty with
   the lowest delivery risk; a safe parallel bet alongside F.
3. **D — Empty-state seeding (79, Novel & Actionable)**: Cheap to ship and composable
   with both F and B.

**Remaining (summarized):** C (role wizard) is solid but higher build cost; E (cohort
buddy) is the most novel but feasibility-limited — revisit if a social layer is planned;
A (product tour) is the low-novelty baseline; G (AI-narrated) is speculative — park as a
prototype spike if F's contextual-guidance layer needs reinforcement.
```

---

## Scenario 5: Review Mode — Plan Risk Review

**Input**: `think --mode review` invoked on `.maencof/plans/payment-retry.md` ("이 결제 재시도 플랜 검토해줘, 빠진 거 없나?")

Note: Review mode uses **inverted Risk Exposure** — a _higher_ score means a _worse_ (riskier) finding. The top-scoring item is therefore the most critical risk requiring a mandatory alternative, **not** a plan to build. Each risk is paired with at least one mitigation alternative; minimum 3 risks.

---

### Step 1: Risk Generation (Strategy E — risk + mitigation pairs)

**Risk 1**: Plan retries failed charges with no idempotency key → duplicate charges on transient gateway errors (unmitigated in the plan)
**Risk 2**: Fixed 5-retry loop with no backoff → retry storm against the gateway during an outage (partially mitigated — plan caps retries but specifies no delay)
**Risk 3**: No dead-letter path for permanently-failed payments → silent revenue loss (unmitigated)
**Risk 4**: Retry worker shares the primary DB connection pool → exhaustion under load (mitigated — plan already isolates a worker pool)

---

### Step 2: Evaluation (Review rubric — Risk Exposure 30 _inverted_ / Coverage 25 / Maintainability 20 / Complexity 15 / Team 10)

```markdown
| Risk | Risk Exposure (30) | Coverage (25) | Maintainability (20) | Complexity (15) | Team (10) | **Total** | **Severity**                     |
| ---- | ------------------ | ------------- | -------------------- | --------------- | --------- | --------- | -------------------------------- |
| 1    | 30 (unmitigated)   | 22            | 18                   | 13              | 9         | **92**    | Critical — mandatory alternative |
| 3    | 30 (unmitigated)   | 20            | 16                   | 12              | 9         | **87**    | Critical — mandatory alternative |
| 2    | 20 (partial)       | 18            | 15                   | 11              | 8         | **72**    | Moderate — monitor / conditional |
| 4    | 10 (mitigated)     | 16            | 14                   | 10              | 7         | **57**    | Negligible — acceptable as-is    |
```

Read the scale inverted: Risk 1 at **92** is the headline finding (worst), not a winner.
Risk 4 at **57** is the safest item already handled by the plan.

---

### Step 3: Findings + Mitigation Alternatives

```yaml
review:
  headline_risk:
    id: 'Risk 1'
    finding: 'Retries without an idempotency key — duplicate charges on transient errors'
    score: 92
    severity: 'Critical — alternative adoption mandatory'
    alternatives:
      - id: '1a'
        action: 'Attach a per-attempt idempotency key derived from (order_id, attempt_no); gateway dedupes'
        cost: '0.5 day'
      - id: '1b'
        action: 'If the gateway lacks idempotency support, add a pre-charge ledger check'
        cost: '1-2 days'

  additional_risks:
    - id: 'Risk 3'
      finding: 'No dead-letter path — permanently-failed payments vanish silently'
      score: 87
      severity: 'Critical — alternative adoption mandatory'
      alternatives:
        - 'Route exhausted retries to a dead-letter queue + ops alert (1 day)'
    - id: 'Risk 2'
      finding: 'Fixed retry loop with no backoff — retry storm risk during an outage'
      score: 72
      severity: 'Moderate — conditional'
      alternatives:
        - 'Add exponential backoff + jitter; specify max elapsed window (0.5 day)'
    - id: 'Risk 4'
      finding: 'Worker DB pool isolation'
      score: 57
      severity: 'Negligible — already mitigated in the plan; no action required'

  recommendation: >
    Do NOT execute the plan as written. Adopt 1a and the Risk 3 dead-letter alternative
    before implementation (both Critical); fold in the Risk 2 backoff fix as a conditional.
    Risk 4 is acceptable as-is.
```
