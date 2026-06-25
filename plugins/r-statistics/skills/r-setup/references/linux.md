# r-setup — Linux

Approved install commands by distribution family (run only after explicit
consent). Prefer the distribution package; for the latest R, the official CRAN
repository is the maintainer-recommended source.

```bash
# Debian / Ubuntu
sudo apt-get update && sudo apt-get install -y r-base

# Fedora
sudo dnf install -y R

# RHEL / CentOS / Rocky / Alma (EPEL)
sudo dnf install -y R

# Arch
sudo pacman -S r

# openSUSE
sudo zypper install R-base
```

## Notes

- Distribution packages can lag CRAN. For the current release, follow the CRAN
  Linux instructions (https://cran.r-project.org/bin/linux/) to add the official
  repository, then install `r-base`.
- R installs `Rscript` to `/usr/bin/Rscript` or `/usr/local/bin/Rscript`, both
  probed by the execution layer.
- If `Rscript` is not found afterward, set `R_STATISTICS_RSCRIPT` to its full
  path.

## Verify

```bash
Rscript --version
```
