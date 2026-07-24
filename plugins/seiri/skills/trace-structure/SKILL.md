---
name: trace-structure
user-invocable: true
disallowed-tools: AskUserQuestion
description: '[seiri:trace-structure] Map how the code actually connects — call paths, dispatch targets, data flow — before acting on a fast reading. Use when a problem needs deep understanding of polymorphic or highly indirect code.'
argument-hint: '[the problem or area that needs deep understanding]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# trace-structure — read the connections before judging

This skill may be invoked automatically. Do not ask questions. When a choice is needed, take the conservative default and say so in one line.

The first plausible reading of complex code is usually wrong somewhere that matters. Replace inference with traced fact before acting.

## Workflow

**1. Name the question.** State what the original problem needs from the codebase. Tracing without a question is sightseeing.

**2. Find the true entry points.** Locate where the behaviour actually starts — registration, wiring, configuration — not the first grep hit.

**3. Trace connections until they land.** Follow calls, imports, and events through every indirection to concrete code, resolving dynamic dispatch to its real targets — `references/indirection.md`.

**4. Trace the data.** Follow the problem's central values from origin through each transformation to use, reading both sides wherever shape or ownership changes — `references/data-flow.md`.

**5. Brief, then continue.** Report the structure in brief: entry points, load-bearing paths, data flow, what surprised you — each edge cited as file:line. Then carry the original task forward.

## Rules

- A connection you have not read is a guess. Cite the line where each edge exists.
- Slow reading is the point: prefer the whole mechanism over a sample of it.
- Mark untraced paths as untraced, never as understood.
- Do not modify files while tracing; the enclosing task decides changes.
- Hand off: when the enclosing work is multi-step, the brief feeds write-plan.
