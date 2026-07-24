# Tracing Data Flow

Connections say what can call what; data flow says what actually travels. For the values at the heart of the problem, follow each from origin to use — most wrong judgments about complex code are wrong about where a value comes from or what has happened to it by the time it is used.

## Origin to use

- **Origin.** Where the value first enters — user input, file, network, database, constant, another module's output. The origin fixes what may be assumed about it: validated or raw, trusted or external, always present or optional.
- **Transformations.** Each place the value is mapped, merged, defaulted, serialized, or filtered. Read the transform, not its name — `normalize` may do five things, and the fifth is where the surprise lives.
- **Use.** The sites whose behaviour the problem is about. Arriving here without having read the transforms in between is inference, not tracing.

## Boundary crossings

Wherever a value changes representation or ownership, read both sides:

- Serialization and parsing (JSON, database rows, wire formats) — field names and defaults drift between the two sides.
- Process and async boundaries (queues, IPC, workers) — the value read is not always the value that was written.
- Caches and stores — a stale copy is a second origin with its own history.

## State

Mutable state is data flow folded over time. For state central to the question: find every writer, not just the obvious one; note the orders in which writers and readers can interleave; treat "who else mutates this" as a search, not a recollection.

## In the brief

Report each traced value as origin → transformations → use, with a file:line per hop. A hop you inferred but did not read is marked as such.
