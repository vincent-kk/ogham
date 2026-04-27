# filid-setup — Directory Scan (Phase 1)

> Detail reference for Phase 1 of /filid:filid-setup.
> See [../SKILL.md](../SKILL.md) for the skill overview and phase chaining.

Call `mcp_t_fractal_scan` to retrieve the complete project hierarchy by scanning the filesystem.

```
mcp_t_fractal_scan({ path: "<target-path>" })
```

The response is a `ScanReportDto` containing:

- `tree.nodes`: **flat array** of FractalNode objects (with `name`, `path`, `type`, `hasIntentMd`, `hasDetailMd`, `children`)
- `tree.root`: root directory path
- `tree.totalNodes`: total node count
- `modules`: optional ModuleInfo list (empty unless `includeModuleInfo: true`)

Build an internal working list of all directories from `tree.nodes` for Phase 2 classification (e.g. `tree.nodes.map(...)`, `tree.nodes.filter(...)`).

> **Note**: Do NOT use `mcp_t_fractal_navigate(action: "tree")` for scanning — that tool
> builds a tree only from a pre-supplied `entries` array and does not read the filesystem.

> **Important**: `tree.nodes` in the `mcp_t_fractal_scan` response contains **all**
> directories, including those nested inside organ nodes. In Phase 2, always
> iterate over the full `tree.nodes` array. Traversing only `children` from
> the root node will miss fractal nodes that live inside organ boundaries.
