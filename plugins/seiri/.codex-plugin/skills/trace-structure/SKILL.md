---
name: trace-structure
user-invocable: true
description: 'Map how the code actually connects — call paths, dispatch targets, data flow — before acting on a fast reading. Use when a problem needs deep understanding of polymorphic or highly indirect code.'
argument-hint: '[the problem or area that needs deep understanding]'
version: '0.2.0'
complexity: moderate
plugin: seiri
---

# trace-structure — read the connections before judging



This skill may be invoked automatically. Prefer autonomous judgment: when a choice is needed, take the conservative default and say so in one line. A genuine blocker — a decision only the user can resolve — earns one crisp AskUserQuestion; a routine checkpoint does not.

The first plausible reading of complex code is usually wrong somewhere that matters. Replace inference with traced fact before acting.

## Workflow

Standalone tracing does not activate a workflow. In an assisted task, retain its existing connection per [workflow lifecycle](../execute/references/workflow-lifecycle.md). If a `[seiri]` progress line or workflow acknowledgement in this session names an active task, call `mcp__seiri__runtime({ action: "step", step: "trace-structure", project_root, task })` with that task and continue without waiting. If you are clearly performing a different task, call it with that task's name instead and follow its acknowledgement. Standalone use needs no call.

**1. Name the question.** State what the original problem needs from the codebase. Tracing without a question is sightseeing.

**2. Find the true entry points.** Locate where the behaviour actually starts — registration, wiring, configuration — not the first grep hit.

**3. Trace connections until they land.** Follow calls, imports, and events through every indirection to concrete code, resolving dynamic dispatch to its real targets.

**4. Trace the data.** Follow the problem's central values from origin through each transformation to use, reading both sides wherever shape or ownership changes.

**5. Brief, then continue.** Report the structure: entry points, load-bearing paths, data flow, what surprised you — each edge cited as file:line. Then carry the original task forward.

## Rules

- A connection you have not read is a guess. Cite the line where each edge exists.
- Slow reading is the point: prefer the whole mechanism over a sample of it.
- Stop tracing when no unresolved edge can change the answer.
- Mark untraced paths as untraced, never as understood.
- Do not modify files while tracing; the enclosing task decides changes.
- Return to the enclosing task. An explanation or review ends with its answer; create an implementation plan only when substantial changes are actually requested.
