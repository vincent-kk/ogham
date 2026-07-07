# fractalScan — Detail

## Requirements

- Build a `FractalTree` for the given root path using `scanProject` with the
  resolved `maxDepth`.
- When `includeModuleInfo: true`, run `analyzeModule` per node in parallel via
  `Promise.allSettled` and surface only fulfilled results.
- Return a flat MCP DTO so the LLM-facing payload is minimal.
- Respect the caller's `outputMode` and never return a payload that overflows
  the MCP tool-result budget: oversized payloads go to a report file.

## API Contracts

### Input

```ts
interface FractalScanInput {
  path: string; // required, absolute or repo-relative
  depth?: number; // overrides config.scan.maxDepth
  includeModuleInfo?: boolean;
  outputMode?: 'full' | 'summary' | 'paths'; // default 'full'
}
```

### Output

- `full` — `ScanReportDto` (below).
- `summary` — `ScanSummaryDto`: `{ outputMode, root, depth, totalNodes,
nodesByType, missingIntentFractals, timestamp, duration }`. Always small.
- `paths` — `ScanPathsDto`: `{ outputMode, root, totalNodes, nodes }` where
  each node is `{ path, type, hasIntentMd, hasDetailMd }`.
- **Size guard (every mode)**: when the serialized payload exceeds
  `SCAN_RESULT_MAX_CHARS`, the full payload is written to
  `{cacheDir(path)}/scan-report.json` (line-structured JSON, Read/grep
  friendly) and the response degrades to
  `{ outputMode, truncated: true, reportPath, summary: ScanSummaryDto }`.

```ts
interface ScanReportDto {
  tree: {
    root: string;
    depth: number;
    totalNodes: number;
    nodes: FractalNode[]; // flat array — NOT a Map
  };
  modules: ModuleInfo[]; // empty unless includeModuleInfo: true
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
