# fractalScan — Detail

## Requirements

- Build a `FractalTree` for the given root path using `scanProject` with the
  resolved `maxDepth`.
- When `includeModuleInfo: true`, run `analyzeModule` per node in parallel via
  `Promise.allSettled` and surface only fulfilled results.
- Return a flat MCP DTO so the LLM-facing payload is minimal.

## API Contracts

### Input

```ts
interface FractalScanInput {
  path: string;             // required, absolute or repo-relative
  depth?: number;           // overrides config.scan.maxDepth
  includeModuleInfo?: boolean;
}
```

### Output — `ScanReportDto`

```ts
interface ScanReportDto {
  tree: {
    root: string;
    depth: number;
    totalNodes: number;
    nodes: FractalNode[];   // flat array — NOT a Map
  };
  modules: ModuleInfo[];    // empty unless includeModuleInfo: true
  timestamp: string;
  duration: number;
}
```

### Serialization policy

- The handler does NOT return the in-process `FractalTree` (whose `nodes` is a
  `Map`) directly. Doing so triggered Map → object conversion in the MCP
  transport, inflating response size.
- DTO conversion happens at the MCP boundary only; in-process callers continue
  to consume `FractalTree` from `scanProject` unchanged.
