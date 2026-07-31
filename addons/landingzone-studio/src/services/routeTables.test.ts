import { describe, expect, it } from 'vitest';
import { buildRouteTables } from './routeTables';
import { emptyLzModel } from '../model/defaults';

describe('buildRouteTables', () => {
  it('builds hub subnet + gateway + DRG tables and one per spoke subnet, with ONTV columns', () => {
    const t = buildRouteTables(emptyLzModel());
    expect(t.map((r) => r.id)).toEqual(expect.arrayContaining([
      'rt-hub-dmz', 'rt-hub-lb', 'rt-hub-internal', 'rt-hub-mgmt',
      'rt-hub-igw', 'rt-hub-natgw', 'rt-hub-ingress', 'rt-drg-hub', 'rt-drg-prod', 'rt-drg-preprod', 'rt-drg-dev',
    ]));
    expect(t.filter((r) => r.kind === 'spoke')).toHaveLength(12); // 3 envs × 4 subnets
    // VCN tables use 4-column layout, DRG tables 3-column
    expect(t.find((r) => r.id === 'rt-hub-dmz')!.columns).toBe('vcn');
    expect(t.find((r) => r.id === 'rt-drg-hub')!.columns).toBe('drg');
  });

  it('emits ONTV target-type/target/route-type cells', () => {
    const t = buildRouteTables(emptyLzModel());
    expect(t.find((r) => r.id === 'rt-hub-dmz')!.rules[0]).toEqual({
      destination: '0.0.0.0/0', matchCidr: '0.0.0.0/0', targetType: 'Internet Gateway', target: 'IGW', routeType: 'Static', nextHopKind: 'igw', flowTarget: 'gw-igw',
    });
    const lb = t.find((r) => r.id === 'rt-hub-lb')!;
    expect(lb.rules[0]).toMatchObject({ targetType: 'Private IP', target: '10.0.0.4 (nfw-fra-hub-dmz)', nextHopKind: 'firewall', flowTarget: '10.0.0.4' });
    // LB → spoke-backend leg routes through the INTERNAL firewall (10.0.2.4), not straight to the DRG.
    expect(lb.rules.filter((r) => r.destination !== '0.0.0.0/0').map((r) => [r.destination, r.nextHopKind, r.flowTarget])).toEqual([
      ['10.0.8.0/21', 'firewall', '10.0.2.4'],
      ['10.0.16.0/21', 'firewall', '10.0.2.4'],
      ['10.0.24.0/21', 'firewall', '10.0.2.4'],
    ]);
    const mgmt = t.find((r) => r.id === 'rt-hub-mgmt')!;
    expect(mgmt.rules.at(-1)).toMatchObject({ destination: 'OSN Services', targetType: 'Service Gateway', target: 'SGW', flowTarget: 'gw-sgw' });
    // mgmt / mon / dns each get their own management table on their subnet
    expect(t.find((r) => r.id === 'rt-hub-mon')).toMatchObject({ attachTo: 'hub-vcn-sn-4' });
    expect(t.find((r) => r.id === 'rt-hub-dns')).toMatchObject({ attachTo: 'hub-vcn-sn-5' });
  });

  it('builds the NAT-return + ingress gateway tables routed through the internal firewall', () => {
    const t = buildRouteTables(emptyLzModel());
    const natgw = t.find((r) => r.id === 'rt-hub-natgw')!;
    expect(natgw.rules.every((r) => r.nextHopKind === 'firewall' && r.flowTarget === '10.0.2.4')).toBe(true);
    expect(t.find((r) => r.id === 'rt-hub-ingress')!.rules[0]).toMatchObject({ destination: '0.0.0.0/0', nextHopKind: 'firewall', flowTarget: '10.0.2.4' });
  });

  it('builds a DRG hub table (dynamic, import note) mapping each spoke /24 to its attachment', () => {
    const t = buildRouteTables(emptyLzModel());
    const drg = t.find((r) => r.id === 'rt-drg-hub')!;
    expect(drg).toMatchObject({ attachTo: 'attach-hub' });
    expect(drg.note).toMatch(/Import route distribution/);
    expect(drg.rules[0]).toMatchObject({ destination: '10.0.8.0/24', targetType: 'VCN Attachment', target: 'vcn-prod-attachment', routeType: 'Dynamic', flowTarget: 'attach-cmp-env-0' });
    expect(drg.rules).toHaveLength(12);
    // each spoke attachment has its own DRG table defaulting to the hub attachment
    expect(t.find((r) => r.id === 'rt-drg-prod')).toMatchObject({ attachTo: 'attach-cmp-env-0' });
    expect(t.find((r) => r.id === 'rt-drg-prod')!.rules[0]).toMatchObject({ destination: '0.0.0.0/0', target: 'vcn-hub-attach', flowTarget: 'attach-hub' });
  });

  it('gives each spoke subnet a default-to-DRG + OSN-to-SGW table', () => {
    const t = buildRouteTables(emptyLzModel());
    const web = t.find((r) => r.id === 'rt-ssn-0-0')!;
    expect(web.name).toBe('rt-fra-ssn-prod-web');
    expect(web.attachTo).toBe('cmp-env-0-vcn-sn-0');
    expect(web.rules.map((r) => [r.destination, r.targetType, r.target])).toEqual([
      ['0.0.0.0/0', 'Dynamic Routing Gateway', 'DRG'],
      ['OSN Services', 'Service Gateway', 'SGW'],
    ]);
  });
});
