# Resolving Indirection

Indirection is where a fast reading goes wrong: the call you see is not the code that runs. Each layer below hides its targets differently — the job is always the same, enumerate the real targets and read the ones on your path.

## Polymorphic calls

A call through an interface, base class, or protocol has as many targets as implementations. Find them all before deciding which matter:

- Search for declarations that implement, extend, or override the symbol — not for callers.
- Read enough of each implementation to know whether it can be on your path; say which you ruled out and why.

The dangerous case is the implementation you did not know existed. An enumeration is finished only when you can defend it: "these three, because the search covered the whole repository for `implements Foo`".

## Registration and injection

When wiring happens at runtime — dependency injection, plugin registries, service locators, hook systems — the connection exists only at the registration site.

- Find where the registry is populated, not where it is consumed.
- Configuration files, environment switches, and build flags are wiring too: the active target may be chosen outside the language.

## Events and messages

Emitters and handlers share no call edge. Trace by the event name or message type: find every subscription, then treat each handler as a call target. Order and timing assumptions belong in the brief — they are structure.

## When to stop

Stop expanding when the remaining unresolved edges can no longer change the answer to the question named in step 1. Stopping earlier is a guess; say explicitly which edges you left unresolved and why they cannot matter.
