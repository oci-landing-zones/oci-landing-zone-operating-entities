import { describe, expect, it } from 'vitest';
import { emptyLzModel, normalizeModel } from '../model/defaults';
import { getRegionsForRealm, isSupportedRealm, REALM_OPTIONS, regionShortNameError } from './regions';

describe('region short names', () => {
  it.each(['', ' ', 'fra', 'fr2', 'FRA', 'a-b', ' a ', 'é!?'])('accepts any value up to three characters: %j', (value) => {
    expect(regionShortNameError(value)).toBeNull();
  });

  it.each(['abcd', ' fra', 'fra ', 'custom'])('rejects values over three characters: %j', (value) => {
    expect(regionShortNameError(value)).toBe('Use 3 characters or fewer for the region short name.');
  });
});

describe('generator-supported realms', () => {
  it('offers only the realms defined by gen/constants.libsonnet', () => {
    expect(REALM_OPTIONS.map(({ id }) => id)).toEqual(['oc1', 'oc19']);
    expect(isSupportedRealm('oc1')).toBe(true);
    expect(isSupportedRealm('oc19')).toBe(true);
    expect(isSupportedRealm('oc2')).toBe(false);
    expect(getRegionsForRealm('oc2')).toEqual([]);
  });

  it('does not rewrite a current-version record', () => {
    const stored = {
      ...emptyLzModel(),
      foundation: { realm: 'oc19', region: 'eu-frankfurt-2', regionShortName: 'fr2', cisLevel: 2 },
    };
    expect(normalizeModel(stored).foundation).toEqual(stored.foundation);
  });

  it('resets a record from any older version', () => {
    expect(normalizeModel({ ...emptyLzModel(), version: '0.15.0' })).toEqual(emptyLzModel());
  });
});
