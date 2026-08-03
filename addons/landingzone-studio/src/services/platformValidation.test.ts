import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform, newSharedPlatform } from './platforms';
import { validatePlatformContracts } from './platformValidation';

describe('validatePlatformContracts', () => {
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
      'Platform cust references a removed environment.',
    ]));
  });
});
