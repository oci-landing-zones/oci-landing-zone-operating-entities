import type { LzModel, OkePlatformParams } from '../model/types';
import { contains, hostIpInSubnet } from './cidr';
import { platformInEnv, platformSubnetsForEnv, platformVcnForEnv } from './platforms';

export interface FlowNetwork {
  name: string;
  available: boolean;
  vcnNode: string;
  attachment: string;
  cidr: string;
  oke?: OkePlatformParams;
  internetViaDrg?: boolean;
  apiOnly?: boolean;
  hubLb?: { cidr: string; node: string };
  apiEndpoint?: { cidr: string; node: string; role: string };
  subnets: { cidr: string; node: string; role: string }[];
}

/** Keep original project indices; append only OKE placements using graph resource IDs. */
export function flowNetworks(model: LzModel): FlowNetwork[] {
  const projects: FlowNetwork[] = model.environments.map((env, i) => ({
    name: env.name.trim() || `env${i + 1}`, available: env.projectNetworkEnabled !== false && !!env.network.subnets.length,
    vcnNode: `cmp-env-${i}-vcn`, attachment: `attach-cmp-env-${i}`, cidr: env.network.vcnCidr,
    subnets: env.network.subnets.map((sn, j) => ({ cidr: sn.cidr, node: `cmp-env-${i}-vcn-sn-${j}`, role: sn.name.split('-').pop() || `sn${j}` })),
  }));
  return projects.concat(model.environments.flatMap((env, i) =>
    model.platforms.filter((p) => platformInEnv(p, env.id)).flatMap((p, slot): FlowNetwork[] => {
      if (p.type !== 'oke_simple' || !p.okeParams) return [];
      const vcnNode = `cmp-env-${i}-plat-${slot}`;
      return [{ name: `${env.name.trim()}/${p.key}`, available: true, vcnNode, attachment: `attach-${vcnNode}`,
        cidr: platformVcnForEnv(p, env.id, i), oke: p.okeParams, internetViaDrg: model.network.hubKind !== 'hub_e',
        hubLb: p.okeParams.publicLoadBalancer ? model.network.subnets.flatMap((sn, j) => sn.name === 'lb' || sn.name.endsWith('-lb') ? [{ cidr: sn.cidr, node: `hub-vcn-sn-${j}` }] : [])[0] : undefined,
        apiEndpoint: platformSubnetsForEnv(p, env.id, i).flatMap((sn, j) => sn.name === 'control-plane' ? [{ cidr: sn.cidr, node: `${vcnNode}-sn-${j}`, role: 'API Server' }] : [])[0],
        subnets: platformSubnetsForEnv(p, env.id, i).flatMap((sn, j) =>
          ['workers', 'pods'].includes(sn.name) ? [{ cidr: sn.cidr, node: `${vcnNode}-sn-${j}`, role: sn.name }] : []),
      }];
    }),
  )).concat(model.platforms.some((p) => p.type === 'oke_simple') ? [{
    name: 'Hub', available: true, apiOnly: true, vcnNode: 'hub-vcn', attachment: 'attach-hub', cidr: model.network.hubVcnCidr,
    subnets: model.network.subnets.map((sn, j) => ({ cidr: sn.cidr, node: `hub-vcn-sn-${j}`, role: sn.name.split('-').pop() || `sn${j}` })),
  }] : []);
}

/** Only modelled destination subnets covered by the component's peering NSG. */
export function flowPeerTargets(source: FlowNetwork, role: string, destination: FlowNetwork) {
  const sourceSubnet = source.subnets.find((sn) => sn.role === role);
  if (!sourceSubnet || !source.oke) return [];
  return destination.subnets.filter((sn) => permitsPeer(source, role, sn.cidr)
    && (!destination.oke || permitsPeer(destination, sn.role, sourceSubnet.cidr)));
}

