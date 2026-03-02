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
- Requirements Coverage:    24/30 (covers the core case, no cropping or camera)
- UX Quality:               14/20 (familiar but plain)
- Maintainability:          10/10 (minimal code surface)
- Team Capability Fit:      10/10 (standard browser API)
- **Total: 85/100 — Certain**

**Interpretation B — Drag-and-drop + crop tool**

- Implementation Complexity: 18/30 (requires react-dropzone + cropper.js)
- Requirements Coverage:    29/30 (handles all common upload scenarios)
- UX Quality:               19/20 (polished, modern, user-friendly)
- Maintainability:           7/10 (two external libraries to maintain)
- Team Capability Fit:       8/10 (both libraries are well-documented)
- **Total: 81/100 — Very Feasible**

**Interpretation C — Camera capture**

- Implementation Complexity: 12/30 (getUserMedia + canvas drawing)
- Requirements Coverage:    20/30 (only covers camera; misses existing photos)
- UX Quality:               15/20 (good for mobile, awkward on desktop)
- Maintainability:           6/10 (browser compatibility edge cases)
- Team Capability Fit:       6/10 (limited team experience with camera APIs)
- **Total: 59/100 — Not Recommended**

**Interpretation D — URL input**

- Implementation Complexity: 26/30 (simple text input + server-side fetch)
- Requirements Coverage:    16/30 (limited to users who have hosted images)
- UX Quality:                8/20 (unintuitive for most users)
- Maintainability:           9/10 (simple code path)
- Team Capability Fit:      10/10 (trivial implementation)
- **Total: 69/100 — Caution**
```

---

### Step 3: Selection

```yaml
decision:
  selected_interpretation:
    id: "A"
    description: "Standard file input with preview"
    score: 85
    rationale: >
      Interpretation A scores highest (85/100) with virtually no implementation
      risk. It delivers all core requirements — file selection, preview, and upload
      — using native browser APIs. The simplicity makes it immediately deployable
      and easy to extend later (e.g., adding crop functionality on top). Given the
      team's familiarity, delivery risk is minimal.

  alternatives:
    - id: "B"
      description: "Drag-and-drop + crop tool"
      score: 81
      fallback_condition: "Upgrade to B if users request cropping after launch"

    - id: "D"
      description: "URL input"
      score: 69
      rejected_reason: "Poor UX for the majority of users; narrow use case"

    - id: "C"
      description: "Camera capture"
      score: 59
      rejected_reason: "Score below 60; does not meet minimum requirements for a general-purpose upload feature"

  lookahead:
    next_decision: "File size and format validation strategy (client-side vs server-side)"
    expected_complexity: "Low"
    risks:
      - "Large files may cause slow uploads — need size limit (e.g., 5MB)"
      - "Format validation needed (accept only jpg, png, webp)"
      - "Storage provider selection (S3, Cloudinary, local) must be confirmed"

  backtrack_plan:
    trigger: "Users request cropping in post-launch feedback within 30 days"
    action: "Layer crop functionality onto Interpretation A; or migrate to Interpretation B"
    estimated_recovery_time: "2-3 days"
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
- Requirements Coverage:    26/30 (covers most tabular data use cases)
- UX Quality:               16/20 (familiar to technical/business users)
- Maintainability:          10/10 (simple format, no library dependencies)
- Team Capability Fit:      10/10 (team has done this before)
- **Total: 89/100 — Certain** ✅

**Interpretation B — JSON API export**

- Implementation Complexity: 25/30 (standard REST endpoint)
- Requirements Coverage:    22/30 (developer-friendly but poor for non-technical users)
- UX Quality:               10/20 (no UI, requires technical knowledge)
- Maintainability:          10/10 (standard REST pattern)
- Team Capability Fit:      10/10 (core team competency)
- **Total: 77/100 — Very Feasible**

**Interpretation C — PDF report**

- Implementation Complexity: 12/30 (PDF generation library, templating, charts)
- Requirements Coverage:    25/30 (great for reporting use cases)
- UX Quality:               18/20 (polished output, good for sharing)
- Maintainability:           5/10 (PDF layout is brittle and hard to update)
- Team Capability Fit:       6/10 (limited PDF generation experience)
- **Total: 66/100 — Caution**

**Interpretation D — Excel export**

- Implementation Complexity: 18/30 (requires xlsx library)
- Requirements Coverage:    28/30 (power users expect Excel support)
- UX Quality:               17/20 (familiar to business users)
- Maintainability:           7/10 (xlsx library API is stable)
- Team Capability Fit:       7/10 (used xlsx in a previous project)
- **Total: 77/100 — Very Feasible**

**Interpretation E — Browser print dialog**

