# Manifest Review Rules

Apply each item as a falsifiable question about added or modified package and compiler metadata.

- **MF-1 — Unbounded version**: Can `latest`, `*`, or a changed version range resolve to unreviewed dependency behavior where reproducibility is required?
- **MF-2 — Dependency overlap**: Does the same package appear in both `dependencies` and `devDependencies` with ownership or version semantics that can diverge?
- **MF-3 — Undeclared script tool**: Can a changed script invoke a tool that is not declared by the package or otherwise guaranteed by its execution environment?
- **MF-4 — Published path mismatch**: Does a changed `exports`, `files`, or `bin` path omit its built target or expose a nonexistent path?
- **MF-5 — Side-effect declaration**: Can a changed `sideEffects` declaration cause a required import effect to be removed or prevent safe tree-shaking?
- **MF-6 — TypeScript graph mismatch**: Can changed `tsconfig` `paths` or `references` resolve differently between the compiler, build, and runtime?
- **MF-7 — Lifecycle execution**: Can a changed lifecycle script execute unexpected code during install, pack, publish, or repository setup?
