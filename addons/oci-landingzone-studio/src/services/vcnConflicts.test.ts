import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform, platformEnvInstances } from './platforms';
import { vcnConflicts } from './vcnConflicts';

describe('inline VCN overlap feedback', () => {
  it('identifies both fields in a conflict and clears them when corrected', () => {
    const model = emptyLzModel();
    model.environments[0].network.vcnCidr = model.network.hubVcnCidr;
    const errors = vcnConflicts(model);
    expect(errors.hub[0]).toContain('prod Projects');
    expect(errors[`environment:${model.environments[0].id}`][0]).toContain('Hub');
    model.environments[0].projectNetworkEnabled = false;
    expect(vcnConflicts(model)).toEqual({});
  });

  it('checks actual platform overrides and ignores unused template ranges', () => {
    const model = emptyLzModel();
    const platform = newPlatform('custom', [], model.environments);
    model.platforms = [platform];
    const env = model.environments[1];
    platform.overrides = { [env.id]: { vcnCidr: model.network.hubVcnCidr } };
    const errors = vcnConflicts(model);
    const instances = platformEnvInstances(platform, model.environments);
    expect(instances[1].vcnCidr).toBe(model.network.hubVcnCidr);
    expect(errors[`platform:${platform.id}:${env.id}`][0]).toContain('Hub');
    platform.vcnCidr = model.network.hubVcnCidr;
    platform.overrides = Object.fromEntries(model.environments.map((environment, index) => [environment.id, { vcnCidr: `10.${100 + index}.0.0/21` }]));
    expect(vcnConflicts(model)).toEqual({});
  });
});
