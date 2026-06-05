# prawf

A Claude Code plugin in the [ogham](https://github.com/vincent-kk/ogham) monorepo.

> **Status: skeleton.** The package currently ships only the build/test scaffolding and an FCA-compliant source layout. Its capabilities (MCP server, skills, hooks) are not yet decided.

## Install

```bash
/plugin marketplace add vincent-kk/ogham
/plugin install prawf@ogham
```

## Development

```bash
yarn prawf build       # build
yarn prawf typecheck   # type check
yarn prawf test:run    # run tests
```

See [CLAUDE.md](./CLAUDE.md) for the full working guide.

Korean: [README-ko_kr.md](./README-ko_kr.md)
