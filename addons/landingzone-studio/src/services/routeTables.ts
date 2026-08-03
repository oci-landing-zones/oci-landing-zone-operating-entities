/**
 * routeTables — derives the OCI route tables for each supported landing-zone hub from the
 * canonical model. Pure: same model → same tables. The on-diagram route-table
 * boxes AND the flow-tracing engine both consume this, so what you see routed is
 * exactly what a flow traces.
 *
 * Columns follow ONTV:
 *   VCN tables  Destination | Target Type | Target | Route Type
 *   DRG tables  Dest CIDR   | Next Hop Type | Next Hop Name
 *
 * Hub B, C, and E use dedicated adapters because their packet paths differ
 * materially. The final normalization step mirrors generator ownership:
 *   Hub tables          rt-<region>-lz-hub-*
 *   DRG tables          drgrt-<region>-lz-{hub,spokes}
 *   Project VCN table   rt-<region>-lz-<env>-proj-generic
 */

import type { LzModel } from '../model/types';
import { hostIpInSubnet } from './cidr';
import { platformInEnv, platformVcnForEnv } from './platforms';
import { generatorNames } from './generatorNaming';

export type NextHopKind = 'igw' | 'natgw' | 'sgw' | 'drg' | 'firewall' | 'nlb' | 'attachment' | 'local';

export interface RouteRule {
  /** Destination column — CIDR, or a label like "OSN Services". */
  destination: string;
  /** CIDR used for longest-prefix matching; undefined for non-IP dests (OSN). */
  matchCidr?: string;
  /** ONTV "Target Type" / DRG "Next Hop Type". */
  targetType: string;
  /** ONTV "Target" / DRG "Next Hop Name". */
  target: string;
  routeType: 'Static' | 'Dynamic';
  /** Machine kind for the flow engine. */
  nextHopKind: NextHopKind;
  /** Machine target for the flow engine — node id (gateway/drg/attachment), or a firewall IP. */
  flowTarget?: string;
}

export type RouteTableKind = 'hub' | 'gateway' | 'drg' | 'spoke';

export interface RouteTable {
  id: string;
  name: string;
  kind: RouteTableKind;
  /** 'vcn' → 4-column layout, 'drg' → 3-column layout. */
  columns: 'vcn' | 'drg';
  /** Diagram node id this table governs (subnet / gateway / drg / attachment). */
  attachTo: string;
  /** Extra diagram nodes that also link to this table (e.g. mgmt/logs/dns share one). */
  attachExtra?: string[];
  rules: RouteRule[];
  note?: string;
}

const OSN = 'OSN Services';

const igw = (dest: string): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'Internet Gateway', target: 'IGW', routeType: 'Static', nextHopKind: 'igw', flowTarget: 'gw-igw' });
const nat = (dest: string, flowTarget = 'gw-natgw'): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'NAT Gateway', target: 'NGW', routeType: 'Static', nextHopKind: 'natgw', flowTarget });
const sgw = (node: string): RouteRule => ({ destination: OSN, targetType: 'Service Gateway', target: 'SGW', routeType: 'Static', nextHopKind: 'sgw', flowTarget: node });
const drg = (dest: string, routeType: 'Static' | 'Dynamic' = 'Static'): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'Dynamic Routing Gateway', target: 'DRG', routeType, nextHopKind: 'drg', flowTarget: 'drg' });
const fw = (dest: string, ip: string, name: string): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'Private IP', target: `${ip} (${name})`, routeType: 'Static', nextHopKind: 'firewall', flowTarget: ip });
const nlb = (dest: string, zone: string, node: string): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'Network Load Balancer', target: `${zone} NLB + firewalls`, routeType: 'Static', nextHopKind: 'nlb', flowTarget: node });
const attach = (dest: string, name: string, node: string): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'VCN Attachment', target: name, routeType: 'Dynamic', nextHopKind: 'attachment', flowTarget: node });

