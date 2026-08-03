import { describe, expect, it } from 'vitest';
import {
  PLATFORM_TYPES, newPlatform, newSharedPlatform, ocvsDefaultSubnets, okeDefaultSubnets, okeProfileSubnets, platformEnvInstances,
  platformSubnetsForEnv, platformVcnForEnv,
} from './platforms';

const ENVS = [{ id: 'prod', name: 'prod' }, { id: 'preprod', name: 'preprod' }, { id: 'dev', name: 'dev' }];

describe('platform catalog', () => {
  it('exposes only the currently supported generator extensions', () => {
    const deployable = PLATFORM_TYPES.filter((t) => t.deployable).map((t) => t.type);
    expect(deployable).toEqual(['oke_simple', 'ocvs', 'custom']);
    expect(PLATFORM_TYPES.map((t) => t.type)).not.toContain('exacc');
    expect(PLATFORM_TYPES.map((t) => t.type)).not.toContain('exacs');
  });
});

describe('newPlatform', () => {
  it('seeds an OKE platform with the generator-owned small profile', () => {
    const p = newPlatform('oke_simple', []);
    expect(p).toMatchObject({ id: 'oke', key: 'oke', type: 'oke_simple', environments: 'all', vcnCidr: '10.0.80.0/20' });
    expect(p.subnets).toEqual([]);
    expect(p.okeParams?.clusterSize).toBe('small');
    expect(p.okeParams?.kubernetesVersion).toBe('v1.35.2');
    expect(p.okeParams?.workerImage).toBe('9\\.[0-9]+');
  });

  it('seeds a Custom network-only platform with a required subnet and DNS-safe id', () => {
    const p = newPlatform('custom', []);
    // `cust`, not `custom`: a preprod platform gets 5 chars of the 15-char DNS label.
    expect(p).toMatchObject({
      id: 'cust',
      type: 'custom',
      subnets: [{ name: 'core', cidr: '10.0.80.0/24' }],
    });
    expect(p.okeParams).toBeUndefined();
  });

  it('seeds OCVS with generator-owned provisioning networking and an incomplete credential field', () => {
    const p = newPlatform('ocvs', []);
    expect(p).toMatchObject({ id: 'ocvs', type: 'ocvs', subnets: [] });
    expect(p.ocvsParams?.sshAuthorizedKeys).toBe('');
  });

  it('gives each new platform a non-overlapping base VCN + a unique id', () => {
    const a = newPlatform('oke_simple', []);
    const b = newPlatform('oke_simple', [a]);
    expect(a.vcnCidr).toBe('10.0.80.0/20');
    expect(b.vcnCidr).toBe('10.0.144.0/20'); // +16384 addresses (a /18 stride)
    expect(b.id).toBe('oke-2');
  });
});

describe('okeDefaultSubnets', () => {
  it('matches the OKE reference layout inside the base VCN', () => {
    expect(okeDefaultSubnets('10.140.0.0/21')).toEqual([
      { name: 'int-lb', cidr: '10.140.0.0/25', locked: true },
      { name: 'control-plane', cidr: '10.140.0.128/25', locked: true },
      { name: 'workers', cidr: '10.140.2.0/23', locked: true },
      { name: 'pods', cidr: '10.140.4.0/23', locked: true },
    ]);
  });
});

describe('newSharedPlatform', () => {
  it('allocates repeatable Custom and OCVS platforms from the first free /21', () => {
    const custom = newSharedPlatform('custom', [], ['10.170.0.0/21']);
    const ocvs = newSharedPlatform('ocvs', [custom], ['10.170.0.0/21']);
    const nextCustom = newSharedPlatform('custom', [custom, ocvs], ['10.170.0.0/21']);

    expect(custom).toMatchObject({ id: 'shared-core', key: 'core', type: 'custom', vcnCidr: '10.170.8.0/21' });
    expect(custom.subnets).toEqual([{ name: 'core', cidr: '10.170.8.0/24' }]);
    expect(ocvs).toMatchObject({ id: 'shared-ocv', key: 'ocv', type: 'ocvs', vcnCidr: '10.170.16.0/21', subnets: [] });
    expect(nextCustom).toMatchObject({ id: 'shared-cor2', key: 'cor2', vcnCidr: '10.170.24.0/21' });
  });
});

