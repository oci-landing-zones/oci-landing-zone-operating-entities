import { describe, expect, it } from 'vitest';
import { HUB_KINDS, getHubKind, hubKindDefaults, resolveHubName } from './hubKinds';
import { emptyLzModel, normalizeModel } from '../model/defaults';

describe('hubKinds', () => {
  it('offers hub_a through hub_e; only hub_a is implemented so far', () => {
    expect(HUB_KINDS.map((k) => k.id)).toEqual(['hub_a', 'hub_b', 'hub_c', 'hub_d', 'hub_e']);
    expect(HUB_KINDS.filter((k) => k.implemented).map((k) => k.id)).toEqual(['hub_a']);
  });

  it('hub_a has the six default subnets', () => {
    const a = getHubKind('hub_a');
    expect(a?.defaultSubnets.map((sn) => sn.name)).toEqual([
      'sn-<region>-<lze>-hub-fw-dmz',
      'sn-<region>-<lze>-hub-lb',
      'sn-<region>-<lze>-hub-fw-int',
      'sn-<region>-<lze>-hub-mgmt',
      'sn-<region>-<lze>-hub-mon',
      'sn-<region>-<lze>-hub-dns',
    ]);
  });

  it('hubKindDefaults returns the default VCN name, CIDR + subnets', () => {
    const { hubVcnName, hubVcnCidr, subnets } = hubKindDefaults('hub_a');
    expect(hubVcnName).toBe('vcn-<region>-<lze>-hub');
    expect(hubVcnCidr).toBe('10.0.0.0/21');
    expect(subnets).toHaveLength(6);
    expect(subnets[0]).toEqual({ name: 'sn-<region>-<lze>-hub-fw-dmz', cidr: '10.0.0.0/24' });
  });
});

describe('resolveHubName', () => {
  it('substitutes <region> and <lze> tokens', () => {
    expect(resolveHubName('vcn-<region>-<lze>-hub', { region: 'fra', lze: 'acme' })).toBe('vcn-fra-acme-hub');
  });

  it('leaves a token literal while its value is empty', () => {
    expect(resolveHubName('sn-<region>-<lze>-hub-dns', { region: 'fra', lze: '' })).toBe('sn-fra-<lze>-hub-dns');
  });

  it('passes through names without tokens unchanged', () => {
    expect(resolveHubName('my-custom-subnet', { region: 'fra', lze: 'acme' })).toBe('my-custom-subnet');
  });
});

describe('network defaults + migration', () => {
  it('a new model defaults to hub_a with its subnets', () => {
    const net = emptyLzModel().network;
    expect(net.hubKind).toBe('hub_a');
    expect(net.hubVcnName).toBe('vcn-<region>-<lze>-hub');
    expect(net.subnets).toHaveLength(6);
  });

  it('normalizeModel migrates a legacy { hubVcn } network to hub_a defaults', () => {
    const legacy = { network: { hubVcn: { name: '', cidr: '10.0.0.0/16' } } };
    const net = normalizeModel(legacy).network;
    expect(net.hubKind).toBe('hub_a');
    expect(net.hubVcnName).toBe('vcn-<region>-<lze>-hub');
    expect(net.subnets).toHaveLength(6);
    expect('hubVcn' in net).toBe(false);
  });

  it('normalizeModel upgrades an untouched legacy default subnet set to the current defaults', () => {
    const stored = {
      network: {
        hubKind: 'hub_a',
        hubVcnCidr: '10.0.0.0/21',
        subnets: [
          { name: 'fw-dmz', cidr: '10.0.0.0/24' },
          { name: 'web', cidr: '10.0.1.0/24' },
          { name: 'fw-int', cidr: '10.0.2.0/24' },
          { name: 'mgmt', cidr: '10.0.3.0/24' },
        ],
      },
    };
    const net = normalizeModel(stored).network;
    expect(net.subnets.map((sn) => sn.name)).toEqual(
      hubKindDefaults('hub_a').subnets.map((sn) => sn.name),
    );
  });

  it('normalizeModel keeps user-customized subnets as-is', () => {
    const stored = {
      network: {
        hubKind: 'hub_a',
        hubVcnName: 'vcn-<region>-<lze>-hub',
        hubVcnCidr: '10.0.0.0/21',
        subnets: [{ name: 'my-subnet', cidr: '10.0.7.0/24' }],
      },
    };
    expect(normalizeModel(stored).network.subnets).toEqual([{ name: 'my-subnet', cidr: '10.0.7.0/24' }]);
  });

  it('normalizeModel seeds environment networks on legacy records (<= 0.6.0)', () => {
    const stored = {
      environments: [
        { name: 'prod', securityZone: true },
        { name: 'dev', securityZone: false },
      ],
    };
    const envs = normalizeModel(stored).environments;
    expect(envs[0].network.vcnCidr).toBe('10.0.8.0/21');
    expect(envs[1].network.vcnCidr).toBe('10.0.16.0/21');
    expect(envs[0].network.subnets.map((sn) => sn.name)).toEqual([
      'sn-<region>-<env>-web', 'sn-<region>-<env>-app', 'sn-<region>-<env>-db', 'sn-<region>-<env>-infra',
    ]);
    // a stored env network is kept as-is
    const custom = {
      environments: [{ name: 'prod', securityZone: true, network: { vcnCidr: '192.168.8.0/21', subnets: [] } }],
    };
    expect(normalizeModel(custom).environments[0].network.vcnCidr).toBe('192.168.8.0/21');
  });

  it('normalizeModel upgrades an untouched 10.100-based hub default to 10.0.0.0/21', () => {
    const stored = {
      network: {
        hubKind: 'hub_a',
        hubVcnName: 'vcn-<region>-<lze>-hub',
        hubVcnCidr: '10.100.0.0/21',
        subnets: hubKindDefaults('hub_a').subnets.map((sn, i) => ({ name: sn.name, cidr: `10.100.${i}.0/24` })),
      },
    };
    const net = normalizeModel(stored).network;
    expect(net.hubVcnCidr).toBe('10.0.0.0/21');
    expect(net.subnets[0].cidr).toBe('10.0.0.0/24');
    // but a customised 10.100 network is left alone
    const custom = {
      network: { hubKind: 'hub_a', hubVcnCidr: '10.100.0.0/21', subnets: [{ name: 'mine', cidr: '10.100.0.0/24' }] },
    };
    expect(normalizeModel(custom).network.hubVcnCidr).toBe('10.100.0.0/21');
  });

  it('normalizeModel migrates the old cmp-landingzone default to landingzone', () => {
    const stored = { presentation: { customer: '', landingZone: 'cmp-landingzone' } };
    expect(normalizeModel(stored).presentation.landingZone).toBe('landingzone');
    // a real custom name is untouched
    const custom = { presentation: { customer: '', landingZone: 'acme' } };
    expect(normalizeModel(custom).presentation.landingZone).toBe('acme');
  });
});
