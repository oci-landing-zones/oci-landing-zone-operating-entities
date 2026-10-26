import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform, newSharedPlatform } from './platforms';
import { validatePlatformContracts } from './platformValidation';

describe('validatePlatformContracts', () => {
  it('rejects unsupported types in runtime records instead of treating them as Custom', () => {
    const model = emptyLzModel();
    model.platforms = [{ ...newPlatform('custom', []), type: 'ocvs' } as unknown as typeof model.platforms[number]];
    model.sharedPlatforms = [{ ...newSharedPlatform('custom', []), type: 'ocvs' } as unknown as typeof model.sharedPlatforms[number]];
    expect(validatePlatformContracts(model)).toEqual(expect.arrayContaining([
      'Unsupported platform type: ocvs.', 'Unsupported shared platform type: ocvs.',
    ]));
  });
  it.each(['hub', 'environment', 'shared', 'platform'])('rejects a %s subnet outside its VCN before generation', (scope) => {
    const model = emptyLzModel();
    const subnet = { name: 'outside', cidr: '192.168.50.0/24' };
    if (scope === 'hub') model.network.subnets[0] = subnet;
    if (scope === 'environment') model.environments[0].network.subnets[0] = subnet;
    if (scope === 'shared') model.sharedPlatforms = [{ ...newSharedPlatform('custom', []), subnets: [subnet] }];
    if (scope === 'platform') model.platforms = [{ ...newPlatform('custom', []), subnets: [subnet], overrides: undefined }];
    expect(validatePlatformContracts(model).some((error) => error.includes('Outside the VCN'))).toBe(true);
  });
  it('accepts the same platform and project keys in disjoint environments', () => {
    const model = emptyLzModel();
    const first = newPlatform('custom', [], model.environments);
    model.platforms = [
      { ...first, environments: [model.environments[0].id] },
      { ...newPlatform('custom', [first], model.environments), key: first.key, environments: [model.environments[1].id] },
    ];
    model.projects = model.environments.map((env, index) => ({ id: `project-${index}`, name: 'app', environments: [env.id] }));
    expect(validatePlatformContracts(model)).toEqual([]);
    model.platforms[1].environments = 'all';
    expect(validatePlatformContracts(model)).toContain(`Duplicate environment platform config key: ${first.key}.`);
  });
  it('accepts independent environment and shared platform ranges', () => {
    const base = emptyLzModel();
    const shared = newSharedPlatform('custom', []);
    expect(validatePlatformContracts({
      ...base,
      platforms: [newPlatform('custom', [])],
      sharedPlatforms: [shared],
    })).toEqual([]);
  });

  it('rejects duplicate config keys and VCN overlap before generation', () => {
    const base = emptyLzModel();
    const first = newSharedPlatform('custom', []);
    const second = { ...newSharedPlatform('custom', [first]), key: first.key, vcnCidr: first.vcnCidr };
    const errors = validatePlatformContracts({ ...base, sharedPlatforms: [first, second] });
    expect(errors).toContain(`Duplicate shared platform config key: ${first.key}.`);
    expect(errors.some((error) => error.includes('overlaps'))).toBe(true);
  });

  it('rejects names that would collapse and broken stable references', () => {
    const base = emptyLzModel();
    const platform = { ...newPlatform('custom', []), environments: ['removed-environment'] };
    const errors = validatePlatformContracts({
      ...base,
      environments: [base.environments[0], { ...base.environments[1], name: ' PROD ' }],
      projects: [
        { id: 'project-1', name: 'app', environments: 'all' },
        { id: 'project-2', name: 'APP', environments: ['removed-environment'] },
      ],
      network: { ...base.network, subnets: [...base.network.subnets, { name: 'LB', cidr: '10.0.6.0/24' }] },
      platforms: [platform],
    });
    expect(errors).toEqual(expect.arrayContaining([
      'Duplicate environment config key: PROD.',
      'Duplicate project config key: APP.',
      'Duplicate hub subnet config key: LB.',
      'Project APP references a removed environment.',
      'Platform cus references a removed environment.',
    ]));
  });

  it('rejects environment platform keys that exceed the firewall naming limit', () => {
    const base = emptyLzModel();
    const platform = { ...newPlatform('custom', []), key: 'long' };
    expect(validatePlatformContracts({ ...base, platforms: [platform] })).toContain(
      'Environment platform long config key must be 3 characters or less for OCI Network Firewall names.',
    );
  });
});