/** Hub subnet by role suffix (e.g. "-fw-dmz") → its node id + cidr. */
function hubSubnet(model: LzModel, suffix: string): { id: string; cidr: string } | null {
  const key = suffix.replace(/^-/, '');
  const i = model.network.subnets.findIndex((sn) => sn.name === key || sn.name.endsWith(suffix));
  return i >= 0 ? { id: `hub-vcn-sn-${i}`, cidr: model.network.subnets[i].cidr } : null;
}

export function buildRouteTables(model: LzModel): RouteTable[] {
  const hubTables = model.network.hubKind === 'hub_b' ? buildHubBRouteTables(model)
    : model.network.hubKind === 'hub_c' ? buildHubCRouteTables(model)
      : model.network.hubKind === 'hub_e' ? buildHubERouteTables(model)
        : buildHubARouteTables(model);
  return [...canonicalizeCoreRouteTables(model, hubTables), ...buildOcvsRouteTables(model)];
}

/** Expose the route-table resources Jsonnet emits, while retaining stable IDs for tracing. */
function canonicalizeCoreRouteTables(model: LzModel, raw: RouteTable[]): RouteTable[] {
  const region = model.foundation.regionShortName.trim() || '<region>';
  const normalized: RouteTable[] = [];

  for (const table of raw) {
    if (table.id.startsWith('rt-drg-') || table.id.startsWith('rt-ssn-')) continue;
    if (table.id === 'rt-hub-mon' || table.id === 'rt-hub-dns') continue;
    const hubSuffix = table.id.replace(/^rt-hub-/, '');
    const displaySuffix = hubSuffix === 'dmz' ? 'fw-dmz' : hubSuffix === 'internal' ? 'fw-int' : hubSuffix;
    const sharedManagementNodes = table.id === 'rt-hub-mgmt'
      ? model.network.subnets
          .map((subnet, index) => ({ subnet, index }))
          .filter(({ subnet }) => subnet.name === 'mon' || subnet.name === 'dns')
          .map(({ index }) => `hub-vcn-sn-${index}`)
      : table.attachExtra;
    normalized.push({
      ...table,
      name: table.id.startsWith('rt-hub-') ? `rt-${region}-lz-hub-${displaySuffix}` : table.name,
      ...(sharedManagementNodes && sharedManagementNodes.length > 0 ? { attachExtra: sharedManagementNodes } : {}),
    });
  }

  const hubDrg = raw.find((table) => table.id === 'rt-drg-hub');
  if (hubDrg) normalized.push({ ...hubDrg, name: `drgrt-${region}-lz-hub`, attachTo: 'drg' });

  const spokeDrg = raw.filter((table) => table.id.startsWith('rt-drg-') && table.id !== 'rt-drg-hub');
  if (spokeDrg.length > 0) normalized.push({
    ...spokeDrg[0],
    id: 'rt-drg-spokes',
    name: `drgrt-${region}-lz-spokes`,
    attachTo: 'drg',
    attachExtra: spokeDrg.map((table) => table.attachTo),
    rules: model.network.hubKind === 'hub_e' ? deduplicateRules(spokeDrg.flatMap((table) => table.rules)) : spokeDrg[0].rules,
  });

  model.environments.forEach((env, envIndex) => {
    const subnetTables = raw.filter((table) => table.id.startsWith(`rt-ssn-${envIndex}-`));
    if (subnetTables.length === 0) return;
    const envName = env.name.trim() || `env${envIndex + 1}`;
    normalized.push({
      ...subnetTables[0],
      id: `rt-ssn-${envIndex}`,
      name: `rt-${region}-lz-${envName}-proj-generic`,
      attachExtra: subnetTables.slice(1).map((table) => table.attachTo),
    });
  });

  return normalized;
}

