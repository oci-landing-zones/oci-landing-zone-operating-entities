/**
 * routeTables — derives the OCI route tables for the Hub A landing zone from the
 * canonical model. Pure: same model → same tables. The on-diagram route-table
 * boxes AND the flow-tracing engine both consume this, so what you see routed is
 * exactly what a flow traces.
 *
 * Columns follow ONTV:
 *   VCN tables  Destination | Target Type | Target | Route Type
 *   DRG tables  Dest CIDR   | Next Hop Type | Next Hop Name
 *
 * The set mirrors the reference Hub A topology:
 *   Hub subnet tables   rt-<region>-hub-{dmz,lb,internal,mgmt}
 *   Hub gateway tables  rt-<region>-hub-{igw,natgw,ingress}
 *   DRG tables          rt-<region>-drg-{hub,spokes}
 *   Spoke subnet tables rt-<region>-ssn-<env>-<role>   (one per spoke subnet)
 */

import type { LzModel } from '../model/types';
import { resolveHubName } from './hubKinds';
import { hostIpInSubnet } from './cidr';

export type NextHopKind = 'igw' | 'natgw' | 'sgw' | 'drg' | 'firewall' | 'attachment' | 'local';

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
const nat = (dest: string): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'NAT Gateway', target: 'NGW', routeType: 'Static', nextHopKind: 'natgw', flowTarget: 'gw-natgw' });
const sgw = (node: string): RouteRule => ({ destination: OSN, targetType: 'Service Gateway', target: 'SGW', routeType: 'Static', nextHopKind: 'sgw', flowTarget: node });
const drg = (dest: string, routeType: 'Static' | 'Dynamic' = 'Static'): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'Dynamic Routing Gateway', target: 'DRG', routeType, nextHopKind: 'drg', flowTarget: 'drg' });
const fw = (dest: string, ip: string, name: string): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'Private IP', target: `${ip} (${name})`, routeType: 'Static', nextHopKind: 'firewall', flowTarget: ip });
const attach = (dest: string, name: string, node: string): RouteRule => ({ destination: dest, matchCidr: dest, targetType: 'VCN Attachment', target: name, routeType: 'Dynamic', nextHopKind: 'attachment', flowTarget: node });

/** Effective firewall IP — stored value, or one derived from its subnet. */
function fwIp(stored: string, subnetCidr: string): string {
  return (stored || '').trim() || hostIpInSubnet(subnetCidr);
}

/** Hub subnet by role suffix (e.g. "-fw-dmz") → its node id + cidr. */
function hubSubnet(model: LzModel, suffix: string): { id: string; cidr: string } | null {
  const i = model.network.subnets.findIndex((sn) => sn.name.endsWith(suffix));
  return i >= 0 ? { id: `hub-vcn-sn-${i}`, cidr: model.network.subnets[i].cidr } : null;
}

export function buildRouteTables(model: LzModel): RouteTable[] {
  const region = model.foundation.regionShortName.trim() || '<region>';
  const tables: RouteTable[] = [];

  const dmz = hubSubnet(model, '-fw-dmz');
  const lb = hubSubnet(model, '-lb');
  const fwInt = hubSubnet(model, '-fw-int');
  const mgmt = hubSubnet(model, '-mgmt');
  const mon = hubSubnet(model, '-mon');
  const dns = hubSubnet(model, '-dns');
  const internalSubnets = [mgmt, mon, dns].filter((s): s is { id: string; cidr: string } => s !== null);

  const dmzIp = dmz ? fwIp(model.network.fwDmzIp, dmz.cidr) : '';
  const intIp = fwInt ? fwIp(model.network.fwIntIp, fwInt.cidr) : '';
  const dmzName = `nfw-${region}-hub-dmz`;
  const intName = `nfw-${region}-hub-int`;

  const envs = model.environments.map((env, e) => ({
    e,
    name: env.name.trim() || `env${e + 1}`,
    vcnCidr: env.network.vcnCidr,
    subnets: env.network.subnets,
    attach: `attach-cmp-env-${e}`,
    attachName: `${resolveHubName(env.network.routing.attachmentName, { region, lze: model.presentation.landingZone, env: env.name.trim() || `env${e + 1}` })}ment`,
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
      rules: [attach('0.0.0.0/0', 'vcn-hub-attach', 'attach-hub')],
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
