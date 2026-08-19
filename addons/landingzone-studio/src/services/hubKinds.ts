/**
 * Hub kinds — the hub network deployment options. Each kind has its own
 * description and its own generator-contract CIDR and subnet keys. Selecting a
 * kind resets those values to that kind's defaults.
 *
 * Each Jsonnet-supported hub has a Studio form and structural diagram. Packet
 * tracing is enabled only where an equivalent derived route adapter exists.
 */

import type { HubKind, Subnet } from '../model/types';

export interface HubKindDef {
  id: HubKind;
  label: string;
  description: string;
  /** Whether the Studio form and structural network diagram are available. */
  implemented: boolean;
  defaultVcnCidr: string;
  defaultSubnets: { name: string; cidr: string }[];
}

export const HUB_KINDS: HubKindDef[] = [
  {
    id: 'hub_a',
    label: 'Hub A',
    description:
      'Two OCI Network Firewalls separate inbound inspection from outbound and east-west inspection. Choose this when stronger traffic isolation justifies the additional firewall cost.',
    implemented: true,
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [
      { name: 'fw-dmz', cidr: '10.0.0.0/24' },
      { name: 'lb', cidr: '10.0.1.0/24' },
      { name: 'fw-int', cidr: '10.0.2.0/24' },
      { name: 'mgmt', cidr: '10.0.3.0/24' },
      { name: 'mon', cidr: '10.0.4.0/24' },
      { name: 'dns', cidr: '10.0.5.0/24' },
    ],
  },
  {
    id: 'hub_b',
    label: 'Hub B',
    description: 'One OCI Network Firewall inspects inbound, outbound, and east-west traffic. This reduces cost while keeping centralized inspection.',
    implemented: true,
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [
      { name: 'lb', cidr: '10.0.0.0/24' },
      { name: 'fw', cidr: '10.0.1.0/24' },
      { name: 'mgmt', cidr: '10.0.2.0/24' },
      { name: 'mon', cidr: '10.0.3.0/24' },
      { name: 'dns', cidr: '10.0.4.0/24' },
    ],
  },
  {
    id: 'hub_c',
    label: 'Hub C',
    description: 'Third-party firewalls sit behind trust and untrust Network Load Balancers. After the first deployment phase, provide the private IP identifiers needed to complete routing.',
    implemented: true,
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [
      { name: 'untrust', cidr: '10.0.0.0/24' },
      { name: 'trust', cidr: '10.0.1.0/24' },
      { name: 'lb', cidr: '10.0.2.0/24' },
      { name: 'mgmt', cidr: '10.0.3.0/24' },
      { name: 'mon', cidr: '10.0.4.0/24' },
      { name: 'dns', cidr: '10.0.5.0/24' },
    ],
  },
  {
    id: 'hub_e',
    label: 'Hub E',
    description: 'No firewall is deployed. Traffic routes directly through the DRG; use this only when the reduced cost and simplicity are worth giving up centralized inspection.',
    implemented: true,
    defaultVcnCidr: '10.0.0.0/21',
    defaultSubnets: [
      { name: 'lb', cidr: '10.0.0.0/24' },
      { name: 'mgmt', cidr: '10.0.1.0/24' },
      { name: 'mon', cidr: '10.0.2.0/24' },
      { name: 'dns', cidr: '10.0.3.0/24' },
    ],
  },
];

export function getHubKind(id: HubKind): HubKindDef | undefined {
  return HUB_KINDS.find((k) => k.id === id);
}

/** Default VCN CIDR + config-keyed subnets for a hub kind. */
export function hubKindDefaults(id: HubKind): { hubVcnCidr: string; subnets: Subnet[] } {
  const def = getHubKind(id) ?? HUB_KINDS[0];
  return {
    hubVcnCidr: def.defaultVcnCidr,
    subnets: def.defaultSubnets.map((sn) => ({ ...sn })),
  };
}
