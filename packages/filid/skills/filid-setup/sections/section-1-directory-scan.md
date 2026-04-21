# filid-setup — Directory Scan (Phase 1)

> Detail reference for Phase 1 of /filid:filid-setup.
> See [../SKILL.md](../SKILL.md) for the skill overview and phase chaining.

Call `mcp_t_fractal_scan` to retrieve the complete project hierarchy by scanning the filesystem.

```
mcp_t_fractal_scan({ path: "<target-path>" })
```

The response is a `ScanReport` containing:

- `tree.nodes`: Map of path → FractalNode (with `name`, `path`, `type`, `hasIntentMd`, `hasDetailMd`, `children`)
- `tree.nodesList`: flat array of all FractalNode objects (for convenient iteration)
- `tree.root`: root directory path
- `modules`: optional ModuleInfo list (empty unless `includeModuleInfo: true`)

> **Important — `tree.nodes` is an object (dict) in JSON, NOT an array.**
> Use `tree.nodesList` for safe array iteration. Use `tree.nodes["/path"]` for path-based lookup.

Build an internal working list of all directories from `tree.nodesList` (or `tree.nodes`) for Phase 2 classification.

> **Note**: Do NOT use `mcp_t_fractal_navigate(action: "tree")` for scanning — that tool
> builds a tree only from a pre-supplied `entries` array and does not read the filesystem.

> **Important**: `tree.nodes` in the `mcp_t_fractal_scan` response contains **all**
> directories, including those nested inside organ nodes. In Phase 2, always
> iterate over the full `tree.nodes.values()`. Traversing only `children` from
> `tree.root` will miss fractal nodes that live inside organ boundaries.
