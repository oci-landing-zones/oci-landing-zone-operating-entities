import { describe, expect, it } from 'vitest';
import {
  PLATFORM_TYPES, newPlatform, okeDefaultSubnets, platformEnvInstances,
  platformSubnetsForEnv, platformVcnForEnv, platformTypeMeta,
} from './platforms';

const ENVS = [{ name: 'prod' }, { name: 'preprod' }, { name: 'dev' }];

describe('platform catalog', () => {
  it('marks only OKE Simple and Custom as deployable (MVP)', () => {
    const deployable = PLATFORM_TYPES.filter((t) => t.deployable).map((t) => t.type);
    expect(deployable).toEqual(['oke_simple', 'custom']);
    expect(platformTypeMeta('exacc').deployable).toBe(false);
  });
});

describe('newPlatform', () => {
  it('seeds an OKE platform with four locked default subnets + cluster params', () => {
    const p = newPlatform('oke_simple', []);
    expect(p).toMatchObject({ id: 'oke', type: 'oke_simple', environments: 'all', vcnCidr: '10.140.0.0/21' });
    expect(p.subnets.map((s) => s.name)).toEqual(['int-lb', 'control-plane', 'workers', 'pods']);
    expect(p.subnets.every((s) => s.locked)).toBe(true);
    expect(p.okeParams?.kubernetesVersion).toBe('v1.35.2');
  });

  it('seeds a Custom platform with no subnets, under a DNS-safe id', () => {
    const p = newPlatform('custom', []);
    // `cust`, not `custom`: a preprod platform gets 5 chars of the 15-char DNS label.
    expect(p).toMatchObject({ id: 'cust', type: 'custom', subnets: [] });
    expect(p.okeParams).toBeUndefined();
  });

  it('gives each new platform a non-overlapping base VCN + a unique id', () => {
    const a = newPlatform('oke_simple', []);
    const b = newPlatform('oke_simple', [a]);
    expect(a.vcnCidr).toBe('10.140.0.0/21');
    expect(b.vcnCidr).toBe('10.140.64.0/21'); // +16384 addresses (a /18 stride)
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

describe('per-environment derivation', () => {
  it('shifts the VCN by the env index, re-basing the subnets', () => {
    const p = newPlatform('oke_simple', []);
    expect(platformVcnForEnv(p, 'prod', 0)).toBe('10.140.0.0/21');
    expect(platformVcnForEnv(p, 'preprod', 1)).toBe('10.140.8.0/21');
    expect(platformVcnForEnv(p, 'dev', 2)).toBe('10.140.16.0/21');
    expect(platformSubnetsForEnv(p, 'preprod', 1)[0]).toMatchObject({ name: 'int-lb', cidr: '10.140.8.0/25' });
  });

  it('honours a per-env override over the derived value', () => {
    const p = { ...newPlatform('oke_simple', []), overrides: { preprod: { vcnCidr: '10.200.0.0/21' } } };
    expect(platformVcnForEnv(p, 'preprod', 1)).toBe('10.200.0.0/21');
    const inst = platformEnvInstances(p, ENVS).find((x) => x.name === 'preprod');
    expect(inst).toMatchObject({ vcnCidr: '10.200.0.0/21', overridden: true });
  });

  it('only yields instances for the environments the platform targets', () => {
    const p = { ...newPlatform('custom', []), environments: ['prod', 'dev'] };
    expect(platformEnvInstances(p, ENVS).map((x) => x.name)).toEqual(['prod', 'dev']);
  });
});
