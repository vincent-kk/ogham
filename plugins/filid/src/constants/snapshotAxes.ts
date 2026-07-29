import type { SnapshotAxisSelection } from '../types/fractal.js';

/** Every evidence axis collected — the default for an unnarrowed snapshot. */
export const ALL_SNAPSHOT_AXES: SnapshotAxisSelection = {
  entrySurfaces: true,
  dependencies: true,
  verification: true,
};

/** Only tree and document evidence — what owner-chain resolution needs. */
export const DOCUMENT_ONLY_SNAPSHOT_AXES: SnapshotAxisSelection = {
  entrySurfaces: false,
  dependencies: false,
  verification: false,
};
