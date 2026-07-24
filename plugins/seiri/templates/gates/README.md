# gates — repository gate scaffolds (values-free)

`setup` may drop these scaffolds into a target repository. seiri **deploys
rules, it does not own a repository's thresholds or verification commands** —
so every file here is a **values-free skeleton**: it gives the shape, you fill
in the checks.

The intervention dial (`advisory` / `standard` / `strict`) changes only how
strongly the skill _offers_ these scaffolds. The file contents shipped here are
identical regardless of the dial.

## pre-commit skeleton

```sh
#!/bin/sh
# seiri gate scaffold — fill in your repository's own checks.
# e.g. confirm the rule docs you opted into are still deployed and in sync,
# or run this repository's verification command. seiri prescribes neither
# threshold nor command — the repository owns them.
: # no-op placeholder
```

## CI step skeleton

```yaml
# seiri gate scaffold — fill in your repository's own checks.
# This job is intentionally empty of values; the repository supplies them.
steps:
  - run: 'true' # placeholder — replace with your verification
```
