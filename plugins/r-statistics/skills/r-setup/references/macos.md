# r-setup — macOS

Approved install command (run only after explicit consent):

```bash
brew install --cask r
```

## Notes

- Requires Homebrew (https://brew.sh). The `--cask r` formula installs the
  official CRAN R build.
- R installs `Rscript` under
  `/Library/Frameworks/R.framework/Resources/bin/Rscript`, usually symlinked
  into `/usr/local/bin` (Intel) or `/opt/homebrew/bin` (Apple Silicon). The
  execution layer probes all of these.
- If `Rscript` is not found afterward, set `R_STATISTICS_RSCRIPT` to its full
  path.

## Verify

```bash
Rscript --version
```
