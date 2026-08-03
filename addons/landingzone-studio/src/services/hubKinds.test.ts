import { describe, expect, it } from 'vitest';
import { HUB_KINDS, hubKindDefaults } from './hubKinds';
import { emptyLzModel, normalizeModel } from '../model/defaults';

describe('hub generator contracts', () => {
  it('supports A/B/C/E with config keys rather than display-name templates', () => {
    expect(HUB_KINDS.map((kind) => kind.id)).toEqual(['hub_a', 'hub_b', 'hub_c', 'hub_e']);
    expect(hubKindDefaults('hub_a').subnets.map((subnet) => subnet.name)).toEqual(['fw-dmz', 'lb', 'fw-int', 'mgmt', 'mon', 'dns']);
    expect(hubKindDefaults('hub_b').subnets.map((subnet) => subnet.name)).toEqual(['lb', 'fw', 'mgmt', 'mon', 'dns']);
    expect(hubKindDefaults('hub_c').subnets.map((subnet) => subnet.name)).toEqual(['untrust', 'trust', 'lb', 'mgmt', 'mon', 'dns']);
    expect(hubKindDefaults('hub_e').subnets.map((subnet) => subnet.name)).toEqual(['lb', 'mgmt', 'mon', 'dns']);
  });

  it('starts with no shared platform and no presentation-only state', () => {
    const model = emptyLzModel();
    expect(model.sharedPlatforms).toEqual([]);
    expect(model.version).toBe('0.17.0');
    expect(model.network).toEqual({ hubKind: 'hub_a', ...hubKindDefaults('hub_a') });
    expect('presentation' in model).toBe(false);
    expect('routing' in model.network).toBe(false);
  });
});

describe('saved model versioning', () => {
  it('accepts the current contract unchanged', () => {
    const current = emptyLzModel();
    expect(normalizeModel(current)).toBe(current);
  });

  it('resets older, partial, or malformed records to the latest model', () => {
    expect(normalizeModel({ version: '0.14.0' })).toEqual(emptyLzModel());
    expect(normalizeModel({ version: '0.15.0' })).toEqual(emptyLzModel());
    expect(normalizeModel({ version: '0.16.0' })).toEqual(emptyLzModel());
    expect(normalizeModel(null)).toEqual(emptyLzModel());
  });

  it('migrates valid 0.16 name-based relationships to stable environment ids', () => {
    const current = emptyLzModel();
    const legacy = {
      ...current,
      version: '0.16.0',
      environments: current.environments.map(({ id: _id, ...environment }) => environment),
      projects: [{ name: 'app', environments: ['prod'] }],
      platforms: [{
        id: 'cust', key: 'cust', type: 'custom', environments: ['prod'],
        vcnCidr: '10.0.80.0/21', subnets: [{ name: 'core', cidr: '10.0.80.0/24' }],
        overrides: { prod: { vcnCidr: '10.200.0.0/21' } },
      }],
    };
    const migrated = normalizeModel(legacy);
    const prodId = migrated.environments[0].id;
    expect(migrated.version).toBe('0.17.0');
    expect(migrated.projects[0]).toMatchObject({ id: 'project-1', environments: [prodId] });
    expect(migrated.platforms[0].environments).toEqual([prodId]);
    expect(migrated.platforms[0].overrides).toEqual({ [prodId]: { vcnCidr: '10.200.0.0/21' } });
  });
});
