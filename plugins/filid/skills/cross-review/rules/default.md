# Default Review Rules

Prefer precision over recall. False positives erode trust; discard a concern unless you can state a reachable failure or degradation path.

Do not report anything a linter, type checker, or formatter already rejects. These rules target defects that remain after routine automated checks.

Apply these rules to every reviewable file. Each item is a falsifiable question about the changed behavior. Map Correctness and Language-Specific findings to `bug`, Security and Configuration findings to `security`, Performance findings to `performance`, and Maintainability findings to `maintainability`.

## Correctness

- **DEF-1 — Logic**: Does a changed condition, branch, ordering rule, or state transition produce an incorrect result on a reachable input?
- **DEF-2 — Boundaries**: Can a zero, empty, first, last, minimum, maximum, overflow, or underflow case cross the changed boundary incorrectly?
- **DEF-3 — Nullability**: Can a null, undefined, missing, or invalid value reach a changed dereference or operation without the declared handling?
- **DEF-4 — Error handling**: Can the changed error path swallow a failure, report false success, lose required context, or leave inconsistent state?
- **DEF-5 — Resource release**: Can a changed success, failure, cancellation, or early-return path leave a file, socket, lock, subscription, timer, or similar resource unreleased?
- **DEF-6 — Check then act**: Can another actor invalidate a checked condition before the changed mutation or use occurs?
- **DEF-7 — Composite atomicity**: Can partial completion of a changed multi-step operation expose an invalid externally visible state?

## Security

- **DEF-8 — Injection**: Can untrusted data reach a changed query, command, template, header, or interpreter boundary without context-appropriate encoding or parameterization?
- **DEF-9 — Authorization**: Can a caller reach the changed protected action without the required identity, ownership, role, or scope check?
- **DEF-10 — Secret exposure**: Can the change disclose a credential or sensitive value through source, logs, errors, output, or persisted state?
- **DEF-11 — Deserialization**: Can the change deserialize untrusted data into executable, privileged, or unconstrained objects without validation?
- **DEF-12 — Path traversal**: Can untrusted path input escape the intended root after the change's normalization and resolution steps?
- **DEF-13 — Dynamic evaluation**: Can untrusted input reach `eval`-like execution, dynamic loading, or generated code through the changed path?

## Performance

- **DEF-14 — Query in loop**: Does the change execute a database, filesystem, network, or similarly expensive query once per loop item when it can be bounded or batched?
- **DEF-15 — N+1 work**: Does the change make one initial lookup trigger an additional remote or persistent lookup for each returned item?
- **DEF-16 — Unbounded growth**: Can a changed collection, cache, queue, listener set, or retained buffer grow without a lifecycle or size bound?
- **DEF-17 — Hot-path complexity**: Does the change introduce quadratic or worse work on a demonstrated hot path or unbounded input?

## Maintainability

- **DEF-18 — Dead code**: Does the change introduce a branch, declaration, configuration entry, or export that no reachable consumer can use?
- **DEF-19 — Duplicated logic**: Does the change duplicate a decision rule so that one copy can diverge and produce inconsistent behavior?
- **DEF-20 — Misleading name**: Does a changed name cause a concrete false assumption about units, ownership, lifecycle, direction, or side effects that leads to misuse?
- **DEF-21 — Business literals**: Does the change hard-code a business value in a second authority that can drift from its canonical definition?

## Configuration and Manifests

- **DEF-22 — Version pinning**: Does a changed dependency, action, image, runtime, or tool reference allow an unreviewed version to execute?
- **DEF-23 — Plaintext secrets**: Does the changed configuration or manifest contain a credential, token, private key, or sensitive endpoint secret in plaintext?
- **DEF-24 — CI privilege**: Does a changed workflow grant a job, token, event, or third-party action more write or secret access than its steps require?

## Language-Specific Checks

- **DEF-25 — Idiomatic defect**: `rules/lang/*.md` takes precedence when present. Does the changed code trigger a documented language-specific trap with a concrete runtime, type, ownership, lifetime, or comparison failure?
- **DEF-26 — Obvious typo**: Does an obvious typo in a changed identifier, string, or path cause a reachable behavior failure?
