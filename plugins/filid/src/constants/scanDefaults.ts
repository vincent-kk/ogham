import type { ScanOptions } from '../types/scan.js';

export const DEFAULT_SCAN_OPTIONS: Required<ScanOptions> = {
  include: ['**'],
  exclude: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/docs/**',
    '**/scripts/**',
    '**/.filid/**',
    '**/.claude/**',
    '**/.omc/**',
    '**/.metadata/**',
    '**/next/**',
    '**/bridge/**',
  ],
  maxDepth: 10,
  followSymlinks: false,
};

export const SCAN_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.omc',
  '.claude',
]);

export const SKIP_PATTERNS = [
  /\.d\.ts$/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.bench\.ts$/,
];

/**
 * Serialized fractal_scan payload budget. Larger results are written to
 * `{cacheDir}/scan-report.json` and replaced by a path + summary envelope —
 * a 400KB single-line JSON blows the MCP tool-result cap and never reaches
 * the model anyway.
 */
export const SCAN_RESULT_MAX_CHARS = 30_000;
