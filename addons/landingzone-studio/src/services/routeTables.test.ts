import { describe, expect, it } from 'vitest';
import { buildRouteTables } from './routeTables';
import { emptyLzModel } from '../model/defaults';
import { hubKindDefaults } from './hubKinds';
import { newPlatform, newSharedPlatform } from './platforms';

describe('buildRouteTables', () => {
  it('builds generator-owned hub, shared DRG, and one-per-VCN spoke tables', () => {
    const t = buildRouteTables(emptyLzModel());
    expect(t.map((r) => r.id)).toEqual(expect.arrayContaining([
      'rt-hub-dmz', 'rt-hub-lb', 'rt-hub-internal', 'rt-hub-mgmt',
      'rt-hub-igw', 'rt-hub-natgw', 'rt-hub-ingress', 'rt-drg-hub', 'rt-drg-spokes', 'rt-ssn-0', 'rt-ssn-1',
    ]));
    expect(t.filter((r) => r.kind === 'spoke')).toHaveLength(2);
    // VCN tables use 4-column layout, DRG tables 3-column
    expect(t.find((r) => r.id === 'rt-hub-dmz')!.columns).toBe('vcn');
    expect(t.find((r) => r.id === 'rt-drg-hub')!.columns).toBe('drg');
    expect(t.find((r) => r.id === 'rt-hub-dmz')!.name).toBe('rt-fra-lz-hub-fw-dmz');
    expect(t.find((r) => r.id === 'rt-drg-spokes')!.name).toBe('drgrt-fra-lz-spokes');
  });

  it('emits ONTV target-type/target/route-type cells', () => {
    const t = buildRouteTables(emptyLzModel());
    expect(t.find((r) => r.id === 'rt-hub-dmz')!.rules[0]).toEqual({
      destination: '0.0.0.0/0', matchCidr: '0.0.0.0/0', targetType: 'Internet Gateway', target: 'IGW', routeType: 'Static', nextHopKind: 'igw', flowTarget: 'gw-igw',
    });
    const lb = t.find((r) => r.id === 'rt-hub-lb')!;
    expect(lb.rules[0]).toMatchObject({ targetType: 'Private IP', target: '10.0.0.10 (nfw-fra-lz-hub-dmz)', nextHopKind: 'firewall', flowTarget: '10.0.0.10' });
    // LB → spoke-backend leg routes through the generator-owned INTERNAL firewall IP, not straight to the DRG.
    expect(lb.rules.filter((r) => r.destination !== '0.0.0.0/0').map((r) => [r.destination, r.nextHopKind, r.flowTarget])).toEqual([
      ['10.0.64.0/21', 'firewall', '10.0.2.10'],
      ['10.0.128.0/21', 'firewall', '10.0.2.10'],
    ]);
    const mgmt = t.find((r) => r.id === 'rt-hub-mgmt')!;
    expect(mgmt.rules.at(-1)).toMatchObject({ destination: 'OSN Services', targetType: 'Service Gateway', target: 'SGW', flowTarget: 'gw-sgw' });
    // mgmt / mon / dns share the generator's management table.
    expect(mgmt.attachExtra).toEqual(['hub-vcn-sn-4', 'hub-vcn-sn-5']);
    expect(t.find((r) => r.id === 'rt-hub-mon')).toBeUndefined();
  });

  it('builds the NAT-return + ingress gateway tables routed through the internal firewall', () => {
    const t = buildRouteTables(emptyLzModel());
    const natgw = t.find((r) => r.id === 'rt-hub-natgw')!;
    expect(natgw.rules.every((r) => r.nextHopKind === 'firewall' && r.flowTarget === '10.0.2.10')).toBe(true);
    expect(t.find((r) => r.id === 'rt-hub-ingress')).toMatchObject({ kind: 'hub', attachTo: 'attach-hub' });
    expect(t.find((r) => r.id === 'rt-hub-ingress')!.rules[0]).toMatchObject({ destination: '0.0.0.0/0', nextHopKind: 'firewall', flowTarget: '10.0.2.10' });
  });

  it('attaches the hub and shared spoke DRG tables at the attachments they govern', () => {
    const t = buildRouteTables(emptyLzModel());
    const drg = t.find((r) => r.id === 'rt-drg-hub')!;
    expect(drg).toMatchObject({ attachTo: 'attach-hub', name: 'drgrt-fra-lz-hub' });
    expect(drg.note).toMatch(/Import route distribution/);
    expect(drg.rules[0]).toMatchObject({ destination: '10.0.64.0/21', targetType: 'VCN Attachment', target: 'drgatt-fra-lz-prod-proj', routeType: 'Dynamic', flowTarget: 'attach-cmp-env-0' });
    expect(drg.rules).toHaveLength(2);
    const spokes = t.find((r) => r.id === 'rt-drg-spokes')!;
    expect(spokes).toMatchObject({
      attachTo: 'attach-cmp-env-0',
      attachExtra: ['attach-cmp-env-1'],
      name: 'drgrt-fra-lz-spokes',
    });
    expect(spokes.rules[0]).toMatchObject({ destination: '0.0.0.0/0', target: 'drgatt-fra-lz-hub', flowTarget: 'attach-hub' });
  });

  it('shares DRGRT-SPOKES across environment and shared platform attachments', () => {
    const base = emptyLzModel();
    const platform = newPlatform('custom', []);
    const shared = newSharedPlatform('custom', []);
    const spokes = buildRouteTables({ ...base, platforms: [platform], sharedPlatforms: [shared] })
      .find((table) => table.id === 'rt-drg-spokes')!;
    expect([spokes.attachTo, ...(spokes.attachExtra ?? [])]).toEqual([
      'attach-cmp-env-0',
      'attach-cmp-env-0-plat-0',
      'attach-cmp-env-1',
      'attach-cmp-env-1-plat-0',
      'attach-shared-0',
    ]);
    expect([spokes.attachTo, ...(spokes.attachExtra ?? [])]).not.toContain('drg');
  });

  it('gives each spoke subnet a default-to-DRG + OSN-to-SGW table', () => {
    const t = buildRouteTables(emptyLzModel());
    const web = t.find((r) => r.id === 'rt-ssn-0')!;
    expect(web.name).toBe('rt-fra-lz-prod-proj-generic');
    expect(web.attachTo).toBe('cmp-env-0-vcn-sn-0');
    expect(web.attachExtra).toEqual(['cmp-env-0-vcn-sn-1', 'cmp-env-0-vcn-sn-2', 'cmp-env-0-vcn-sn-3']);
    expect(web.rules.map((r) => [r.destination, r.targetType, r.target])).toEqual([
      ['0.0.0.0/0', 'Dynamic Routing Gateway', 'DRG'],
      ['OSN Services', 'Service Gateway', 'SGW'],
    ]);
  });

  it('models Hub E with direct DRG spoke routes and each spoke NAT gateway', () => {
    const base = emptyLzModel();
    const model = { ...base, network: { ...base.network, hubKind: 'hub_e' as const, ...hubKindDefaults('hub_e') } };
    const t = buildRouteTables(model);
    expect(t.find((r) => r.id === 'rt-hub-lb')!.rules.map((r) => r.nextHopKind)).toEqual(['igw', 'drg', 'drg']);
    expect(t.find((r) => r.id === 'rt-hub-mgmt')!.rules[0]).toMatchObject({ nextHopKind: 'natgw', flowTarget: 'gw-natgw' });
    expect(t.find((r) => r.id === 'rt-ssn-0')!.rules[0]).toMatchObject({ nextHopKind: 'natgw', flowTarget: 'cmp-env-0-natgw' });
    expect(t.find((r) => r.id === 'rt-drg-spokes')!.rules).toContainEqual(expect.objectContaining({ destination: '10.0.128.0/21', flowTarget: 'attach-cmp-env-1' }));
  });

  it('models Hub B final routes through its one OCI Network Firewall', () => {
    const base = emptyLzModel();
    const model = { ...base, network: { ...base.network, hubKind: 'hub_b' as const, ...hubKindDefaults('hub_b') } };
    const t = buildRouteTables(model);
    expect(t.find((r) => r.id === 'rt-hub-fw')!.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ destination: '0.0.0.0/0', nextHopKind: 'natgw' }),
      expect.objectContaining({ destination: '10.0.64.0/21', nextHopKind: 'drg' }),
    ]));
    expect(t.find((r) => r.id === 'rt-hub-ingress')).toMatchObject({ note: expect.stringMatching(/Final routing phase/) });
    expect(t.find((r) => r.id === 'rt-hub-lb')!.rules[1]).toMatchObject({ destination: '10.0.64.0/21', nextHopKind: 'firewall', flowTarget: '10.0.1.10' });
    expect(t.find((r) => r.id === 'rt-hub-natgw')!.rules).toHaveLength(3);
  });

  it('models Hub C trust/untrust NLB routes and marks the external backend hand-off', () => {
    const base = emptyLzModel();
    const model = { ...base, network: { ...base.network, hubKind: 'hub_c' as const, ...hubKindDefaults('hub_c') } };
    const t = buildRouteTables(model);
    expect(t.find((r) => r.id === 'rt-hub-igw')!.rules[0]).toMatchObject({ nextHopKind: 'nlb', flowTarget: 'hub-vcn-sn-0' });
    expect(t.find((r) => r.id === 'rt-hub-ingress')!.rules[0]).toMatchObject({ nextHopKind: 'nlb', flowTarget: 'hub-vcn-sn-1' });
    expect(t.find((r) => r.id === 'rt-hub-trust')!.rules).toContainEqual(expect.objectContaining({ destination: '10.0.64.0/21', nextHopKind: 'drg' }));
    expect(t.find((r) => r.id === 'rt-hub-lb')).toMatchObject({ note: expect.stringMatching(/network_backends\.json/) });
  });

  it('adds the generator-owned OCVS provisioning route table and service gateway', () => {
    const base = emptyLzModel();
    const ocvs = newPlatform('ocvs', []);
    const model = { ...base, platforms: [{ ...ocvs, environments: ['environment-1'], ocvsParams: { ...ocvs.ocvsParams!, sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' } }] };
    const table = buildRouteTables(model).find((entry) => entry.id === 'rt-ocvs-0-0-provisioning')!;
    expect(table).toMatchObject({ name: 'rt-fra-lz-prod-ocvs-provisioning', attachTo: 'cmp-env-0-plat-0-sn-0', note: expect.stringMatching(/VLAN route tables and NSGs/) });
    expect(table.rules[0]).toMatchObject({ destination: 'OSN Services', nextHopKind: 'sgw', flowTarget: 'cmp-env-0-plat-0-sgw' });
    expect(table.rules).toContainEqual(expect.objectContaining({ destination: '10.0.0.0/21', nextHopKind: 'drg' }));
  });

  it('adds the shared OCVS provisioning route table when that supported placement is selected', () => {
    const base = emptyLzModel();
    const ocvs = newPlatform('ocvs', []);
    const model = { ...base, sharedPlatforms: [{ id: 'shared-ocv', key: 'ocv', type: 'ocvs' as const, vcnCidr: '10.170.0.0/21', subnets: [], ocvsParams: { ...ocvs.ocvsParams!, sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' } }] };
    const table = buildRouteTables(model).find((entry) => entry.id === 'rt-ocvs-shared-0-provisioning')!;
    expect(table.name).toBe('rt-fra-lz-shared-ocv-provisioning');
    expect(table.rules[0]).toMatchObject({ nextHopKind: 'sgw', flowTarget: 'shared-plat-sgw-0' });
  });
});
