import { describe, expect, it } from 'vitest';
import {
  PLATFORM_TYPES, applyPlatformPatch, newPlatform, newSharedPlatform, okeDefaultSubnets, okeNetworkProfilePatch,
  okeProfileSubnets, placementsOverlap, platformEnvInstances, platformSubnetsForEnv, platformVcnForEnv,
} from './platforms';
import { validateOkePlatform } from './okeValidation';

const ENVS = [{ id: 'prod', name: 'prod' }, { id: 'preprod', name: 'preprod' }, { id: 'dev', name: 'dev' }];

describe('platform catalog', () => {
  it('exposes only the currently supported generator extensions', () => {
    const deployable = PLATFORM_TYPES.filter((t) => t.deployable).map((t) => t.type);
    expect(deployable).toEqual(['oke_simple', 'custom']);
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
    // `cus`, not `custom`: the generated firewall address-list name is capped at 28 characters.
    expect(p).toMatchObject({
      id: 'cus',
      type: 'custom',
      subnets: [{ name: 'core', cidr: '10.0.112.0/24' }],
    });
    expect(p.okeParams).toBeUndefined();
  });

  it('gives each new platform a non-overlapping base VCN + a unique id', () => {
    const a = newPlatform('oke_simple', []);
    const b = newPlatform('oke_simple', [a]);
    expect(a.vcnCidr).toBe('10.0.80.0/20');
    expect(b.vcnCidr).toBe('10.0.144.0/20'); // +16384 addresses (a /18 stride)
    expect(b.id).toBe('ok2');
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
  it('allocates repeatable Custom platforms from the first free /21', () => {
    const custom = newSharedPlatform('custom', [], ['10.0.32.0/21']);
    const second = newSharedPlatform('custom', [custom], ['10.0.32.0/21']);
    const nextCustom = newSharedPlatform('custom', [custom, second], ['10.0.32.0/21']);

    expect(custom).toMatchObject({ id: 'shared-core', key: 'core', type: 'custom', vcnCidr: '10.0.40.0/21' });
    expect(custom.subnets).toEqual([{ name: 'core', cidr: '10.0.40.0/24' }]);
    expect(second).toMatchObject({ id: 'shared-cor2', key: 'cor2', type: 'custom', vcnCidr: '10.0.48.0/21', subnets: [{ name: 'core', cidr: '10.0.48.0/24' }] });
    expect(nextCustom).toMatchObject({ id: 'shared-cor3', key: 'cor3', vcnCidr: '10.0.56.0/21' });
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

describe('OKE profile to manual subnets', () => {
  const cases = (['small', 'medium', 'large'] as const).flatMap((size) =>
    (['native', 'overlay'] as const).flatMap((cniType) => [false, true].map((createFss) => ({ size, cniType, createFss }))));
  it.each(cases)('preserves $size / $cniType / FSS=$createFss networks and environment overrides', ({ size, cniType, createFss }) => {
    const created = newPlatform('oke_simple', []);
    const profile = { ...created, ...okeNetworkProfilePatch(created, size) };
    profile.okeParams = { ...profile.okeParams!, cniType, createFss, ...(cniType === 'overlay' ? { podsCidr: '10.244.0.0/16' } : {}) };
    const prefix = profile.vcnCidr.split('/')[1];
    profile.overrides = {
      prod: { vcnCidr: `10.140.0.0/${prefix}`, subnets: [{ name: 'stale', cidr: '10.140.0.0/24' }] },
      preprod: { vcnCidr: `10.141.0.0/${prefix}` },
      dev: { subnets: [{ name: 'stale', cidr: '10.142.0.0/24' }] },
    };
    const environments = [...ENVS, { id: 'uat', name: 'uat' }];
    const before = platformEnvInstances(profile, environments);
    const manual = applyPlatformPatch(profile, okeNetworkProfilePatch(profile, undefined), environments, []);
    expect(manual.okeParams?.clusterSize).toBeUndefined();
    expect(manual.subnets).toEqual(okeProfileSubnets(profile.vcnCidr, size, cniType, createFss));
    expect(platformEnvInstances(manual, environments)).toEqual(before);
    expect(validateOkePlatform(manual)).toEqual([]);
    expect(manual.subnets.some((subnet) => subnet.name === 'fss')).toBe(createFss);
  });
});

describe('environment placement overlap', () => {
  it.each([
    ['all', ['prod'], true], [['prod'], 'all', true],
    [['prod'], ['prod', 'dev'], true], [['prod'], ['dev'], false],
  ] as const)('compares %j and %j', (left, right, expected) => {
    expect(placementsOverlap(left === 'all' ? left : [...left], right === 'all' ? right : [...right])).toBe(expected);
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
});
