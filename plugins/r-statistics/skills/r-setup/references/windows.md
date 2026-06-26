# r-setup — Windows

Approved install commands (run only after explicit consent):

```powershell
winget install RProject.R
# or, with Chocolatey:
choco install r.project
```

## Notes

- Prefer `winget` (ships with modern Windows); fall back to `choco` if Winget is
  unavailable.
- The installer registers R under `HKLM\SOFTWARE\R-core\R` and typically
  installs to `C:\Program Files\R\R-<version>\`. The execution layer discovers
  `Rscript.exe` from the registry and that directory automatically.
- If `Rscript.exe` is still not found afterward, set the environment variable
  `R_STATISTICS_RSCRIPT` to its full path, e.g.
  `C:\Program Files\R\R-4.4.1\bin\Rscript.exe`.

## R packages

After R is installed, r-setup checks the required package set. CRAN ships Windows
binaries (Rtools usually unneeded). Mind PowerShell quoting — outer double, inner
single:

```powershell
Rscript -e "install.packages(c('jsonlite','data.table','ggplot2'), repos='https://cloud.r-project.org')"
```

## Verify

```powershell
Rscript --version
```
