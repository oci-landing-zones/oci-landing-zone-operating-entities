/**
 * Hub kinds — the hub network deployment options. Each kind has its own
 * description and its own set of default subnets (and a default VCN name +
 * CIDR). Selecting a kind resets the network names/subnets to that kind's
 * defaults.
 *
 * Default names are templates carrying <region> and <lze> tokens; they stay
 * dynamic — resolveHubName() substitutes the live Step 1 values (region short
 * name, landing-zone name) wherever the name is displayed or exported.
 *
 * Focus for now is hub_a (fully defined). hub_b / hub_c / hub_e are placeholders
 * to be specified later.
 */

import type { HubKind, Subnet } from '../model/types';

export interface HubKindDef {
  id: HubKind;
  label: string;
  description: string;
  /** Fully specified hub kinds render their network in the diagram; placeholders don't yet. */
  implemented: boolean;
  defaultVcnName: string;
  defaultVcnCidr: string;
  defaultSubnets: { name: string; cidr: string }[];
}

export const HUB_KINDS: HubKindDef[] = [
  {
    id: 'hub_a',
    label: 'Hub A',
    description:
      'Hub A is a 2 OCI Network Firewall deployment — one for north-south and one for east-west traffic. Both firewalls are HA.',
    implemented: true,
    defaultVcnName: 'vcn-<region>-<lze>-hub',
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [
      { name: 'sn-<region>-<lze>-hub-fw-dmz', cidr: '10.0.0.0/24' },
      { name: 'sn-<region>-<lze>-hub-lb', cidr: '10.0.1.0/24' },
      { name: 'sn-<region>-<lze>-hub-fw-int', cidr: '10.0.2.0/24' },
      { name: 'sn-<region>-<lze>-hub-mgmt', cidr: '10.0.3.0/24' },
      { name: 'sn-<region>-<lze>-hub-mon', cidr: '10.0.4.0/24' },
      { name: 'sn-<region>-<lze>-hub-dns', cidr: '10.0.5.0/24' },
    ],
  },
  {
    id: 'hub_b',
    label: 'Hub B',
    description: 'Hub B — alternative hub deployment option. To be defined.',
    implemented: false,
    defaultVcnName: 'vcn-<region>-<lze>-hub',
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [],
  },
  {
    id: 'hub_c',
    label: 'Hub C',
    description: 'Hub C — alternative hub deployment option. To be defined.',
    implemented: false,
    defaultVcnName: 'vcn-<region>-<lze>-hub',
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [],
  },
  {
    id: 'hub_d',
    label: 'Hub D',
    description: 'Hub D — alternative hub deployment option. To be defined.',
    implemented: false,
    defaultVcnName: 'vcn-<region>-<lze>-hub',
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [],
  },
  {
    id: 'hub_e',
    label: 'Hub E',
    description: 'Hub E — alternative hub deployment option. To be defined.',
    implemented: false,
    defaultVcnName: 'vcn-<region>-<lze>-hub',
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [],
  },
];

export function getHubKind(id: HubKind): HubKindDef | undefined {
  return HUB_KINDS.find((k) => k.id === id);
}

/** Default VCN name + CIDR + subnets for a hub kind. */
export function hubKindDefaults(id: HubKind): { hubVcnName: string; hubVcnCidr: string; subnets: Subnet[] } {
  const def = getHubKind(id) ?? HUB_KINDS[0];
  return {
    hubVcnName: def.defaultVcnName,
    hubVcnCidr: def.defaultVcnCidr,
    subnets: def.defaultSubnets.map((sn) => ({ ...sn })),
  };
}

/**
 * Substitute the <region> / <lze> / <env> tokens in a name template with the
 * live wizard values. Tokens stay literal while their value is still empty,
 * so the user can see what's missing.
 */
export function resolveHubName(template: string, ctx: { region?: string; lze?: string; env?: string }): string {
  let out = template;
  if (ctx.region) out = out.replaceAll('<region>', ctx.region);
  if (ctx.lze) out = out.replaceAll('<lze>', ctx.lze);
  if (ctx.env) out = out.replaceAll('<env>', ctx.env);
  return out;
}
