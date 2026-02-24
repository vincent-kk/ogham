# Ogham

[![TypeScript](https://img.shields.io/badge/typescript-✔-blue.svg)]()
[![Claude Code](https://img.shields.io/badge/claude--code-plugin-purple.svg)]()
[![Node.js](https://img.shields.io/badge/node.js-20+-green.svg)]()

---

## Overview

**Ogham** is a monorepo for Claude Code plugins and AI-powered developer tools. Everything is built with TypeScript. The repo hosts plugins that extend Claude Code agent behavior — from automated project structure management to multi-persona code reviews.

---

## Quick Start — Marketplace Installation

The easiest way to use Ogham plugins is through the Claude Code plugin marketplace.

```bash
# 1. Register this repository as a marketplace source
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install a plugin
claude plugin install filid
```

That's it. All components (Skills, MCP tools, Agents, Hooks) register automatically — no manual configuration needed.

> After installation, you can start using plugin skills directly in Claude Code. For example, type `/filid:fca-init` to initialize FCA-AI in your project.

---

## Plugins

### [`@ogham/filid`](./packages/filid/) — FCA-AI Rule Enforcement

A Claude Code plugin that automatically manages project structure and documentation through **Fractal Context Architecture (FCA-AI)**.

As codebases grow, AI agents lose context, documentation drifts from code, and directory structures lose consistency. filid solves this with automated rule enforcement.

**What it provides:**

| Component        | Count | Examples                                            |
| ---------------- | ----- | --------------------------------------------------- |
| Skills           | 14    | `/filid:fca-init`, `/filid:fca-review`, `/filid:fca-scan` |
| MCP Tools        | 14    | Structure analysis, drift detection, metrics        |
| Agents           | 7     | Architect, Implementer, QA Reviewer, etc.           |
| Hooks            | 6     | Auto line-limit check, organ protection, rule injection |

**Key features:**

- **Multi-persona code review** — A committee of specialized reviewers reaches consensus on your PR changes
- **Automated rule enforcement** — CLAUDE.md line limits, boundary sections, organ directory protection
- **Structural drift detection** — Detects when code changes break documented structure and syncs automatically
- **AST-powered analysis** — Module cohesion (LCOM4), cyclomatic complexity, circular dependency detection

```
# Initialize FCA-AI in your project
/filid:fca-init

# Scan for rule violations
/filid:fca-scan

# Run multi-persona code review on current branch
/filid:fca-review
```

For full documentation, see the [filid README](./packages/filid/README.md) ([Korean](./packages/filid/README-ko_kr.md)).

---

## All Packages

| Package                                  | Type          | Version | Description                                      |
| ---------------------------------------- | ------------- | ------- | ------------------------------------------------ |
| **[`filid`](./packages/filid/)**         | Claude plugin | 0.0.12  | FCA-AI rule enforcement and fractal context management |

---

## Development Environment Setup

```bash
# Clone repository
dir=your-ogham && git clone https://github.com/vincent-kk/ogham.git "$dir" && cd "$dir"

# Install dependencies
nvm use && yarn install && yarn build:all

# Use yarn workspaces
yarn workspace <package-name> <command>

# Run tests
yarn workspace <package-name> test

# Build
yarn workspace <package-name> build
```

---

## Compatibility

This package is built with ECMAScript 2022 (ES2022) syntax.

If you're using a JavaScript environment that doesn't support ES2022, you'll need to include this package in your transpilation process.

**Supported environments:**

- Node.js 20.0.0 or later

**For legacy environment support:**
Please use a transpiler like Babel to transform the code for your target environment.

---

## Version Management

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### Creating a Changeset

When you make changes to any package, create a changeset to document your changes:

```bash
yarn changeset
```

### Releasing

```bash
# Update package versions based on changesets
yarn changeset:version

# Publish packages to npm
yarn changeset:publish
```

### Changeset Guidelines

- **patch**: Bug fixes, documentation updates, internal refactoring
- **minor**: New features, new exports, non-breaking changes
- **major**: Breaking changes, removed exports, API changes

---

## Scripts

- `yarn build:all` — Build all packages
- `yarn test` — Run tests across all packages
- `yarn lint` — Check code style
- `yarn typecheck` — Verify TypeScript types
- `yarn changeset` — Create a new changeset
- `yarn changeset:version` — Update versions based on changesets
- `yarn changeset:publish` — Publish packages to npm
- `yarn tag:packages <commit>` — Create Git tags for all packages based on their versions

---

## License

This repository is provided under the MIT license. For more details, please refer to the [`LICENSE`](./LICENSE) file.

---

## Contact

If you have any questions or suggestions related to the project, please create an issue.

[Korean documentation (README-ko_kr.md)](./README-ko_kr.md) is also available.
