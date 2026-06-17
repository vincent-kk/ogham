import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergeArtifacts } from '../mergeArtifacts.js';

const defaults = DEFAULT_CONFIG.artifacts;

describe('mergeArtifacts', () => {
  it('returns default artifacts when raw is undefined', () => {
    expect(mergeArtifacts(undefined)).toEqual(defaults);
  });

  it('preserves valid {enabled: true, location: "user"}', () => {
    expect(mergeArtifacts({ enabled: true, location: 'user' })).toEqual({
      enabled: true,
      location: 'user',
    });
  });

  it('preserves valid {enabled: false, location: "project"}', () => {
    expect(mergeArtifacts({ enabled: false, location: 'project' })).toEqual({
      enabled: false,
      location: 'project',
    });
  });

  it('returns defaults when raw is null', () => {
    expect(mergeArtifacts(null)).toEqual(defaults);
  });

  it('returns defaults when raw is a string', () => {
    expect(mergeArtifacts('artifacts')).toEqual(defaults);
  });

  it('returns defaults when raw is a number', () => {
    expect(mergeArtifacts(42)).toEqual(defaults);
  });

  it('returns defaults when raw is an array', () => {
    expect(mergeArtifacts([])).toEqual(defaults);
  });

  it('falls back to default location when location is an invalid string', () => {
    const result = mergeArtifacts({ enabled: true, location: 'global' });
    expect(result.location).toBe(defaults.location);
    expect(result.enabled).toBe(true);
  });

  it('falls back to default location when location is missing', () => {
    const result = mergeArtifacts({ enabled: true });
    expect(result.location).toBe(defaults.location);
    expect(result.enabled).toBe(true);
  });

  it('falls back to default enabled when enabled is missing', () => {
    const result = mergeArtifacts({ location: 'user' });
    expect(result.enabled).toBe(defaults.enabled);
    expect(result.location).toBe('user');
  });

  it('falls back to default enabled when enabled is a non-boolean truthy value', () => {
    const result = mergeArtifacts({ enabled: 1, location: 'user' });
    expect(result.enabled).toBe(defaults.enabled);
  });

  it('falls back to default enabled when enabled is null', () => {
    const result = mergeArtifacts({ enabled: null, location: 'project' });
    expect(result.enabled).toBe(defaults.enabled);
  });

  it('returns a new object each call (pure, no shared reference)', () => {
    const a = mergeArtifacts(undefined);
    const b = mergeArtifacts(undefined);
    expect(a).not.toBe(b);
  });

  it('does not mutate DEFAULT_CONFIG.artifacts', () => {
    const before = { ...DEFAULT_CONFIG.artifacts };
    mergeArtifacts({ enabled: true, location: 'user' });
    expect(DEFAULT_CONFIG.artifacts).toEqual(before);
  });
});