export function flowDestinationSubnet(source: FlowNetwork, role: string, destination: FlowNetwork) {
  const peers = flowPeerTargets(source, role, destination);
  const candidates = peers.length ? peers : destination.subnets;
  const sourceCidr = source.subnets.find((sn) => sn.role === role)?.cidr;
  return candidates.find((sn) => sn.role === role)
    ?? candidates.find((sn) => sourceCidr && permitsPeer(destination, sn.role, sourceCidr))
    ?? candidates[0];
}

function permitsPeer(network: FlowNetwork, endpoint: string, peerCidr: string): boolean {
  if (!network.oke) return true;
  const enabled = endpoint === 'pods' ? network.oke.podSpokeAccess : network.oke.workerSpokeAccess;
  return enabled === true && (network.oke.peerVcnCidrs ?? []).some((cidr) => contains(cidr, peerCidr));
}

/** Apply only explicit OKE connectivity controls; this is not a live firewall assessment. */
export function flowRoleAllowed(source: FlowNetwork, role: string, kind: string, destination?: FlowNetwork, targetRole?: string): boolean {
  if (kind === 'lb' || kind === 'lb-return') return !!source.oke?.publicLoadBalancer && !!source.hubLb && source.subnets.some((sn) => sn.role === role);
  if (kind === 'api') {
    const subnet = source.subnets.find((sn) => sn.role === role);
    if (!subnet || !destination?.apiEndpoint || !destination.oke) return false;
    if (source === destination || source.vcnNode === destination.vcnNode) return true;
    const allowed = destination.oke.apiAllowedCidrs.some((cidr) => contains(cidr, `${hostIpInSubnet(subnet.cidr, 10)}/32`));
    if (!allowed) return false;
    if (!source.oke) return true;
    const internetAccess = (role === 'pods' ? source.oke.podInternetAccess : source.oke.workerInternetAccess) !== false;
    return (internetAccess && !!source.internetViaDrg) || permitsPeer(source, role, destination.apiEndpoint.cidr);
  }
  if (source.apiOnly || destination?.apiOnly) return false;
  const internet = source.oke ? (role === 'pods' ? source.oke.podInternetAccess : source.oke.workerInternetAccess) !== false : true;
  if (kind === 'egress') return internet;
  if (kind === 'ingress') return !source.oke;
  if (kind !== 'east-west' || !destination) return true;
  const sourceSubnet = source.subnets.find((sn) => sn.role === role);
  const targetSubnet = targetRole ? destination.subnets.find((sn) => sn.role === targetRole) : flowDestinationSubnet(source, role, destination);
  if (!sourceSubnet || !targetSubnet) return false;
  // A DRG internet default can also carry peer traffic; a NAT default cannot.
  // Destination ingress is separate.
  if (source.oke && !(internet && source.internetViaDrg) && !permitsPeer(source, role, targetSubnet.cidr)) return false;
  return !destination.oke || permitsPeer(destination, targetSubnet.role, sourceSubnet.cidr);
}

export function flowPickerEnvironments(model: LzModel) {
  const networks = flowNetworks(model).filter((network) => network.available && network.subnets.length);
  return networks.filter((network) => !network.apiOnly || networks.some((target) => network.subnets.some((sn) => flowRoleAllowed(network, sn.role, 'api', target)))).map((network) => ({ name: network.name, oke: !!network.oke, apiOnly: !!network.apiOnly, apiServer: !!network.apiEndpoint, publicLb: !!network.hubLb,
    peersFor: (role: string, destination: string) => {
      const target = networks.find((n) => n.name === destination);
      return target ? flowPeerTargets(network, role, target).map((sn) => ({ role: sn.role, cidr: sn.cidr })) : [];
    }, roles: network.subnets.map((sn) => sn.role),
    rolesFor: (kind: string, destination?: string) => network.subnets.filter((sn) =>
      flowRoleAllowed(network, sn.role, kind, networks.find((n) => n.name === destination)),
    ).map((sn) => sn.role),
  }));
}
