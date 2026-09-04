# Workflow Review Rules

Apply each item as a falsifiable question about added or modified automation behavior.

- **WF-1 — Privileged target checkout**: Can a `pull_request_target` workflow check out or execute pull-request-controlled code with base-repository privileges?
- **WF-2 — Action pinning**: Can a changed third-party action reference resolve to new unreviewed code because it is not pinned to a full commit SHA?
- **WF-3 — Excess permissions**: Does a changed job or workflow grant token permissions beyond what its commands require?
- **WF-4 — Secret logging**: Can a changed command, trace mode, error, or artifact expose a secret in workflow logs?
- **WF-5 — Expression injection**: Can untrusted `${{ github.event.* }}` data become executable shell or script syntax in a changed step?
- **WF-6 — Cache poisoning**: Can an untrusted run write a cache key or payload later restored in a more privileged context?
- **WF-7 — Ignored failure**: Can changed `continue-on-error` handling hide a failure that must block publication, deployment, or verification?
