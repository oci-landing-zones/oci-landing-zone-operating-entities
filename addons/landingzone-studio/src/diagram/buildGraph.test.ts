import { describe, expect, it } from 'vitest';
import { buildGraph } from './buildGraph';
import { buildRouteTables } from '../services/routeTables';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { newPlatform } from '../services/platforms';
import type { Environment, LzModel } from '../model/types';

function env(name: string, securityZone: boolean, index: number): Environment {
  return { name, securityZone, network: envNetworkDefaults(index) };
}

describe('buildGraph', () => {
  it('nests region → tenancy → landing zone as containers', () => {
    const g = buildGraph(emptyLzModel());
    expect(g.nodes[0]).toMatchObject({ id: 'region', kind: 'region' });
    expect(g.nodes[0].parentId).toBeUndefined();
    expect(g.nodes.find((n) => n.id === 'tenancy')).toMatchObject({ kind: 'tenancy', parentId: 'region' });
    expect(g.nodes.find((n) => n.id === 'landingzone')).toMatchObject({ kind: 'landingzone', parentId: 'tenancy' });
  });

  it('labels the tenancy from the customer field (diagram-only)', () => {
    const withCustomer: LzModel = { ...emptyLzModel(), presentation: { customer: 'Acme', landingZone: 'cmp-landingzone' } };
    expect(buildGraph(withCustomer).nodes.find((n) => n.id === 'tenancy')?.label).toBe('OCI Tenancy - Acme');
    // falls back when empty
    expect(buildGraph(emptyLzModel()).nodes.find((n) => n.id === 'tenancy')?.label).toBe('OCI Tenancy - Operating Entity');
  });

  it('labels the landing zone container cmp-<name> from presentation.landingZone', () => {
    const m: LzModel = { ...emptyLzModel(), presentation: { customer: '', landingZone: 'my-lz' } };
    expect(buildGraph(m).nodes.find((n) => n.id === 'landingzone')?.label).toBe('cmp-my-lz');
    // a typed cmp- prefix isn't doubled
    const pre: LzModel = { ...emptyLzModel(), presentation: { customer: '', landingZone: 'cmp-my-lz' } };
    expect(buildGraph(pre).nodes.find((n) => n.id === 'landingzone')?.label).toBe('cmp-my-lz');
  });

  it('always includes the two yellow shared compartments inside the landing zone', () => {
    const g = buildGraph(emptyLzModel());
    const net = g.nodes.find((n) => n.id === 'cmp-network');
    const sec = g.nodes.find((n) => n.id === 'cmp-security');
    expect(net).toMatchObject({ kind: 'compartment', tone: 'yellow', label: 'cmp-landingzone-network', parentId: 'landingzone' });
    expect(sec).toMatchObject({ kind: 'compartment', tone: 'yellow', label: 'cmp-landingzone-security', parentId: 'landingzone' });
  });

  it('adds a green compartment per environment, named cmp-<lze>-<env>, flagging Security Zones', () => {
    const m: LzModel = {
      ...emptyLzModel(),
      environments: [env('prod', true, 0), env('dev', false, 1)],
    };
    const g = buildGraph(m);
    expect(g.nodes.find((n) => n.id === 'cmp-env-0')).toMatchObject({ tone: 'green', label: 'cmp-landingzone-prod', parentId: 'landingzone', secure: true });
    expect(g.nodes.find((n) => n.id === 'cmp-env-1')).toMatchObject({ tone: 'green', label: 'cmp-landingzone-dev', parentId: 'landingzone', secure: false });
  });

  it('nests the hub VCN (resolved name + CIDR) inside the network compartment', () => {
    const g = buildGraph(emptyLzModel());
    const vcn = g.nodes.find((n) => n.id === 'hub-vcn');
    expect(vcn).toMatchObject({ kind: 'vcn', parentId: 'cmp-network' });
    expect(vcn?.label).toBe('vcn-fra-landingzone-hub\n10.0.0.0/21');
    // network compartment renders as a container now
    expect(g.nodes.find((n) => n.id === 'cmp-network')?.container).toBe(true);
  });

  it('nests the step 2 subnets (resolved names + CIDRs) inside the hub VCN', () => {
    const g = buildGraph(emptyLzModel());
    const subnets = g.nodes.filter((n) => n.kind === 'subnet' && n.parentId === 'hub-vcn');
    expect(subnets).toHaveLength(6);
    expect(subnets[0].label).toBe('sn-fra-landingzone-hub-fw-dmz\n10.0.0.0/24');
    expect(subnets[5].label).toBe('sn-fra-landingzone-hub-dns\n10.0.5.0/24');
  });

  it('gives every environment a fixed default network: net compartment › VCN › 4 subnets', () => {
    const m: LzModel = {
      ...emptyLzModel(),
      environments: [env('prod', true, 0), env('preprod', false, 1)],
    };
    const g = buildGraph(m);

    // prod: cmp › cmp-network › vcn (10.0.8.0/21) › web/app/db/infra
    expect(g.nodes.find((n) => n.id === 'cmp-env-0-network')).toMatchObject({
      kind: 'compartment', tone: 'yellow', container: true, label: 'cmp-landingzone-prod-network', parentId: 'cmp-env-0',
    });
    const prodVcn = g.nodes.find((n) => n.id === 'cmp-env-0-vcn');
    expect(prodVcn).toMatchObject({ kind: 'vcn', parentId: 'cmp-env-0-network' });
    expect(prodVcn?.label).toBe('vcn-fra-prod-projects\n10.0.8.0/21');
    const prodSubnets = g.nodes.filter((n) => n.kind === 'subnet' && n.parentId === 'cmp-env-0-vcn');
    expect(prodSubnets.map((sn) => sn.label)).toEqual([
      'sn-fra-prod-web\n10.0.8.0/24',
      'sn-fra-prod-app\n10.0.9.0/24',
      'sn-fra-prod-db\n10.0.10.0/24',
      'sn-fra-prod-infra\n10.0.11.0/24',
    ]);

    // preprod gets the next /21 block
    expect(g.nodes.find((n) => n.id === 'cmp-env-1-vcn')?.label).toBe('vcn-fra-preprod-projects\n10.0.16.0/21');
    const ppSubnets = g.nodes.filter((n) => n.kind === 'subnet' && n.parentId === 'cmp-env-1-vcn');
    expect(ppSubnets.map((sn) => sn.label.split('\n')[1])).toEqual([
      '10.0.16.0/24', '10.0.17.0/24', '10.0.18.0/24', '10.0.19.0/24',
    ]);
  });

  it('decorates the hub firewall/LB subnets with icons + captions from the region field', () => {
    const g = buildGraph(emptyLzModel());
    const subnets = g.nodes.filter((n) => n.kind === 'subnet' && n.parentId === 'hub-vcn');
    expect(subnets[0]).toMatchObject({ icon: 'firewall', caption: 'nfw-fra-hub-dmz', captionTone: 'green' });
    expect(subnets[1]).toMatchObject({ icon: 'lb', caption: 'Load Balancer', captionTone: 'green' });
    expect(subnets[2]).toMatchObject({ icon: 'firewall', caption: 'nfw-fra-hub-int', captionTone: 'orange' });
    // firewalls show an IP derived from their subnet range when none is stored
    expect(subnets[0].ipNote).toBe('10.0.0.4');
    expect(subnets[2].ipNote).toBe('10.0.2.4');
    expect(subnets[1].ipNote).toBeUndefined(); // the load balancer has no IP note
    expect(subnets[3].icon).toBeUndefined();
    // decorated subnets are taller than plain ones
    expect(subnets[0].height).toBeGreaterThan(subnets[3].height);
  });

  it('shows a stored firewall IP over the derived default', () => {
    const base = emptyLzModel();
    const m: LzModel = { ...base, network: { ...base.network, fwDmzIp: '10.0.0.9', fwIntIp: '10.0.2.20' } };
    const subnets = buildGraph(m).nodes.filter((n) => n.kind === 'subnet' && n.parentId === 'hub-vcn');
    expect(subnets[0].ipNote).toBe('10.0.0.9');
    expect(subnets[2].ipNote).toBe('10.0.2.20');
  });

  it('places the three gateways on the hub VCN border inside the network compartment', () => {
    const g = buildGraph(emptyLzModel());
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    const vcn = byId.get('hub-vcn')!;
    for (const [id, icon] of [['gw-igw', 'igw'], ['gw-natgw', 'natgw'], ['gw-sgw', 'sgw']] as const) {
      const gw = byId.get(id)!;
      expect(gw).toMatchObject({ kind: 'gateway', icon, parentId: 'cmp-network' });
      // horizontally centred on the VCN's left border
      expect(gw.x + gw.width / 2).toBe(vcn.x);
    }
    // IGW above NAT above SGW
    expect(byId.get('gw-igw')!.y).toBeLessThan(byId.get('gw-natgw')!.y);
    expect(byId.get('gw-natgw')!.y).toBeLessThan(byId.get('gw-sgw')!.y);
  });

  it('gives every environment VCN its own Service Gateway', () => {
    const m: LzModel = { ...emptyLzModel(), environments: [env('prod', true, 0), env('dev', false, 1)] };
    const g = buildGraph(m, 3); // spoke VCNs (and their SGWs) appear in step 3
    const sgw0 = g.nodes.find((n) => n.id === 'cmp-env-0-sgw');
    expect(sgw0).toMatchObject({ kind: 'gateway', icon: 'sgw', parentId: 'cmp-env-0-network' });
    expect(g.nodes.find((n) => n.id === 'cmp-env-1-sgw')).toMatchObject({ kind: 'gateway', icon: 'sgw' });
  });

  it('adds a gray projects compartment with a block per applicable project (step 3)', () => {
    const base = emptyLzModel();
    const m: LzModel = { ...base, projects: [{ name: 'project1', environments: 'all' }, { name: 'beta', environments: ['prod'] }] };
    const g = buildGraph(m, 3);
    // every env gets a gray projects compartment
    expect(g.nodes.find((n) => n.id === 'cmp-env-0-projects')).toMatchObject({ kind: 'compartment', tone: 'gray', parentId: 'cmp-env-0', label: 'cmp-landingzone-prod-projects' });
    const blocks = (e: number) => g.nodes.filter((n) => n.kind === 'project' && n.parentId === `cmp-env-${e}-projects`).map((n) => n.label);
    expect(blocks(0)).toEqual(['project1', 'beta']); // prod gets both
    expect(blocks(1)).toEqual(['project1']);          // preprod: only the 'all' one
    expect(blocks(2)).toEqual(['project1']);          // dev: only the 'all' one
    // projects belong to step 3 — nothing at step 2
    expect(buildGraph(m, 2).nodes.some((n) => n.kind === 'project')).toBe(false);
  });

  it('adds the shared platform compartment, VCN and subnets only from step 4', () => {
    const m = emptyLzModel();
    expect(buildGraph(m, 3).nodes.some((n) => n.id === 'cmp-shared-platform')).toBe(false);
    const nodes = buildGraph(m, 4).nodes;
    const shared = nodes.find((n) => n.id === 'cmp-shared-platform');
    expect(shared).toMatchObject({ kind: 'compartment', tone: 'gray', parentId: 'landingzone', container: true });
    expect(shared?.label).toBe('cmp-landingzone-platform-shared');
    // The CIDR moved onto a real VCN, which carries its mandatory subnet.
    const vcn = nodes.find((n) => n.id === 'shared-plat-vcn');
    expect(vcn).toMatchObject({ kind: 'vcn', parentId: 'cmp-shared-platform' });
    expect(vcn?.label).toBe('vcn-core\n10.170.0.0/21');
    expect(nodes.some((n) => n.kind === 'subnet' && n.parentId === 'shared-plat-vcn')).toBe(true);
    // It shares the left column with cmp-network, so it lines up with the hub VCN.
    const netComp = nodes.find((n) => n.id === 'cmp-network')!;
    const hubVcn = nodes.find((n) => n.id === 'hub-vcn')!;
    expect(shared?.width).toBe(netComp.width);
    expect(shared?.x).toBe(netComp.x);
    expect(vcn?.x).toBe(hubVcn.x);
  });

  it('adds a platforms compartment + a VCN (with subnets) per platform (step 4)', () => {
    const base = emptyLzModel();
    const m: LzModel = {
      ...base,
      environments: [env('prod', true, 0), env('preprod', false, 1)],
      platforms: [{ ...newPlatform('oke_simple', []), id: 'oke', name: 'oke' }],
    };
    // no env platforms before step 4
    expect(buildGraph(m, 3).nodes.some((n) => n.id === 'cmp-env-0-platforms')).toBe(false);
    const g = buildGraph(m, 4);
    expect(g.nodes.find((n) => n.id === 'cmp-env-0-platforms')).toMatchObject({ kind: 'compartment', tone: 'gray', container: true, parentId: 'cmp-env-0', label: 'cmp-landingzone-prod-platforms' });
    // the platform renders as a VCN inside the platforms compartment, named vcn-<platform>
    const vcn0 = g.nodes.find((n) => n.id === 'cmp-env-0-plat-0');
    expect(vcn0).toMatchObject({ kind: 'vcn', parentId: 'cmp-env-0-platforms' });
    expect(vcn0?.label).toBe('vcn-oke\n10.140.0.0/21');
    // The platforms compartment stacks under the network compartment in the same
    // column, so the two must stay the same width with their VCNs aligned.
    const platComp = g.nodes.find((n) => n.id === 'cmp-env-0-platforms')!;
    const netComp = g.nodes.find((n) => n.id === 'cmp-env-0-network')!;
    expect(platComp.width).toBe(netComp.width);
    expect(platComp.x).toBe(netComp.x);
    const envVcn = g.nodes.find((n) => n.id === 'cmp-env-0-vcn')!;
    expect(vcn0?.x).toBe(envVcn.x);
    expect(vcn0?.width).toBe(envVcn.width);
    // OKE's four subnets nested inside, re-based into the env VCN
    const subs0 = g.nodes.filter((n) => n.kind === 'subnet' && n.parentId === 'cmp-env-0-plat-0');
    expect(subs0.map((n) => n.label)).toEqual([
      'int-lb\n10.140.0.0/25', 'control-plane\n10.140.0.128/25', 'workers\n10.140.2.0/23', 'pods\n10.140.4.0/23',
    ]);
    // preprod gets the platform's next /21 block, subnets shifted to match
    expect(g.nodes.find((n) => n.id === 'cmp-env-1-plat-0')?.label).toBe('vcn-oke\n10.140.8.0/21');
    expect(g.nodes.find((n) => n.id === 'cmp-env-1-plat-0-sn-0')?.label).toBe('int-lb\n10.140.8.0/25');
  });

  it('gives each platform VCN its own DRG attachment (pill + VCN→attach→DRG edges)', () => {
    const base = emptyLzModel();
    const m: LzModel = {
      ...base,
      environments: [env('prod', true, 0), env('preprod', false, 1)],
      platforms: [{ ...newPlatform('oke_simple', []), id: 'oke', name: 'oke' }],
    };
    const g = buildGraph(m, 4);
    // one attachment pill per platform VCN, clustered in cmp-network with the spokes
    const attach = g.nodes.find((n) => n.id === 'attach-cmp-env-0-plat-0');
    expect(attach).toMatchObject({ kind: 'attachment', parentId: 'cmp-network' });
    expect(attach?.label).toBe('vcn-oke-prod-attach'); // <env> resolved
    expect(g.nodes.find((n) => n.id === 'attach-cmp-env-1-plat-0')?.label).toBe('vcn-oke-preprod-attach');
    // platform VCN → its attachment → DRG (same wiring as the spokes)
    expect(g.edges).toContainEqual(expect.objectContaining({ source: 'cmp-env-0-plat-0', target: 'attach-cmp-env-0-plat-0' }));
    expect(g.edges).toContainEqual(expect.objectContaining({ source: 'attach-cmp-env-0-plat-0', target: 'drg' }));
    // DRG now has: hub + 2 spokes + 2 platform VCNs = 5 attachments feeding it
    expect(g.edges.filter((e) => e.target === 'drg')).toHaveLength(5);
  });

  it('stacks platforms in the left column so they never widen the env compartment', () => {
    const base = emptyLzModel();
    const withP: LzModel = { ...base, platforms: [newPlatform('oke_simple', [])] };
    const w0 = buildGraph(base, 4).nodes.find((n) => n.id === 'cmp-env-0')!.width;
    const w1 = buildGraph(withP, 4).nodes.find((n) => n.id === 'cmp-env-0')!.width;
    expect(w1).toBe(w0); // platforms stack below the network col, not a new column
    // the platforms compartment sits at the left edge (x = PAD), on the gutter
    const platComp = buildGraph(withP, 4).nodes.find((n) => n.id === 'cmp-env-0-platforms')!;
    const netComp = buildGraph(withP, 4).nodes.find((n) => n.id === 'cmp-env-0-network')!;
    expect(platComp.x).toBe(netComp.x);
    expect(platComp.y).toBeGreaterThan(netComp.y); // below the network compartment
  });

  it('keeps every node inside its parent bounds with platforms (step 4)', () => {
    const base = emptyLzModel();
    const oke = newPlatform('oke_simple', []);
    const custom = { ...newPlatform('custom', [oke]), environments: ['prod'] };
    const m: LzModel = { ...base, platforms: [oke, custom] };
    const g = buildGraph(m, 4);
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    for (const n of g.nodes) {
      if (!n.parentId) continue;
      const p = byId.get(n.parentId)!;
      expect(n.x + n.width, `${n.id} right edge in ${p.id}`).toBeLessThanOrEqual(p.width);
      expect(n.y + n.height, `${n.id} bottom edge in ${p.id}`).toBeLessThanOrEqual(p.height);
    }
  });

  it('adds one DRG plus a VCN-attachment + VCN→attach→DRG edges per VCN', () => {
    const m: LzModel = { ...emptyLzModel(), environments: [env('prod', true, 0), env('preprod', false, 1)] };
    const g = buildGraph(m, 3); // spoke attachments join in step 3
    // single DRG inside the network compartment, named from the model
    const drg = g.nodes.find((n) => n.kind === 'drg');
    expect(drg).toMatchObject({ id: 'drg', label: 'DRG', parentId: 'cmp-network' });
    // every attachment pill clusters with the DRG inside cmp-network
    expect(g.nodes.find((n) => n.id === 'attach-hub')).toMatchObject({ parentId: 'cmp-network' });
    expect(g.nodes.find((n) => n.id === 'attach-cmp-env-0')).toMatchObject({ parentId: 'cmp-network' });
    // an attachment per VCN (hub + 2 envs), resolved names
    const attaches = g.nodes.filter((n) => n.kind === 'attachment');
    expect(attaches.map((a) => a.label)).toEqual(['vcn-hub-attach', 'vcn-prod-attach', 'vcn-preprod-attach']);
    // each VCN wires to its attachment, each attachment to the DRG
    expect(g.edges).toContainEqual(expect.objectContaining({ source: 'hub-vcn', target: 'attach-hub' }));
    expect(g.edges).toContainEqual(expect.objectContaining({ source: 'attach-hub', target: 'drg' }));
    expect(g.edges).toContainEqual(expect.objectContaining({ source: 'cmp-env-0-vcn', target: 'attach-cmp-env-0' }));
    expect(g.edges.filter((e) => e.target === 'drg')).toHaveLength(3);
  });

  it('step 2 shows the hub + its DRG attachment only — no spoke VCNs or attachments', () => {
    const m: LzModel = { ...emptyLzModel(), environments: [env('prod', true, 0), env('preprod', false, 1)] };
    const g = buildGraph(m, 2);
    // hub VCN + DRG + the hub's own attachment are present
    expect(g.nodes.find((n) => n.id === 'hub-vcn')).toBeTruthy();
    expect(g.nodes.find((n) => n.id === 'drg')).toBeTruthy();
    expect(g.nodes.filter((n) => n.kind === 'attachment').map((a) => a.id)).toEqual(['attach-hub']);
    // no spoke VCNs / their SGWs yet
    expect(g.nodes.some((n) => n.id.endsWith('-vcn') && n.id.startsWith('cmp-env'))).toBe(false);
    expect(g.nodes.some((n) => n.id.endsWith('-sgw') && n.id.startsWith('cmp-env'))).toBe(false);
    // env compartments are empty rows (not containers)
    expect(g.nodes.find((n) => n.id === 'cmp-env-0')?.container).toBeUndefined();
    expect(g.nodes.find((n) => n.id === 'cmp-env-0-network')).toBeUndefined();
    // step 3 brings the spoke VCNs in
    expect(buildGraph(m, 3).nodes.some((n) => n.id === 'cmp-env-0-vcn')).toBe(true);
  });

  it('survives a partial hub network (missing fw IPs / routing / drg name)', () => {
    const base = emptyLzModel();
    // mimics a wholesale hub-kind switch that dropped the extra network fields
    const m = { ...base, network: { hubKind: 'hub_a', hubVcnName: base.network.hubVcnName, hubVcnCidr: base.network.hubVcnCidr, subnets: base.network.subnets } } as unknown as LzModel;
    expect(() => buildGraph(m, 3)).not.toThrow();
    expect(buildGraph(m, 3).nodes.find((n) => n.id === 'drg')?.label).toBe('DRG');
  });

  it('keeps the routing band out of the step-1 view', () => {
    const g = buildGraph(emptyLzModel(), 1);
    expect(g.nodes.some((n) => n.kind === 'drg' || n.kind === 'attachment')).toBe(false);
    expect(g.edges).toHaveLength(0);
  });

  it('clears the whole network layer for placeholder hub kinds (b/c/d/e)', () => {
    const base = emptyLzModel();
    const m: LzModel = { ...base, network: { ...base.network, hubKind: 'hub_b', subnets: [] } };
    const g = buildGraph(m, 2);
    expect(g.nodes.some((n) => n.kind === 'vcn' || n.kind === 'subnet' || n.kind === 'gateway')).toBe(false);
    // compartments fall back to plain step-1 rows
    expect(g.nodes.find((n) => n.id === 'cmp-network')?.container).toBeUndefined();
    expect(g.nodes.find((n) => n.id === 'cmp-env-0-network')).toBeUndefined();
  });

  it('renders only step 1 content (no VCNs/subnets) while still on step 1', () => {
    const g = buildGraph(emptyLzModel(), 1);
    expect(g.nodes.some((n) => n.kind === 'vcn' || n.kind === 'subnet')).toBe(false);
    expect(g.nodes.some((n) => n.id.endsWith('-network') && n.parentId?.startsWith('cmp-env'))).toBe(false);
    // compartments are plain rows again
    expect(g.nodes.find((n) => n.id === 'cmp-network')?.container).toBeUndefined();
    expect(g.nodes.find((n) => n.id === 'cmp-env-0')?.container).toBeUndefined();
    // step 2 brings the network nesting in
    expect(buildGraph(emptyLzModel(), 2).nodes.some((n) => n.kind === 'subnet')).toBe(true);
  });

  it('shows dots only when enabled, and opens only the tables in openTables', () => {
    const all = buildRouteTables(emptyLzModel()).map((t) => t.id);
    // the route-table layer is a step-3 concern — nothing at step 2
    expect(buildGraph(emptyLzModel(), 2, { showDots: true }).nodes.some((n) => n.kind === 'rtdot')).toBe(false);
    // no dots / boxes until the layer is on
    expect(buildGraph(emptyLzModel(), 3).nodes.some((n) => n.kind === 'rtdot')).toBe(false);
    // dots on, nothing open → a dot per table, no boxes
    const dots = buildGraph(emptyLzModel(), 3, { showDots: true });
    expect(dots.nodes.filter((n) => n.kind === 'rtdot')).toHaveLength(all.length);
    expect(dots.nodes.some((n) => n.kind === 'routetable')).toBe(false);
    // open one hub table → one box, its dot marked open, a line from dot to box
    const one = buildGraph(emptyLzModel(), 3, { showDots: true, openTables: ['rt-hub-dmz'] });
    expect(one.nodes.filter((n) => n.kind === 'routetable').map((n) => n.id)).toEqual(['rt-hub-dmz']);
    expect(one.nodes.find((n) => n.id === 'dot-rt-hub-dmz')).toMatchObject({ rtDotTableId: 'rt-hub-dmz', rtDotOpen: true });
    expect(one.edges).toContainEqual(expect.objectContaining({ source: 'dot-rt-hub-dmz', target: 'rt-hub-dmz' }));
    // open all → every table renders, grouped by tone
    const rts = buildGraph(emptyLzModel(), 3, { showDots: true, openTables: all }).nodes.filter((n) => n.kind === 'routetable');
    expect(rts.filter((n) => n.rtTone === 'hub')).toHaveLength(6); // dmz, lb, internal, mgmt, mon, dns
    expect(rts.filter((n) => n.rtTone === 'gateway')).toHaveLength(3);
    expect(rts.filter((n) => n.rtTone === 'drg')).toHaveLength(4); // hub + one per spoke attachment
    expect(rts.filter((n) => n.rtTone === 'spoke')).toHaveLength(12);
  });

  it('adds VM endpoints only when the layer is on, and only to icon-less subnets', () => {
    // endpoints belong to the step-3 spoke layer
    expect(buildGraph(emptyLzModel(), 2, { showEndpoints: true }).nodes.some((n) => n.endpointName)).toBe(false);
    // off by default → no endpoints
    const off = buildGraph(emptyLzModel(), 3);
    expect(off.nodes.some((n) => n.endpointName)).toBe(false);

    const on = buildGraph(emptyLzModel(), 3, { showEndpoints: true });
    // hub mgmt subnet (index 3: fw-dmz, lb, fw-int, mgmt) gets vm-mgmt at host .10
    expect(on.nodes.find((n) => n.id === 'hub-vcn-sn-3')).toMatchObject({ endpointName: 'vm-mgmt', endpointIp: '10.0.3.10' });
    expect(on.nodes.find((n) => n.id === 'hub-vcn-sn-5')).toMatchObject({ endpointName: 'vm-dns' });
    // the firewall / load-balancer subnets (icons) stay endpoint-free
    expect(on.nodes.find((n) => n.id === 'hub-vcn-sn-0')?.endpointName).toBeUndefined(); // fw-dmz
    expect(on.nodes.find((n) => n.id === 'hub-vcn-sn-1')?.endpointName).toBeUndefined(); // lb
    expect(on.nodes.find((n) => n.id === 'hub-vcn-sn-2')?.endpointName).toBeUndefined(); // fw-int
    // every spoke subnet gets one, env-scoped for uniqueness — env0 (prod) web at 10.0.8.10
    expect(on.nodes.find((n) => n.id === 'cmp-env-0-vcn-sn-0')).toMatchObject({ endpointName: 'vm-prod-web', endpointIp: '10.0.8.10' });
    // an endpoint subnet is taller than the plain row it replaces
    const plain = off.nodes.find((n) => n.id === 'cmp-env-0-vcn-sn-0')!;
    const grown = on.nodes.find((n) => n.id === 'cmp-env-0-vcn-sn-0')!;
    expect(grown.height).toBeGreaterThan(plain.height);
  });

  it('keeps every node inside its parent bounds (endpoints on)', () => {
    const g = buildGraph(emptyLzModel(), 3, { showEndpoints: true });
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    for (const n of g.nodes) {
      if (!n.parentId) continue;
      const p = byId.get(n.parentId)!;
      expect(n.x + n.width, `${n.id} right edge in ${p.id}`).toBeLessThanOrEqual(p.width);
      expect(n.y + n.height, `${n.id} bottom edge in ${p.id}`).toBeLessThanOrEqual(p.height);
    }
  });

  it('keeps every node inside its parent bounds (route tables on)', () => {
    const all = buildRouteTables(emptyLzModel()).map((t) => t.id);
    const g = buildGraph(emptyLzModel(), 3, { showDots: true, openTables: all });
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    for (const n of g.nodes) {
      if (!n.parentId) continue;
      const p = byId.get(n.parentId)!;
      expect(n.x + n.width, `${n.id} right edge in ${p.id}`).toBeLessThanOrEqual(p.width);
      expect(n.y + n.height, `${n.id} bottom edge in ${p.id}`).toBeLessThanOrEqual(p.height);
    }
  });

  it('keeps every node inside its parent bounds', () => {
    const g = buildGraph(emptyLzModel());
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    for (const n of g.nodes) {
      if (!n.parentId) continue;
      const p = byId.get(n.parentId)!;
      expect(n.x, `${n.id} x in ${p.id}`).toBeGreaterThanOrEqual(0);
      expect(n.y, `${n.id} y in ${p.id}`).toBeGreaterThanOrEqual(0);
      expect(n.x + n.width, `${n.id} right edge in ${p.id}`).toBeLessThanOrEqual(p.width);
      expect(n.y + n.height, `${n.id} bottom edge in ${p.id}`).toBeLessThanOrEqual(p.height);
    }
  });
});