- Implementation Complexity: 28/30 (CSS print styles only)
- Requirements Coverage:    15/30 (limited to what fits on a page)
- UX Quality:               10/20 (inconsistent across browsers and printers)
- Maintainability:          10/10 (no dependencies)
- Team Capability Fit:      10/10 (trivial implementation)
- **Total: 73/100 — Feasible**
```

---

### Step 3: Selection

```yaml
decision:
  selected_interpretation:
    id: "A"
    description: "CSV download of tabular records"
    score: 89
    rationale: >
      Interpretation A is the clear winner at 89/100. CSV is the lowest-risk format
      that satisfies the broadest range of user needs for tabular data. It requires
      no external library, is universally readable, and the team has prior experience
      delivering it. It can also be combined with Interpretation D (Excel) as a
      parallel enhancement without architectural rework.

  alternatives:
    - id: "D"
      description: "Excel export"
      score: 77
      fallback_condition: "Add Excel as a secondary format if business users request it post-launch"

    - id: "B"
      description: "JSON API export"
      score: 77
      fallback_condition: "Deliver as a developer-facing API export in a later sprint"

    - id: "E"
      description: "Browser print dialog"
      score: 73
      rejected_reason: "Too limited in scope; does not constitute a meaningful data export"

    - id: "C"
      description: "PDF report"
      score: 66
      rejected_reason: "High maintenance burden and team capability gap; revisit when PDF reporting is a specific goal"

  lookahead:
    next_decision: "Large dataset handling strategy — pagination, streaming, or background job + email delivery"
    expected_complexity: "Medium"
    risks:
      - "Exports of large datasets may time out on the server — needs async processing strategy"
      - "Data privacy: exported files may contain PII — access control and audit logging required"
      - "Filename and encoding conventions must be standardized (UTF-8 BOM for Excel compatibility)"

  backtrack_plan:
    trigger: "Server timeout errors reported on datasets larger than 10,000 rows"
    action: "Switch to background job model — generate file asynchronously and email download link"
    estimated_recovery_time: "3-4 days"
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
- Requirements Coverage:    28/30 (full-featured, handles all state patterns)
- UX Quality:               N/A → Developer Experience: 15/20 (good devtools, opinionated structure)
- Maintainability:          10/10 (industry standard, extensive ecosystem)
- Team Capability Fit:       9/10 (team has prior Redux experience)
- **Total: 80/100 — Very Feasible**

**Interpretation B — Zustand**

- Implementation Complexity: 27/30 (minimal API, very low boilerplate)
- Requirements Coverage:    26/30 (covers all mid-scale state needs, less opinionated)
- UX Quality:               Developer Experience: 19/20 (simple and flexible)
- Maintainability:           9/10 (small library, stable API)
- Team Capability Fit:       7/10 (learning curve is short — 1-2 days)
- **Total: 88/100 — Certain** ✅

**Interpretation C — Jotai**

- Implementation Complexity: 26/30 (atomic model is simple for co-located state)
- Requirements Coverage:    23/30 (best for fine-grained atom-based state; less suited for complex global state)
- UX Quality:               Developer Experience: 17/20 (elegant for React Suspense patterns)
- Maintainability:           8/10 (small API surface, good docs)
- Team Capability Fit:       6/10 (atomic model is unfamiliar to the team)
- **Total: 80/100 — Very Feasible**

**Interpretation D — Recoil**

- Implementation Complexity: 22/30 (atom/selector model, similar to Jotai but heavier)
- Requirements Coverage:    22/30 (good for derived state, less mature ecosystem)
- UX Quality:               Developer Experience: 14/20 (Meta-backed but experimental status)
- Maintainability:           6/10 (future uncertain — limited active maintenance signals)
- Team Capability Fit:       5/10 (no team experience, uncertain long-term)
- **Total: 69/100 — Caution**

**Interpretation E — MobX**

- Implementation Complexity: 16/30 (requires understanding observable/action paradigm)
- Requirements Coverage:    25/30 (powerful for reactive patterns)
- UX Quality:               Developer Experience: 13/20 (magic-heavy, harder to debug)
- Maintainability:           7/10 (strong ecosystem, but paradigm mismatch with React idioms)
- Team Capability Fit:       4/10 (no team experience, paradigm shift required)
- **Total: 65/100 — Caution**
```

---

### Step 3: Selection

```yaml
decision:
  selected_interpretation:
    id: "B"
    description: "Zustand for global state management"
    score: 88
    rationale: >
      Zustand scores highest (88/100) and is the optimal choice for this project's
      scale and team profile. Its minimal API dramatically reduces boilerplate,
      and the learning curve is short enough that the team can be productive within
      1-2 days. Unlike Redux Toolkit, Zustand does not impose a rigid file structure,
      giving the team flexibility as requirements evolve. Its small bundle size and
      lack of provider wrapping also improve runtime performance for a mid-sized app.

  alternatives:
    - id: "A"
      description: "Redux Toolkit"
      score: 80
      fallback_condition: >
        Switch to RTK if the application grows to 30+ screens or requires
        complex middleware (e.g., sagas, RTK Query for server state)

    - id: "C"
      description: "Jotai"
      score: 80
      fallback_condition: >
        Consider Jotai if the team adopts React Suspense patterns heavily
        in a future sprint; can coexist with Zustand for local atom state

    - id: "D"
      description: "Recoil"
      score: 69
      rejected_reason: "Maintenance trajectory is uncertain; no team experience; caution-level score"

    - id: "E"
      description: "MobX"
      score: 65
      rejected_reason: "Paradigm mismatch with the team's React mental model; highest learning cost"

  lookahead:
    next_decision: "Server state strategy — React Query vs SWR vs RTK Query for async data fetching"
    expected_complexity: "Medium"
    risks:
      - "Zustand stores can become unwieldy without enforced slice conventions — establish a store structure guide early"
      - "If server state is added ad hoc inside Zustand stores, separation of concerns will degrade over time"
      - "Migration cost to Redux if scale demands it later — estimated 5-8 days of refactoring"

  backtrack_plan:
    trigger: >
      Team consistently struggles with Zustand patterns after 2 weeks, or application
      state complexity exceeds what Zustand handles cleanly (e.g., complex async flows,
      cache invalidation, optimistic updates)
    action: "Migrate to Redux Toolkit; Zustand and RTK can coexist during transition"
    estimated_recovery_time: "4-5 days for full migration"
```
