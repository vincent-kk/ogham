---
name: mental-model
user-invocable: true
description: '[maencof:mental-model] Reconstructs how a subject actually is — a person, an organization, a system, a plan, or yourself — by triangulating shadows (vault records, documents, statements, observed behavior) into falsifiable claims, attacking each claim, and reporting only the survivors, each marked seen, heard, inferred, or assumed.'
argument-hint: '[the question the model must answer]'
version: '1.1.0'
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: mental-model skill
plugin: maencof
---

# mental-model — Tracing the Form from Its Shadows

Plato's cave, taken as method rather than tragedy. Everything you can examine — a record, a document, a statement, a reaction — is a shadow the subject cast, never the subject itself. A mental model is the Form reconstructed from those shadows, and the honest way to build one is inductive: gather projections from as many angles as the walls allow, hypothesize the shape that would cast all of them, then hunt for the shadow that shape could not cast. A model that never survived the hunt is a plausible silhouette — and a plausible model reads exactly like a correct one.

## When to Use This Skill

- A question about how something actually is or works, beyond what any single document says — "why does this keep happening", "what does this person/org actually want", "am I understanding this situation right"
- Before a decision that depends on how a person, organization, or system will respond
- When today's impression and an older vault record seem to disagree
- Explicit request: "build a mental model", "멘탈모델"

## When to Use vs Adjacent Skills

- **`mental-model`** — reconstructs what IS, and attacks the reconstruction. Output: claims with provenance marks.
- **`think`** — chooses among candidate interpretations of what to DO. Forward-looking; feed it a model, since candidates built on attacked claims beat candidates built on impressions.
- **`explore` / `recall`** — find and fetch vault documents; no claims, no attacks. Use them to gather shadows, then return here to model.
- **A code-specialized variant** — when the environment provides a mental-model discipline specialized to code (claims traced to `file:line`), prefer it when the question is what code does.

## Prerequisites

None hard. When the vault index exists it is the cheapest source of shadows; without it the vault contributes none and the report must say so.

## Workflow

### Step 1 — Fix the question

State what the model must answer, and what would be done differently depending on the answer. Name the subject in one line. No question → ask. A model with no question grows until it retells everything it touched. Ask everything you need now — the steps after this do not stop to ask.

### Step 2 — Collect shadows, in two layers

A shadow is an observation with provenance: where it fell, when, who cast it. Collect in two layers. **Deep** — the subject's standing context a stranger would need, kept as skippable background for whoever already knows it. **Narrow** — shadows that touch the question directly; never skippable. Sources, cheapest first:

1. **The vault** — records are shadows cast earlier, before today's argument existed. Check `mcp__plugin_maencof_tools__kg_status`; search with `mcp__plugin_maencof_tools__kg_search`, seeding each key concept in the user's working language AND English as separate items; follow `mcp__plugin_maencof_tools__kg_navigate`; read what matters with `mcp__plugin_maencof_tools__read`.
2. **The conversation and documents at hand.**
3. **The user** — ask for observations, not conclusions: "what did they do" beats "what are they like".

What you did not see or hear yourself is a description of a shadow — usable, but marked as such (`references/claims.md`). Provenance forms: vault path · quote + speaker + date · document + section · event + when.

### Step 3 — Hypothesize the Form, essence first

Before any list of claims, state the Form in one piece — the shape that would cast every shadow you collected — and bind it to one concrete scenario with toy specifics: "if this Form is real, scenario X unfolds as Y." Then split it into claims that could be wrong: each states what must hold, and what breaks if it does not. One claim, one layer — **Shape** (what it is), **Behaviour** (how it acts), **Purpose** (what it is for and what it protects). The essence enters the model only through its split claims; the scenario becomes step 4's cheapest attack. Cut every sentence that predicts nothing — that is summary, and summary cannot be checked. Forms and layers: `references/claims.md`.

### Step 4 — Attack each claim

An attack is a prediction: if the Form is real, a wall you have not checked must show a matching shadow — derive it, then go look. The vault makes two attacks cheap:

- **Time** — search a period the claim was not built from; subjects drift, and models do not notice on their own.
- **Independence** — trace each supporting shadow to its projector; three retellings of one account are one shadow.

A third needs no vault: **Simulation** — walk the step-3 scenario against records it was not built from. An unattacked claim does not enter the model. Where counterexamples hide, per layer, how each medium distorts, and the simulation attack: `references/breaking.md`.

### Step 5 — Report what survived, ordered and marked

Both background layers first (deep marked skippable), essence second, per-layer claims last — the reader meets the subject before the verdicts, and a Form a refuted claim supported is redrawn before it may lead the report. Each claim carries `seen`, `heard`, `inferred`, or `assumed` (`references/claims.md`). Refuted claims stay in the report with what killed them. There is no mark for knowledge: the strongest claim is seen from independent angles and still standing — which is not proof.

### Step 6 — Close the loop

Answer the step-1 question from surviving claims only. If they cannot answer it, the model is not done: name which walls still need light — what to record, ask, or observe — and return to step 2. A model that survived every attack yet answers nothing is a tour, not a model.

## Rules

- Surviving an attack is not proof. It means not broken yet; the mark says how hard you tried.
- One claim, one layer. A claim spanning shape, behaviour, and purpose cannot be attacked — a counterexample against one part leaves the rest standing.
- The mark binds to the claim's subject, not to your reading act: a plan document read firsthand makes "the plan says X" `seen` and "the project does X" `heard` at best.
- Read-only toward the vault. Modeling writes nothing; the model is session-ephemeral. Persist only on explicit request, via `/maencof:remember` (it recommends the layer: person → relational, organization → structural, concept → topical).
- Hand-offs: a model that shapes a decision → `/maencof:think`; shadows missing → `/maencof:explore`; a code-behaviour question → the code-specialized discipline when the environment provides one.

## Available MCP Tools

| Tool                                     | Purpose                                 |
| ---------------------------------------- | --------------------------------------- |
| `mcp__plugin_maencof_tools__kg_status`   | Vault index presence and freshness      |
| `mcp__plugin_maencof_tools__kg_search`   | Find shadows: SA search across layers   |
| `mcp__plugin_maencof_tools__kg_navigate` | Follow links between shadows            |
| `mcp__plugin_maencof_tools__kg_context`  | Token-budgeted assembly of many shadows |
| `mcp__plugin_maencof_tools__read`        | Read one document in full               |

## Error Handling

- **No question**: ask before collecting — collection without a question is a tour, not a model.
- **No index**: proceed without vault shadows and state their absence in the report.
- **Zero shadows**: the model cannot start. Name which walls need light first — what to record, ask, or observe — rather than writing claims from nothing.
