import type { LzModel, RemotePeeringConnection } from '../model/types';
import { configuredVcnCidrs } from './exadata';
import { normalizeCidr, overlaps, parseCidr } from './cidr';
import { findRegion } from './regions';
import { platformInEnv } from './platforms';

export interface RemotePeeringIssue {
  connectionId: string;
  field: keyof RemotePeeringConnection;
  message: string;
  detail: string;
}

export function remotePeeringIssues(model: LzModel): RemotePeeringIssue[] {
  const errors: RemotePeeringIssue[] = [];
  const names = new Set<string>();
  const remote: string[] = [];
  const local = configuredVcnCidrs(model);
  const kubernetes = model.platforms.filter((platform) => platform.type === 'oke_simple'
    && model.environments.some((env) => platformInEnv(platform, env.id)))
    .flatMap((platform) => platform.okeParams ? [platform.okeParams.servicesCidr, platform.okeParams.podsCidr ?? ''] : []);
  for (const [index, connection] of (model.remotePeeringConnections ?? []).entries()) {
    const name = connection.name.trim();
    const label = `RPC connection ${index + 1}${name ? ` (${name})` : ''}`;
    const add = (field: RemotePeeringIssue['field'], message: string) => errors.push({ connectionId: connection.id, field, message: `${label}: ${message}`, detail: message.charAt(0).toUpperCase() + message.slice(1) });
    const segment = name.replaceAll('_', '-');
    if (!/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/.test(name) || names.has(segment)) add('name', 'use a unique lowercase connection name (hyphens and underscores are allowed).');
    names.add(segment);
    if (!findRegion(model.foundation.realm, connection.peerRegionName)) add('peerRegionName', 'choose a peer region in the same realm.');
    if (connection.role === 'requester' && !connection.peerId?.trim()) add('peerId', 'enter the acceptor RPC OCID or dependency key.');
    if (connection.role === 'requester' && connection.peerId?.startsWith('ocid1.') && !connection.peerId.startsWith('ocid1.remotepeeringconnection.')) add('peerId', 'the peer OCID must identify a remote peering connection.');
    if (model.foundation.stackScope === 'regional' && connection.peerTenancyOcid?.trim()) add('peerTenancyOcid', 'DR supports same-tenancy peering only. Cross-tenancy IAM must be managed in a Home Region deployment.');
    if (connection.peerTenancyOcid?.trim() && !connection.peerTenancyOcid.startsWith('ocid1.tenancy.')) add('peerTenancyOcid', 'enter a valid peer tenancy OCID.');
    if (connection.peerTenancyOcid?.trim() && connection.role === 'acceptor' && !connection.requestorGroupOcid?.startsWith('ocid1.group.')) add('requestorGroupOcid', 'enter the foreign requester group OCID.');
    if (connection.requestorGroupOcid?.trim() && (!connection.peerTenancyOcid?.trim() || connection.role !== 'acceptor')) add('requestorGroupOcid', 'a foreign requester group applies only to a cross-tenancy acceptor.');
    if (!connection.remoteCidrs.length) add('remoteCidrs', 'enter at least one remote VCN CIDR.');
    for (const cidr of connection.remoteCidrs) {
      if (!parseCidr(cidr) || normalizeCidr(cidr) !== cidr) add('remoteCidrs', `${cidr || '(empty)'} must be a canonical IPv4 CIDR.`);
      else if ([...local, ...remote].some((other) => overlaps(cidr, other))) add('remoteCidrs', `remote CIDR ${cidr} overlaps a local or remote network.`);
      else if (kubernetes.some((other) => overlaps(cidr, other))) add('remoteCidrs', `remote CIDR ${cidr} overlaps an OKE service or pod CIDR.`);
      remote.push(cidr);
    }
  }
  return errors;
}

export function validateRemotePeering(model: LzModel): string[] {
  return remotePeeringIssues(model).map((issue) => issue.message);
}
