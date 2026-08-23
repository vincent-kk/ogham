# setup — Windows

Approved install commands (run only after explicit consent):

```powershell
winget install RProject.R
# or, with Chocolatey:
choco install r.project
```

## Notes

- Prefer `winget` (ships with modern Windows); fall back to `choco` if Winget is unavailable.
- The installer registers R under `HKLM\SOFTWARE\R-core\R` and typically installs to `C:\Program Files\R\R-<version>\`. The execution layer discovers `Rscript.exe` from the registry and that directory automatically.
- If `Rscript.exe` is still not found afterward, set the environment variable `R_STATISTICS_RSCRIPT` to its full path, e.g. `C:\Program Files\R\R-4.4.1\bin\Rscript.exe`.

## R packages

After R is installed, Step 6 checks packages through `run_r`. Capture that response's `managedLibraryPath`; it is the only installation target. CRAN ships Windows binaries (Rtools usually unneeded). Install packages fresh there; do not copy or move an existing `win-library` tree into it.

For PowerShell, single-quote the path and double every embedded `'`. Backslashes and spaces stay literal. For example:

```powershell
$env:R_STATISTICS_LIB = 'C:\R Lib\Owner''s'
```

Use that safely quoted assignment for the consented install:

```powershell
$env:R_STATISTICS_LIB = '<PowerShell-quoted managedLibraryPath>'; Rscript -e "managed <- Sys.getenv('R_STATISTICS_LIB'); dir.create(managed, recursive=TRUE, showWarnings=FALSE); .libPaths(managed); install.packages(c('jsonlite','data.table','ggplot2'), lib=managed, repos='https://cloud.r-project.org')"
```

Using `.libPaths(managed)` plus `install.packages(..., lib=managed)` ensures the dependency closure lands in the same managed library that `run_r` prepends via `R_STATISTICS_LIB`.

If packages still crash after a fresh managed install, check that the package binaries match the active R version and that any locally compiled packages were built with a compatible Rtools version. This is a troubleshooting variable, not a code-enforced requirement.

## Verify

```powershell
Rscript --version
```
