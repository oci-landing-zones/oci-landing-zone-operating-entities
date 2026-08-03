import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform, ocvsDefaultParams } from './platforms';
import { validateOcvsModel, validateOcvsPlatform, validateSharedOcvsPlatform } from './ocvsValidation';

describe('OCVS validation', () => {
  it('accepts the current generator-owned /21 OCVS networking once an SSH key is supplied', () => {
    const base = newPlatform('ocvs', []);
    const ocvs = { ...base, ocvsParams: { ...base.ocvsParams!, sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' } };
    expect(validateOcvsPlatform(ocvs)).toEqual([]);
  });

  it('rejects unsupported prefixes, manual provisioning maps, and missing required settings', () => {
    const base = newPlatform('ocvs', []);
    const issues = validateOcvsPlatform({
      ...base,
      vcnCidr: '10.140.0.0/20',
      subnets: [{ name: 'provisioning', cidr: '10.140.0.0/24' }],
      ocvsParams: { ...base.ocvsParams!, sshAuthorizedKeys: '', sddcDisplayName: 'bad_name', clusterDisplayName: 'cluster--name' },
    });
    expect(issues).toEqual(expect.arrayContaining([
      'OCVS platform VCN must use one of: /21, /22, /23, /24.',
      'The OCVS provisioning subnet is managed by Blueprint Factory; remove manual OCVS subnets.',
      'OCVS requires a non-empty SSH public key.',
      'OCVS SDDC name must start with a letter and use only letters, numbers, and single hyphens.',
      'OCVS cluster name must start with a letter and use only letters, numbers, and single hyphens.',
    ]));
  });

  it('checks each actual placement and the supported shared placement for VCN overlap', () => {
    const base = emptyLzModel();
    const ocvs = newPlatform('ocvs', []);
    const model = {
      ...base,
      platforms: [{ ...ocvs, environments: ['environment-1'], vcnCidr: '10.0.64.0/21', ocvsParams: { ...ocvs.ocvsParams!, sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' } }],
      sharedPlatforms: [{ id: 'shared-ocv', key: 'ocv', type: 'ocvs' as const, vcnCidr: '10.170.0.0/21', subnets: [], ocvsParams: { ...ocvsDefaultParams(), sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' } }],
    };
    expect(validateOcvsModel(model)).toContain('OCVS platform VCN must not overlap another configured OCI VCN.');
    expect(validateSharedOcvsPlatform(model.sharedPlatforms[0])).toEqual([]);
  });
});
