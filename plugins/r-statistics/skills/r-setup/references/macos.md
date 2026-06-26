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

## R packages

After R is installed, r-setup checks the required package set. macOS uses CRAN
binaries (no build tools needed); install missing packages with:

```bash
Rscript -e 'install.packages(c("jsonlite","data.table","ggplot2"), repos="https://cloud.r-project.org")'
```

`arrow` is a large binary but installs cleanly from CRAN.

## Verify

```bash
Rscript --version
```
