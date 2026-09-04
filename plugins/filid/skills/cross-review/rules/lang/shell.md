# Shell Review Rules

Apply each item as a falsifiable question about added or modified shell behavior.

- **SH-1 — Unquoted expansion**: Can a changed unquoted variable expansion split fields, expand globs, or erase an empty argument unexpectedly?
- **SH-2 — Pipeline failure**: Can a changed pipeline under `set -e` continue or exit with the wrong status because an earlier command failed?
- **SH-3 — Temporary-file race**: Can a changed predictable temporary path be replaced, observed, or collided with before use?
- **SH-4 — Recursive-delete target**: Can an empty, unset, broad, or malformed variable make a changed `rm -rf` target escape the intended directory?
- **SH-5 — Path whitespace**: Can a changed command corrupt a path containing spaces, tabs, newlines, glob characters, or a leading dash?
- **SH-6 — Eval injection**: Can untrusted or partially quoted data become executable syntax through changed `eval` use?
- **SH-7 — Portability**: Can a changed non-portable command, flag, shell feature, or utility assumption fail on a declared target environment?
