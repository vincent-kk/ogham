---
id: shared-cross-platform-src-2e5c67
fractal_path: shared/cross-platform/src
file_path: shared/cross-platform/src
created_at: "2026-07-24T17:01:00Z"
review_branch: feature/issue-78-1
original_fix_id: FIX-005
severity: MEDIUM
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: zero-peer-file
metric_value: 57 peer files across 13 sub-fractals
---

# 기술 부채: shared/cross-platform zero-peer-file — restructure deferred (hook-bundling architecture)
## 원래 수정 요청
FIX-005 (cross-review): 13 fractal roots (hostPaths, paths/compat, spawn, instructions, agyHooks, hostRegistry, hooks, codexHooks, binaries, agyRunner, shim, launcher, eol) hold 57 implementation peer files beyond the allowed set (index.ts/main.ts/INTENT.md/DETAIL.md/eponymous). structure_validate measured; config rule severity is `warning`; no additional-allowed/eponymous exemption. Verifier CONFIRMED the rule application but flagged low actionability (generic structural-debt consequence; identical pattern already tolerated in sibling shared/http-guard).
## 개발자 소명
Mechanical peer-file promotion via filid:restructure --auto-approve was deliberately NOT applied. The package has a documented hook-bundling architecture: lean barrels, hook-reachable files importing sibling internals DIRECTLY (paths.ts:16-18 comment, paths/INTENT.md, root CLAUDE.md '훅 직접 import 원칙'), and package.json exports mapping individual dist/hooks/*.js files (./error-log, ./self-probe, ./bootstrap). A blind restructure would fight this architecture and risk a hook-bundle break that typecheck cannot catch (per CLAUDE.md's byte-cap/forbidden-module guard warning). The identical zero-peer-file pattern is already tolerated in sibling shared/http-guard/src. Recording as accepted structural debt is the proportionate resolution (matches business-driver's committee recommendation).
## 정제된 ADR
ADR-2026-07-24: shared/cross-platform zero-peer-file promotion deferred to debt. Context: cross-review FIX-005 flagged zero-peer-file (warning severity) across 13 sub-fractals / 57 peer files in shared/cross-platform/src; verifier CONFIRMED but low-actionability. Decision: defer the mechanical restructure — the package's deliberate hook-bundling architecture (lean barrels + direct hook-reachable sibling imports + per-file package exports) makes a blind promotion counterproductive and risky (potential hook-bundle break invisible to typecheck); the pattern is already tolerated in sibling shared/http-guard. Consequences: zero-peer-file warnings remain (parity with http-guard). Future resolution: register additional-allowed exceptions in .filid/config.json documenting the intentional tolerance, OR perform a hook-architecture-aware promotion preserving the direct-import exceptions and exports map. Not blocking merge.