function deduplicateRules(rules: RouteRule[]): RouteRule[] {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    const key = `${rule.destination}|${rule.nextHopKind}|${rule.flowTarget ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Hub A's dual-firewall route set. */
function buildHubARouteTables(model: LzModel): RouteTable[] {
  const region = model.foundation.regionShortName.trim() || '<region>';
  const tables: RouteTable[] = [];

  const dmz = hubSubnet(model, '-fw-dmz');
  const lb = hubSubnet(model, '-lb');
  const fwInt = hubSubnet(model, '-fw-int');
  const mgmt = hubSubnet(model, '-mgmt');
  const mon = hubSubnet(model, '-mon');
  const dns = hubSubnet(model, '-dns');
  const internalSubnets = [mgmt, mon, dns].filter((s): s is { id: string; cidr: string } => s !== null);

  const dmzIp = dmz ? hostIpInSubnet(dmz.cidr, 10) : '';
  const intIp = fwInt ? hostIpInSubnet(fwInt.cidr, 10) : '';
  const dmzName = `nfw-${region}-lz-hub-dmz`;
  const intName = `nfw-${region}-lz-hub-int`;

  const envs = model.environments.map((env, e) => ({
    e,
    name: env.name.trim() || `env${e + 1}`,
    vcnCidr: env.network.vcnCidr,
    subnets: env.network.subnets,
    attach: `attach-cmp-env-${e}`,
    attachName: generatorNames.environmentAttachment(region, env.name.trim() || `env${e + 1}`),
  }));
  const envVcnsToDrg = (): RouteRule[] => envs.map((env) => drg(env.vcnCidr));
  const envVcnsToFw = (): RouteRule[] => envs.map((env) => fw(env.vcnCidr, intIp, intName));

  // ---- hub subnet tables (VCN columns)
  if (dmz) tables.push({ id: 'rt-hub-dmz', name: `rt-${region}-hub-dmz`, kind: 'hub', columns: 'vcn', attachTo: dmz.id, rules: [igw('0.0.0.0/0')] });
  // LB → backend leg must be inspected by the INTERNAL firewall before the DRG
  // (the spoke prefixes target intIp, not the DRG directly); the INT FW then
  // forwards to the DRG via its own rt-hub-internal. Sending them straight to the
  // DRG here would bypass east-west/ingress inspection.
  if (lb) tables.push({ id: 'rt-hub-lb', name: `rt-${region}-hub-lb`, kind: 'hub', columns: 'vcn', attachTo: lb.id, rules: [fw('0.0.0.0/0', dmzIp, dmzName), ...envVcnsToFw()] });
  if (fwInt) tables.push({ id: 'rt-hub-internal', name: `rt-${region}-hub-internal`, kind: 'hub', columns: 'vcn', attachTo: fwInt.id, rules: [nat('0.0.0.0/0'), ...envVcnsToDrg()] });
  // mgmt / mon / dns each get their own (identical) management route table.
  for (const [role, sub] of [['mgmt', mgmt], ['mon', mon], ['dns', dns]] as const) {
    if (sub) tables.push({
      id: `rt-hub-${role}`, name: `rt-${region}-hub-${role}`, kind: 'hub', columns: 'vcn', attachTo: sub.id,
      rules: [fw('0.0.0.0/0', intIp, intName), ...envVcnsToDrg(), sgw('gw-sgw')],
    });
  }

  // ---- hub gateway tables (VCN columns), shown on the left
  if (lb) tables.push({ id: 'rt-hub-igw', name: `rt-${region}-hub-igw`, kind: 'gateway', columns: 'vcn', attachTo: 'gw-igw', rules: [fw(lb.cidr, dmzIp, dmzName)] });
  tables.push({
    id: 'rt-hub-natgw', name: `rt-${region}-hub-natgw`, kind: 'gateway', columns: 'vcn', attachTo: 'gw-natgw',
    rules: [...internalSubnets.map((s) => fw(s.cidr, intIp, intName)), ...envVcnsToFw()],
  });
  tables.push({
    id: 'rt-hub-ingress', name: `rt-${region}-hub-ingress`, kind: 'gateway', columns: 'vcn', attachTo: 'attach-hub',
    rules: [fw('0.0.0.0/0', intIp, intName), ...envVcnsToFw()],
  });

  // ---- DRG route tables — one per VCN attachment (DRG columns). The hub
  // attachment imports every spoke prefix; each spoke attachment defaults to the
  // hub attachment.
  tables.push({
    id: 'rt-drg-hub', name: `rt-${region}-drg-hub`, kind: 'drg', columns: 'drg', attachTo: 'attach-hub',
    note: 'Dynamic route rules: enabled · Import route distribution',
    rules: envs.flatMap((env) => env.subnets.map((sn) => attach(sn.cidr, env.attachName, env.attach))),
  });
  for (const env of envs) {
    tables.push({
      id: `rt-drg-${env.name}`, name: `rt-${region}-drg-${env.name}`, kind: 'drg', columns: 'drg', attachTo: env.attach,
      rules: [attach('0.0.0.0/0', generatorNames.hubAttachment(region), 'attach-hub')],
    });
  }

  // ---- spoke subnet tables (VCN columns), one per spoke subnet
  for (const env of envs) {
    env.subnets.forEach((sn, i) => {
      const role = sn.name.split('-').pop() || `sn${i}`;
      tables.push({
        id: `rt-ssn-${env.e}-${i}`, name: `rt-${region}-ssn-${env.name}-${role}`, kind: 'spoke', columns: 'vcn',
        attachTo: `cmp-env-${env.e}-vcn-sn-${i}`,
        rules: [drg('0.0.0.0/0'), sgw(`cmp-env-${env.e}-sgw`)],
      });
    });
  }

  return tables;
}

/** OCVS owns the provisioning subnet route table; its VLAN tables are consumed by OCVS itself. */
function buildOcvsRouteTables(model: LzModel): RouteTable[] {
  const region = model.foundation.regionShortName.trim() || '<region>';
  const routedVcns = [
    ...model.environments.map((env) => env.network.vcnCidr),
    ...model.platforms.flatMap((platform) => model.environments.flatMap((env, index) =>
      platformInEnv(platform, env.id) ? [platformVcnForEnv(platform, env.id, index)] : [],
    )),
    ...model.sharedPlatforms.map((platform) => platform.vcnCidr),
  ];
  const tables: RouteTable[] = [];
  model.platforms.forEach((platform) => {
    if (platform.type !== 'ocvs') return;
    model.environments.forEach((env, envIndex) => {
      if (!platformInEnv(platform, env.id)) return;
      const slot = model.platforms.filter((candidate) => platformInEnv(candidate, env.id)).indexOf(platform);
      const vcn = platformVcnForEnv(platform, env.id, envIndex);
      const peers = routedVcns.filter((cidr) => cidr !== vcn).map((cidr) => drg(cidr));
      tables.push({
        id: `rt-ocvs-${envIndex}-${slot}-provisioning`,
        name: `rt-${region}-lz-${env.name.trim() || `env${envIndex + 1}`}-${platform.key.trim() || 'ocv'}-provisioning`,
        kind: 'spoke',
        columns: 'vcn',
        attachTo: `cmp-env-${envIndex}-plat-${slot}-sn-0`,
        note: 'OCVS provisioning subnet. VLAN route tables and NSGs are supplied to the OCVS module.',
        rules: [sgw(`cmp-env-${envIndex}-plat-${slot}-sgw`), drg(model.network.hubVcnCidr), ...peers],
      });
    });
  });
  model.sharedPlatforms.forEach((platform, sharedIndex) => {
    if (platform.type !== 'ocvs') return;
    const vcn = platform.vcnCidr;
    tables.push({
      id: `rt-ocvs-shared-${sharedIndex}-provisioning`,
      name: `rt-${region}-lz-shared-${platform.key.trim() || 'ocv'}-provisioning`,
      kind: 'spoke',
      columns: 'vcn',
      attachTo: `shared-plat-vcn-${sharedIndex}-sn-0`,
      note: 'OCVS provisioning subnet. VLAN route tables and NSGs are supplied to the OCVS module.',
      rules: [sgw(`shared-plat-sgw-${sharedIndex}`), drg(model.network.hubVcnCidr), ...routedVcns.filter((cidr) => cidr !== vcn).map((cidr) => drg(cidr))],
    });
  });
  return tables;
}

/** Hub B's final routing phase: one OCI Network Firewall fronts every routed path. */
function buildHubBRouteTables(model: LzModel): RouteTable[] {
  const region = model.foundation.regionShortName.trim() || '<region>';
  const lb = hubSubnet(model, '-lb');
  const firewall = hubSubnet(model, '-fw');
  const mgmt = hubSubnet(model, '-mgmt');
  const mon = hubSubnet(model, '-mon');
  const dns = hubSubnet(model, '-dns');
  const firewallIp = firewall ? hostIpInSubnet(firewall.cidr, 10) : '';
  const firewallName = `nfw-${region}-lz-hub`;
  const envs = model.environments.map((env, e) => ({
    e,
    name: env.name.trim() || `env${e + 1}`,
    vcnCidr: env.network.vcnCidr,
    subnets: env.network.subnets,
    attach: `attach-cmp-env-${e}`,
    attachName: generatorNames.environmentAttachment(region, env.name.trim() || `env${e + 1}`),
  }));
  const toDrg = () => envs.map((env) => drg(env.vcnCidr));
  const toFirewall = () => envs.map((env) => fw(env.vcnCidr, firewallIp, firewallName));
  const finalNote = 'Final routing phase — OCI Network Firewall private-IP OCID required';
  const tables: RouteTable[] = [];

  // In network_pre the firewall and management tables use DRG routes. The final
  // output adds the firewall private-IP routes below; these are the routes a
  // deployed Hub B uses once the NFW exists.
  if (firewall) tables.push({
    id: 'rt-hub-fw', name: `rt-${region}-hub-fw`, kind: 'hub', columns: 'vcn', attachTo: firewall.id,
    rules: [nat('0.0.0.0/0'), ...toDrg()],
  });
  if (lb) tables.push({
    id: 'rt-hub-lb', name: `rt-${region}-hub-lb`, kind: 'hub', columns: 'vcn', attachTo: lb.id,
    note: finalNote, rules: [igw('0.0.0.0/0'), ...toFirewall()],
  });
  if (mgmt) tables.push({
    id: 'rt-hub-mgmt', name: `rt-${region}-hub-mgmt`, kind: 'hub', columns: 'vcn', attachTo: mgmt.id,
    note: finalNote, rules: [fw('0.0.0.0/0', firewallIp, firewallName), ...toDrg(), sgw('gw-sgw')],
  });
  tables.push({
    id: 'rt-hub-ingress', name: `rt-${region}-hub-ingress`, kind: 'gateway', columns: 'vcn', attachTo: 'attach-hub',
    note: finalNote,
    rules: [fw('0.0.0.0/0', firewallIp, firewallName), ...(lb ? [fw(lb.cidr, firewallIp, firewallName)] : []), ...toFirewall()],
  });
  tables.push({
    id: 'rt-hub-natgw', name: `rt-${region}-hub-natgw`, kind: 'gateway', columns: 'vcn', attachTo: 'gw-natgw',
    note: finalNote,
    rules: [mgmt, mon, dns].filter((s): s is { id: string; cidr: string } => s !== null).map((s) => fw(s.cidr, firewallIp, firewallName)),
  });

  tables.push({
    id: 'rt-drg-hub', name: `rt-${region}-drg-hub`, kind: 'drg', columns: 'drg', attachTo: 'attach-hub',
    note: 'Dynamic route rules: enabled · import route distribution',
    rules: envs.flatMap((env) => env.subnets.map((sn) => attach(sn.cidr, env.attachName, env.attach))),
  });
  for (const env of envs) {
    tables.push({
      id: `rt-drg-${env.name}`, name: `rt-${region}-drg-${env.name}`, kind: 'drg', columns: 'drg', attachTo: env.attach,
      rules: [attach('0.0.0.0/0', generatorNames.hubAttachment(region), 'attach-hub')],
    });
    env.subnets.forEach((sn, i) => {
      const role = sn.name.split('-').pop() || `sn${i}`;
      tables.push({
        id: `rt-ssn-${env.e}-${i}`, name: `rt-${region}-ssn-${env.name}-${role}`, kind: 'spoke', columns: 'vcn',
        attachTo: `cmp-env-${env.e}-vcn-sn-${i}`,
        rules: [drg('0.0.0.0/0'), sgw(`cmp-env-${env.e}-sgw`)],
      });
    });
  }
  return tables;
}

/** Hub C's final third-party-firewall topology, fronted by trust and untrust NLBs. */
function buildHubCRouteTables(model: LzModel): RouteTable[] {
  const region = model.foundation.regionShortName.trim() || '<region>';
  const untrust = hubSubnet(model, '-untrust');
  const trust = hubSubnet(model, '-trust');
  const lb = hubSubnet(model, '-lb');
  const mgmt = hubSubnet(model, '-mgmt');
  const envs = model.environments.map((env, e) => ({
    e,
    name: env.name.trim() || `env${e + 1}`,
    vcnCidr: env.network.vcnCidr,
    subnets: env.network.subnets,
    attach: `attach-cmp-env-${e}`,
    attachName: generatorNames.environmentAttachment(region, env.name.trim() || `env${e + 1}`),
  }));
  const toDrg = () => envs.map((env) => drg(env.vcnCidr));
  const trustNlb = (dest: string) => trust ? nlb(dest, 'Trust', trust.id) : drg(dest);
  const untrustNlb = (dest: string) => untrust ? nlb(dest, 'Untrust', untrust.id) : igw(dest);
  const finalNote = 'Final routing phase — replace Trust/Untrust NLB private-IP OCID placeholders in network_backends.json';
  const tables: RouteTable[] = [];

  // network_pre establishes the DRG routes; network.json adds the NLB private-IP
  // routes. The external firewall backend placeholders remain generator-owned in
  // the separate network_backends.json output.
  if (untrust) tables.push({
    id: 'rt-hub-untrust', name: `rt-${region}-hub-untrust`, kind: 'hub', columns: 'vcn', attachTo: untrust.id,
    rules: [igw('0.0.0.0/0')],
  });
  if (trust) tables.push({
    id: 'rt-hub-trust', name: `rt-${region}-hub-trust`, kind: 'hub', columns: 'vcn', attachTo: trust.id,
    rules: toDrg(),
  });
  if (lb) tables.push({
    id: 'rt-hub-lb', name: `rt-${region}-hub-lb`, kind: 'hub', columns: 'vcn', attachTo: lb.id,
    note: finalNote, rules: [untrustNlb('0.0.0.0/0'), ...toDrg()],
  });
  if (mgmt) tables.push({
    id: 'rt-hub-mgmt', name: `rt-${region}-hub-mgmt`, kind: 'hub', columns: 'vcn', attachTo: mgmt.id,
    note: finalNote, rules: [trustNlb('0.0.0.0/0'), ...toDrg(), sgw('gw-sgw')],
  });
  if (lb) tables.push({
    id: 'rt-hub-igw', name: `rt-${region}-hub-igw`, kind: 'gateway', columns: 'vcn', attachTo: 'gw-igw',
    note: finalNote, rules: [untrustNlb(lb.cidr)],
  });
  tables.push({
    id: 'rt-hub-ingress', name: `rt-${region}-hub-ingress`, kind: 'gateway', columns: 'vcn', attachTo: 'attach-hub',
    note: finalNote, rules: [trustNlb('0.0.0.0/0'), ...envs.map((env) => trustNlb(env.vcnCidr))],
  });

  tables.push({
    id: 'rt-drg-hub', name: `rt-${region}-drg-hub`, kind: 'drg', columns: 'drg', attachTo: 'attach-hub',
    note: 'Dynamic route rules: enabled · import route distribution',
    rules: envs.flatMap((env) => env.subnets.map((sn) => attach(sn.cidr, env.attachName, env.attach))),
  });
  for (const env of envs) {
    tables.push({
      id: `rt-drg-${env.name}`, name: `rt-${region}-drg-${env.name}`, kind: 'drg', columns: 'drg', attachTo: env.attach,
      rules: [attach('0.0.0.0/0', generatorNames.hubAttachment(region), 'attach-hub')],
    });
    env.subnets.forEach((sn, i) => {
      const role = sn.name.split('-').pop() || `sn${i}`;
      tables.push({
        id: `rt-ssn-${env.e}-${i}`, name: `rt-${region}-ssn-${env.name}-${role}`, kind: 'spoke', columns: 'vcn',
        attachTo: `cmp-env-${env.e}-vcn-sn-${i}`, rules: [drg('0.0.0.0/0'), sgw(`cmp-env-${env.e}-sgw`)],
      });
    });
  }
  return tables;
}

/**
 * Hub E is intentionally not a reduced Hub A: it routes directly through the
 * DRG and gives each spoke its own NAT gateway. Keep its tables separate so the
 * diagram and packet tracer never suggest firewall inspection that the emitted
 * config does not create.
 */
function buildHubERouteTables(model: LzModel): RouteTable[] {
  const region = model.foundation.regionShortName.trim() || '<region>';
  const lb = hubSubnet(model, '-lb');
  const mgmt = hubSubnet(model, '-mgmt');
  const envs = model.environments.map((env, e) => ({
    e,
    name: env.name.trim() || `env${e + 1}`,
    vcnCidr: env.network.vcnCidr,
    subnets: env.network.subnets,
    attach: `attach-cmp-env-${e}`,
    attachName: generatorNames.environmentAttachment(region, env.name.trim() || `env${e + 1}`),
  }));
  const hubCidr = model.network.hubVcnCidr;
  const envVcns = envs.map((env) => drg(env.vcnCidr));
  const tables: RouteTable[] = [];

  // Hub E's LB publishes through the IGW and sends backend traffic straight to
  // the selected spoke over the DRG. Management uses the hub NAT gateway.
  if (lb) tables.push({
    id: 'rt-hub-lb', name: `rt-${region}-hub-lb`, kind: 'hub', columns: 'vcn', attachTo: lb.id,
    rules: [igw('0.0.0.0/0'), ...envVcns],
  });
  if (mgmt) tables.push({
    id: 'rt-hub-mgmt', name: `rt-${region}-hub-mgmt`, kind: 'hub', columns: 'vcn', attachTo: mgmt.id,
    rules: [nat('0.0.0.0/0'), ...envVcns, sgw('gw-sgw')],
  });

  // The Hub attachment distributes each destination spoke subnet. Every spoke
  // attachment can route directly to every other spoke (and the hub) through
  // the DRG; no firewall hairpin is present in Hub E.
  tables.push({
    id: 'rt-drg-hub', name: `rt-${region}-drg-hub`, kind: 'drg', columns: 'drg', attachTo: 'attach-hub',
    note: 'Dynamic route rules: enabled · direct spoke distribution',
    rules: envs.flatMap((env) => env.subnets.map((sn) => attach(sn.cidr, env.attachName, env.attach))),
  });
  for (const env of envs) {
    const routes = [attach(hubCidr, generatorNames.hubAttachment(region), 'attach-hub')];
    for (const peer of envs) {
      if (peer.e !== env.e) routes.push(...peer.subnets.map((sn) => attach(sn.cidr, peer.attachName, peer.attach)));
    }
    tables.push({
      id: `rt-drg-${env.name}`, name: `rt-${region}-drg-${env.name}`, kind: 'drg', columns: 'drg', attachTo: env.attach,
      note: 'Dynamic route rules: enabled · direct spoke distribution', rules: routes,
    });
  }

  for (const env of envs) {
    const peerVcns = envs.filter((peer) => peer.e !== env.e).map((peer) => drg(peer.vcnCidr));
    env.subnets.forEach((sn, i) => {
      const role = sn.name.split('-').pop() || `sn${i}`;
      tables.push({
        id: `rt-ssn-${env.e}-${i}`, name: `rt-${region}-ssn-${env.name}-${role}`, kind: 'spoke', columns: 'vcn',
        attachTo: `cmp-env-${env.e}-vcn-sn-${i}`,
        rules: [nat('0.0.0.0/0', `cmp-env-${env.e}-natgw`), drg(hubCidr), ...peerVcns, sgw(`cmp-env-${env.e}-sgw`)],
      });
    });
  }
  return tables;
}
