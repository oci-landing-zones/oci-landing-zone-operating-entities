import { describe, expect, it } from 'vitest';
import { newPlatform } from './platforms';
import { validateOkeModel, validateOkePlatform } from './okeValidation';
import { emptyLzModel } from '../model/defaults';

describe('validateOkePlatform', () => {
  it('accepts the current generator-owned small profile defaults', () => {
    expect(validateOkePlatform(newPlatform('oke_simple', []))).toEqual([]);
  });

  it('requires an overlay pod CIDR and rejects overlap with services', () => {
    const base = newPlatform('oke_simple', []);
    const overlay = { ...base, subnets: base.subnets.filter((sn) => sn.name !== 'pods'), okeParams: { ...base.okeParams!, cniType: 'overlay' as const, podsCidr: undefined } };
    expect(validateOkePlatform(overlay)).toContain('Overlay OKE networking requires a pod CIDR.');
    expect(validateOkePlatform({ ...overlay, okeParams: { ...overlay.okeParams, podsCidr: '10.96.0.0/16' } })).toContain('OKE pod CIDR must not overlap the service CIDR.');
  });

  it('requires the exact VCN prefix for generator-owned profiles', () => {
    const base = newPlatform('oke_simple', []);
    const profile = { ...base, subnets: [], vcnCidr: '10.140.0.0/20', okeParams: { ...base.okeParams!, clusterSize: 'small' as const } };
    expect(validateOkePlatform(profile)).toEqual([]);
    expect(validateOkePlatform({ ...profile, vcnCidr: '10.140.0.0/21' })).toContain('OKE small profile requires a /20 platform VCN.');
  });

  it('rejects Kubernetes-internal CIDRs that overlap another configured OCI VCN', () => {
    const base = emptyLzModel();
    const oke = newPlatform('oke_simple', []);
    const model = { ...base, platforms: [{ ...oke, okeParams: { ...oke.okeParams!, servicesCidr: '10.0.64.0/24' } }] };
    expect(validateOkeModel(model)).toContain('OKE service CIDR must not overlap another configured OCI VCN.');
  });

  it('validates profile VCNs only where the platform is actually placed', () => {
    const base = emptyLzModel();
    const oke = newPlatform('oke_simple', []);
    const model = {
      ...base,
      platforms: [{ ...oke, environments: ['environment-1'], overrides: { 'environment-2': { vcnCidr: '10.140.16.0/21' } } }],
    };
    expect(validateOkeModel(model)).toEqual([]);
  });
});
