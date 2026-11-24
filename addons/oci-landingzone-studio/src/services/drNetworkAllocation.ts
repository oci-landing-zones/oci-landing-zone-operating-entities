import type { LzModel, Subnet } from '../model/types';
import { BASE_RANGES, baseRangeOf, firstFreeBlock, overlaps, parseCidr, shiftCidr } from './cidr';
import { configuredVcnCidrs, exadataEntries } from './exadata';
import { platformEnvInstances } from './platforms';
import { remotePeeringPeerRegion } from './remotePeering';

/** Suggest private DR VCNs without moving Primary or any non-conflicting DR network. */
export function allocateDrNetworks(dr: LzModel, primary: LzModel): LzModel {
  const source = configuredVcnCidrs(dr);
  const reserved = [primary, dr].flatMap((model) => [
    ...model.platforms.flatMap((platform) => [platform.okeParams?.servicesCidr ?? '', platform.okeParams?.podsCidr ?? '']),
    ...Object.values(model.hybridConnectivity?.ipsecs ?? {}).flatMap((vpn) => vpn.remote_cidrs),
    ...Object.values(model.hybridConnectivity?.fast_connect_virtual_circuits ?? {}).flatMap((fc) => fc.remote_cidrs ?? []),
    ...(model.remotePeeringConnections ?? []).flatMap((connection) => connection.remoteCidrs),
  ]).filter(Boolean);
  const forbidden = [...configuredVcnCidrs(primary), ...reserved];
  const occupied = [...source, ...forbidden];
  const replacements = new Map<string, string>();
  for (const cidr of new Set(source)) {
    if (!forbidden.some((other) => overlaps(cidr, other))) continue;
    const block = parseCidr(cidr);
    const range = BASE_RANGES.find((entry) => entry.id === baseRangeOf(cidr));
    const replacement = block && range ? firstFreeBlock(range.cidr, occupied, block.prefix) : null;
    if (!replacement) throw new Error(`No free private range is available for DR VCN ${cidr}. Set its CIDR manually.`);
    replacements.set(cidr, replacement);
    occupied.push(replacement);
  }
  if (!replacements.size) return dr;
  const movedCidr = (cidr: string) => replacements.get(cidr) ?? cidr;
  const movedNetwork = (vcnCidr: string, subnets: Subnet[]) => {
    const target = movedCidr(vcnCidr);
    const sourceVcn = parseCidr(vcnCidr);
    const delta = (parseCidr(target)?.start ?? 0) - (sourceVcn?.start ?? 0);
    return { vcnCidr: target, subnets: subnets.map((subnet) => {
      const block = parseCidr(subnet.cidr);
      const contained = sourceVcn && block && block.start >= sourceVcn.start && block.end <= sourceVcn.end;
      return { ...subnet, cidr: delta && contained ? shiftCidr(subnet.cidr, delta) ?? subnet.cidr : subnet.cidr };
    }) };
  };
  const next = structuredClone(dr);
  const hub = movedNetwork(dr.network.hubVcnCidr, dr.network.subnets);
  next.network = { ...next.network, hubVcnCidr: hub.vcnCidr, subnets: hub.subnets };
  next.environments = dr.environments.map((env) => env.projectNetworkEnabled === false ? env : { ...env, network: movedNetwork(env.network.vcnCidr, env.network.subnets) });
  next.sharedPlatforms = dr.sharedPlatforms.map((platform) => ({ ...platform, ...movedNetwork(platform.vcnCidr, platform.subnets) }));
  next.platforms = dr.platforms.map((platform) => {
    const instances = platformEnvInstances(platform, dr.environments);
    if (!instances.some((instance) => replacements.has(instance.vcnCidr))) return platform;
    const overrides = { ...platform.overrides };
    for (const instance of instances) {
      overrides[instance.id] = { ...overrides[instance.id], ...movedNetwork(instance.vcnCidr, instance.subnets) };
    }
    return { ...platform, ...movedNetwork(platform.vcnCidr, platform.subnets), overrides };
  });
  const exacs = exadataEntries(dr);
  if (exacs.shared.exacs?.network) next.exadata.exacs.sharedVcnCidr = movedCidr(exacs.shared.exacs.network.vcn);
  for (const [id, platforms] of Object.entries(exacs.environments)) {
    if (platforms.exacs?.network) next.exadata.exacs.environmentVcnCidrs[id] = movedCidr(platforms.exacs.network.vcn);
  }
  return next;
}

/** Update a full peer-inventory route list after an explicit DR reallocation. */
export function refreshLinkedRpcCidrs(model: LzModel, previousPeer: LzModel, nextPeer: LzModel): LzModel {
  const previous = new Set(configuredVcnCidrs(previousPeer));
  let changed = false;
  const connections = model.remotePeeringConnections?.map((connection) => {
    if (connection.peerTenancyOcid?.trim() || remotePeeringPeerRegion(model, connection) !== previousPeer.foundation.region
      || connection.remoteCidrs.length !== previous.size || !connection.remoteCidrs.every((cidr) => previous.has(cidr))) return connection;
    changed = true;
    return { ...connection, remoteCidrs: [...new Set(configuredVcnCidrs(nextPeer))] };
  });
  return changed ? { ...model, remotePeeringConnections: connections } : model;
}
