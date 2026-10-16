import { describe, expect, it } from 'vitest';
import { emptyLzModel, envNetworkDefaults, normalizeModel } from '../model/defaults';
import { defaultExacsEnvCidr, exadataEntries } from './exadata';
import { oneOeEnvironmentCidrs } from './oneOeCidrs';
import { applyPlatformPatch, resetPlatformEnvironment, newPlatform, newSharedPlatform, platformEnvInstances } from './platforms';

describe('One-OE address reservations', () => {
  it.each([
    ['prod', '10.0.64.0/21', '10.0.88.0/21', '10.0.104.0/21'],
    ['preprod', '10.0.128.0/21', '10.0.152.0/21', '10.0.168.0/21'],
    ['dr', '10.0.200.0/21', '10.0.224.0/22', '10.0.240.0/22'],
    ['dev', '10.1.64.0/21', '10.1.88.0/21', '10.1.104.0/21'],
    ['uat', '10.1.128.0/21', '10.1.152.0/21', '10.1.168.0/21'],
  ])('uses the %s reservation regardless of insertion order', (name, projects, ocvs, exacs) => {
    const environment = { id: name, name, network: envNetworkDefaults(0, name) };
    expect(environment.network.vcnCidr).toBe(projects);
    expect(defaultExacsEnvCidr(0, name)).toBe(exacs);
    const platform = newPlatform('ocvs', [], [environment]);
    expect(platformEnvInstances(platform, [environment])[0].vcnCidr).toBe(ocvs);
  });

  it('allocates additional project networks only in the chosen /18 and stops at exhaustion', () => {
    const occupied: string[] = [];
    for (let i = 0; i < 8; i++) {
      const cidr = envNetworkDefaults(i + 2, `extra${i}`, occupied).vcnCidr;
      expect(cidr).toBe(`10.1.${192 + i * 8}.0/21`);
      occupied.push(cidr);
    }
    expect(envNetworkDefaults(10, 'extra8', occupied).vcnCidr).toBe('');
  });

  it('reserves shared ExaCS and allocates optional shared platforms separately', () => {
    expect(emptyLzModel().exadata.exacs.sharedVcnCidr).toBe('10.0.24.0/21');
    const a = newSharedPlatform('custom', []);
    const b = newSharedPlatform('ocvs', [a]);
    expect(a.vcnCidr).toBe('10.0.32.0/21');
    expect(b.vcnCidr).toBe('10.0.40.0/21');
  });

  it('exports ExaCS defaults for named and additional environments without overlaps', () => {
    const model = emptyLzModel();
    model.environments = ['uat', 'dev', 'sandbox', 'demo'].map((name, i) => ({
      id: name, name, securityZone: false,
      network: envNetworkDefaults(i, name, i === 3 ? ['10.1.192.0/21'] : []),
    }));
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc',
      database: 'per_environment', environments: model.environments.map((env) => env.id),
      notifications: { default: 'team@example.com' } };
    const entries = exadataEntries(model).environments;
    expect(entries.uat.exacs.network?.vcn).toBe('10.1.168.0/21');
    expect(entries.dev.exacs.network?.vcn).toBe('10.1.104.0/21');
    expect(entries.sandbox.exacs.network?.vcn).toBe('10.1.208.0/21');
    expect(entries.demo.exacs.network?.vcn).toBe('10.1.216.0/21');
  });

  it('keeps reservations for services not created by Studio', () => {
    expect(oneOeEnvironmentCidrs(' UAT ')?.ebs).toBe('10.1.136.0/21');
    expect(oneOeEnvironmentCidrs('dev')?.ai).toBe('10.1.96.0/21');
  });

  it('preserves previously implicit ExaCS CIDRs and explicit edits in saved designs', () => {
    const previous = emptyLzModel();
    previous.version = '0.19.0';
    previous.exadata.exacs = { ...previous.exadata.exacs, enabled: false,
      sharedVcnCidr: '10.172.0.0/21', database: 'per_environment',
      environments: ['environment-1', 'environment-2'],
      environmentVcnCidrs: { 'environment-2': '10.200.0.0/21' } };
    previous.environments[0].network.vcnCidr = '10.201.0.0/21';
    const migrated = normalizeModel(previous);
    expect(migrated.exadata.exacs.sharedVcnCidr).toBe('10.172.0.0/21');
    expect(migrated.exadata.exacs.environmentVcnCidrs).toEqual({
      'environment-1': '10.172.8.0/21', 'environment-2': '10.200.0.0/21',
    });
    expect(migrated.environments[0].network.vcnCidr).toBe('10.201.0.0/21');
  });

  it('does not repeat shared or optional platform ranges when their reservation is full', () => {
    expect(newSharedPlatform('custom', [], ['10.0.32.0/19']).vcnCidr).toBe('');
    const env = { id: 'dev', name: 'dev' };
    expect(newPlatform('custom', [], [env], ['10.1.112.0/20']).vcnCidr).toBe('');
  });

  it('treats inherited object property names as additional environments', () => {
    expect(envNetworkDefaults(0, 'constructor').vcnCidr).toBe('10.1.192.0/21');
    expect(newPlatform('ocvs', [], [{ id: 't', name: 'toString' }]).vcnCidr).toBe('10.1.192.0/21');
  });

  it('exports base-editor edits while retaining other named environment networks', () => {
    const envs = [{ id: 'dev', name: 'dev' }, { id: 'uat', name: 'uat' }];
    const platform = newPlatform('custom', [], envs);
    const updated = applyPlatformPatch(platform, {
      vcnCidr: '10.200.0.0/21', subnets: [{ name: 'core', cidr: '10.200.0.0/24' }],
    }, envs, []);
    const instances = platformEnvInstances(updated, envs);
    expect(instances[0]).toMatchObject({ vcnCidr: '10.200.0.0/21', subnets: [{ name: 'core', cidr: '10.200.0.0/24' }] });
    expect(instances[1].vcnCidr).toBe('10.1.176.0/21');
  });

  it('uses the named reservation when a restricted platform gains a newly added environment', () => {
    const envs = [{ id: 'p', name: 'prod' }, { id: 'dev', name: 'dev' }];
    const platform = { ...newPlatform('ocvs', [], [envs[0]]), environments: ['p'] };
    const updated = applyPlatformPatch(platform, { environments: ['p', 'dev'] }, envs, []);
    expect(platformEnvInstances(updated, envs)[1].vcnCidr).toBe('10.1.88.0/21');
  });

  it('resets an additional platform without taking its project network', () => {
    const envs = [{ id: 's', name: 'sandbox' }];
    const platform = newPlatform('custom', [], envs, ['10.1.192.0/21']);
    const reset = resetPlatformEnvironment(platform, 's', envs, ['10.1.192.0/21', '10.1.200.0/21']);
    expect(platformEnvInstances(reset, envs)[0].vcnCidr).toBe('10.1.200.0/21');
  });

  it('resets OCVS without taking an occupied OKE reservation', () => {
    const envs = [{ id: 'p', name: 'prod' }];
    const platform = newPlatform('ocvs', [], envs, ['10.0.80.0/20']);
    const reset = resetPlatformEnvironment(platform, 'p', envs, ['10.0.80.0/20', platform.vcnCidr]);
    expect(platformEnvInstances(reset, envs)[0].vcnCidr).toBe('10.0.112.0/21');
  });

  it('keeps OKE allocation unchanged', () => {
    const p = newPlatform('oke_simple', [], [{ id: 'uat', name: 'uat' }]);
    expect(p.vcnCidr).toBe('10.0.80.0/20');
    expect(p.overrides).toBeUndefined();
  });
});
