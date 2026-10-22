import type { LzModel } from '../model/types';
import { configuredVcnCidrs } from './exadata';
import { normalizeCidr, overlaps, parseCidr } from './cidr';
import { findRegion } from './regions';

export function validateRemotePeering(model: LzModel): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const remote: string[] = [];
  const local = configuredVcnCidrs(model);
  for (const connection of model.remotePeeringConnections ?? []) {
    const name = connection.name.trim();
    const label = `X-RPC ${name || 'connection'}`;
    const segment = name.replaceAll('_', '-');
    if (!/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/.test(name) || names.has(segment)) errors.push(`${label}: use a unique lowercase connection name (hyphens and underscores are allowed).`);
    names.add(segment);
    if (!findRegion(model.foundation.realm, connection.peerRegionName)) errors.push(`${label}: choose a peer region in the same realm.`);
    if (connection.role === 'requester' && !connection.peerId?.trim()) errors.push(`${label}: enter the acceptor RPC OCID or dependency key.`);
    if (connection.role === 'requester' && connection.peerId?.startsWith('ocid1.') && !connection.peerId.startsWith('ocid1.remotepeeringconnection.')) errors.push(`${label}: the peer OCID must identify a remote peering connection.`);
    if (model.foundation.stackScope === 'regional' && connection.peerTenancyOcid?.trim()) errors.push(`${label}: regional DR supports same-tenancy peering only. Cross-tenancy IAM must be owned by a complete stack.`);
    if (connection.peerTenancyOcid?.trim() && !connection.peerTenancyOcid.startsWith('ocid1.tenancy.')) errors.push(`${label}: enter a valid peer tenancy OCID.`);
    if (connection.peerTenancyOcid?.trim() && connection.role === 'acceptor' && !connection.requestorGroupOcid?.startsWith('ocid1.group.')) errors.push(`${label}: enter the foreign requester group OCID.`);
    if (connection.requestorGroupOcid?.trim() && (!connection.peerTenancyOcid?.trim() || connection.role !== 'acceptor')) errors.push(`${label}: a foreign requester group applies only to a cross-tenancy acceptor.`);
    if (!connection.remoteCidrs.length) errors.push(`${label}: enter at least one remote VCN CIDR.`);
    for (const cidr of connection.remoteCidrs) {
      if (!parseCidr(cidr) || normalizeCidr(cidr) !== cidr) errors.push(`${label}: ${cidr || '(empty)'} must be a canonical IPv4 CIDR.`);
      else if ([...local, ...remote].some((other) => overlaps(cidr, other))) errors.push(`${label}: remote CIDR ${cidr} overlaps a local or remote network.`);
      remote.push(cidr);
    }
  }
  return errors;
}