describe('okeProfileSubnets', () => {
  it('derives the generator-owned size/CNI/FSS layouts for diagram preview', () => {
    expect(okeProfileSubnets('10.140.0.0/20', 'small', 'native', false).map((sn) => [sn.name, sn.cidr])).toEqual([
      ['pods', '10.140.0.0/21'], ['workers', '10.140.8.0/23'], ['int-lb', '10.140.10.0/26'], ['control-plane', '10.140.10.64/29'],
    ]);
    expect(okeProfileSubnets('10.140.0.0/20', 'small', 'overlay', true).map((sn) => sn.name)).toEqual(['workers', 'int-lb', 'fss', 'control-plane']);
    expect(okeProfileSubnets('10.140.0.0/21', 'small', 'native', false)).toEqual([]);
  });
});

describe('ocvsDefaultSubnets', () => {
  it('derives the provisioning subnet at VCN prefix + 4', () => {
    expect(ocvsDefaultSubnets('10.140.0.0/21')).toEqual([{ name: 'provisioning', cidr: '10.140.0.0/25', locked: true }]);
    expect(ocvsDefaultSubnets('10.140.0.0/24')).toEqual([{ name: 'provisioning', cidr: '10.140.0.0/28', locked: true }]);
    expect(ocvsDefaultSubnets('10.140.0.0/20')).toEqual([]);
  });
});

describe('per-environment derivation', () => {
  it('shifts the VCN by the env index, re-basing the subnets', () => {
    const p = newPlatform('oke_simple', []);
    expect(platformVcnForEnv(p, 'prod', 0)).toBe('10.0.80.0/20');
    expect(platformVcnForEnv(p, 'preprod', 1)).toBe('10.0.96.0/20');
    expect(platformVcnForEnv(p, 'dev', 2)).toBe('10.0.112.0/20');
    expect(platformSubnetsForEnv(p, 'preprod', 1)[0]).toMatchObject({ name: 'pods', cidr: '10.0.96.0/21' });
  });

  it('honours a per-env override over the derived value', () => {
    const p = { ...newPlatform('oke_simple', []), overrides: { preprod: { vcnCidr: '10.200.0.0/20' } } };
    expect(platformVcnForEnv(p, 'preprod', 1)).toBe('10.200.0.0/20');
    const inst = platformEnvInstances(p, ENVS).find((x) => x.name === 'preprod');
    expect(inst).toMatchObject({ vcnCidr: '10.200.0.0/20', overridden: true });
  });

  it('keeps profile-owned OKE subnet previews independent of stale manual overrides', () => {
    const p = {
      ...newPlatform('oke_simple', []),
      overrides: { preprod: { subnets: [{ name: 'wrong', cidr: '10.140.16.0/24' }] } },
    };
    expect(platformSubnetsForEnv(p, 'preprod', 1)[0]).toMatchObject({ name: 'pods', cidr: '10.0.96.0/21' });
  });

  it('only yields instances for the environments the platform targets', () => {
    const p = { ...newPlatform('custom', []), environments: ['prod', 'dev'] };
    expect(platformEnvInstances(p, ENVS).map((x) => x.name)).toEqual(['prod', 'dev']);
  });

  it('derives the OCVS provisioning subnet for each environment VCN', () => {
    const p = newPlatform('ocvs', []);
    expect(platformSubnetsForEnv(p, 'preprod', 1)).toEqual([{ name: 'provisioning', cidr: '10.0.88.0/25', locked: true }]);
  });
});
