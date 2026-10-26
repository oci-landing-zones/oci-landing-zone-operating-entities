import type { LzModel } from '../model/types';
import { exadataDiagramPlatforms } from './exadata';
import { displayName, generatorNames } from './generatorNaming';
import { platformInEnv, platformSubnetsForEnv } from './platforms';

export type NextHopKind = 'igw' | 'natgw' | 'sgw' | 'drg' | 'firewall' | 'nlb' | 'attachment' | 'local' | 'unresolved';
export type RouteProvenance = 'configured' | 'derived-import' | 'expected-remote';

export interface RouteRule {
  id: string;
  provenance: RouteProvenance;
  destination: string;
  matchCidr?: string;
  targetType: string;
  target: string;
  routeType: 'Static' | 'Dynamic';
  nextHopKind: NextHopKind;
  flowTarget?: string;
  targetKey?: string;
  targetNodeId?: string;
  sourceAttachmentKey?: string;
  importPriority?: number;
}

export type RouteTableKind = 'hub' | 'gateway' | 'drg' | 'spoke';
export interface RouteAssociation {
  nodeId: string;
  kind: 'subnet' | 'gateway' | 'vcn-ingress' | 'drg-attachment' | 'rpc-attachment';
}
export interface RouteTable {
  id: string;
  sourceKey: string;
  name: string;
  kind: RouteTableKind;
  columns: 'vcn' | 'drg';
  associations: RouteAssociation[];
  attachTo?: string;
  attachExtra?: string[];
  rules: RouteRule[];
  importDistributionKey?: string;
  note?: string;
}

type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {};
const entries = (value: unknown): [string, Obj][] => Object.entries(object(value)).map(([key, child]) => [key, object(child)]);
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
type ResourceKind = 'vcn' | 'subnet' | 'igw' | 'natgw' | 'sgw' | 'drg' | 'attachment' | 'rpc' | 'firewall' | 'nlb' | 'table' | 'drg-table' | 'distribution';
interface Resource { key: string; kind: ResourceKind; data: Obj; vcnKey?: string; drgKey?: string }

/** Routing policy comes exclusively from the evaluated Blueprint Factory network. */
export function buildRouteTables(source: LzModel, network: unknown): RouteTable[] {
  const root = object(network);
  if (!root.network_configuration) throw new Error('The generated network configuration is unavailable.');
  const resources = new Map<string, Resource>();
  const add = (collection: unknown, kind: ResourceKind, context: { vcnKey?: string; drgKey?: string } = {}) => {
    for (const [key, data] of entries(collection)) resources.set(key, { key, kind, data, ...context });
  };
  for (const [, category] of entries(object(root.network_configuration).network_configuration_categories)) {
    for (const [key, vcn] of entries(category.vcns)) {
      resources.set(key, { key, kind: 'vcn', data: vcn });
      add(vcn.subnets, 'subnet', { vcnKey: key });
      add(vcn.route_tables, 'table', { vcnKey: key });
      const gateways = object(vcn.vcn_specific_gateways);
      add(gateways.internet_gateways, 'igw', { vcnKey: key });
      add(gateways.nat_gateways, 'natgw', { vcnKey: key });
      add(gateways.service_gateways, 'sgw', { vcnKey: key });
    }
    const nonVcn = object(category.non_vcn_specific_gateways);
    for (const [key, drg] of entries(nonVcn.dynamic_routing_gateways)) {
      resources.set(key, { key, kind: 'drg', data: drg });
      add(drg.drg_attachments, 'attachment', { drgKey: key });
      add(drg.drg_route_tables, 'drg-table', { drgKey: key });
      add(drg.drg_route_distributions, 'distribution', { drgKey: key });
      add(drg.remote_peering_connections, 'rpc', { drgKey: key });
    }
    add(object(nonVcn.network_firewalls_configuration).network_firewalls, 'firewall');
  }
  add(object(root.nlb_configuration).nlbs, 'nlb');

  // Bind generated resource names to existing diagram identities, without deriving routes.
  const exadata = exadataDiagramPlatforms(source);
  const model = { ...source, platforms: [...source.platforms, ...exadata.platforms], sharedPlatforms: [...source.sharedPlatforms, ...exadata.sharedPlatforms] };
  const region = model.foundation.regionShortName;
  const names = new Map<string, string>();
  const name = (value: string, nodeId: string) => names.set(value.toLowerCase(), nodeId);
  name(generatorNames.hubVcn(region), 'hub-vcn');
  name(generatorNames.hubDrg(region), 'drg');
  name(generatorNames.hubAttachment(region), 'attach-hub');
  for (const [type, suffix] of [['igw', 'igw'], ['ngw', 'natgw'], ['sgw', 'sgw']] as const) name(generatorNames.hubGateway(region, type), 'gw-' + suffix);
  model.network.subnets.forEach((subnet, index) => name(generatorNames.hubSubnet(region, subnet.name), 'hub-vcn-sn-' + index));
  model.environments.forEach((env, envIndex) => {
    const envNode = 'cmp-env-' + envIndex;
    if (env.projectNetworkEnabled !== false) {
      name(generatorNames.environmentVcn(region, env.name), envNode + '-vcn');
      name(generatorNames.environmentAttachment(region, env.name), 'attach-' + envNode);
      name(generatorNames.environmentGateway(region, env.name, 'ngw'), envNode + '-natgw');
      name(generatorNames.environmentGateway(region, env.name, 'sgw'), envNode + '-sgw');
      env.network.subnets.forEach((subnet, index) => name(generatorNames.environmentSubnet(region, env.name, subnet.name), envNode + '-vcn-sn-' + index));
    }
    model.platforms.filter((platform) => platformInEnv(platform, env.id)).forEach((platform, slot) => {
      const node = envNode + '-plat-' + slot;
      name(generatorNames.environmentPlatformVcn(region, env.name, platform.key), node);
      name(generatorNames.environmentPlatformAttachment(region, env.name, platform.key), 'attach-' + node);
      name(generatorNames.environmentPlatformGateway(region, env.name, platform.key, 'ngw'), node + '-natgw');
      name(generatorNames.environmentPlatformGateway(region, env.name, platform.key, 'sgw'), node + '-sgw');
      platformSubnetsForEnv(platform, env.id, envIndex).forEach((subnet, index) => name(generatorNames.environmentPlatformSubnet(region, env.name, platform.key, subnet.name, platform.type), node + '-sn-' + index));
    });
  });
  model.sharedPlatforms.forEach((platform, index) => {
    name(generatorNames.sharedPlatformVcn(region, platform.key), 'shared-plat-vcn-' + index);
    name(generatorNames.sharedPlatformAttachment(region, platform.key), 'attach-shared-' + index);
    name(generatorNames.sharedPlatformGateway(region, platform.key, 'ngw'), 'shared-plat-natgw-' + index);
    name(generatorNames.sharedPlatformGateway(region, platform.key, 'sgw'), 'shared-plat-sgw-' + index);
    platform.subnets.forEach((subnet, subnetIndex) => name(generatorNames.environmentSubnet(region, 'shared', platform.key + '-' + subnet.name), 'shared-plat-vcn-' + index + '-sn-' + subnetIndex));
  });
  for (const connection of model.remotePeeringConnections ?? []) {
    const segment = connection.name.replaceAll('_', '-');
    name(displayName('rpc', region, ['hub', segment]), 'rpc-' + connection.id);
    name(displayName('drgatt', region, ['hub', 'rpc', segment]), 'rpc-' + connection.id);
  }
  const nodeFor = (resource: Resource | undefined): string | undefined => {
    if (!resource) return undefined;
    if (resource.kind === 'firewall' || resource.kind === 'nlb') return nodeFor(resources.get(text(resource.data.subnet_key ?? resource.data.subnet_id)));
    return names.get(text(resource.data.display_name).toLowerCase());
  };

  const tables = new Map<string, RouteTable>();
  for (const resource of resources.values()) {
    if (resource.kind !== 'table' && resource.kind !== 'drg-table') continue;
    const drg = resource.kind === 'drg-table';
    tables.set(resource.key, {
      id: resource.key, sourceKey: resource.key, name: text(resource.data.display_name) || resource.key,
      kind: drg ? 'drg' : nodeFor(resources.get(resource.vcnKey ?? '')) === 'hub-vcn' ? 'hub' : 'spoke',
      columns: drg ? 'drg' : 'vcn', associations: [], rules: [],
      ...(resource.data.import_drg_route_distribution_key ? { importDistributionKey: text(resource.data.import_drg_route_distribution_key) } : {}),
    });
  }
  const associate = (tableKey: unknown, resource: Resource, kind: RouteAssociation['kind']) => {
    const table = tables.get(text(tableKey));
    const nodeId = nodeFor(resource);
    if (!table || !nodeId) return;
    if (!table.associations.some((item) => item.nodeId === nodeId && item.kind === kind)) table.associations.push({ nodeId, kind });
    if (kind === 'gateway') table.kind = 'gateway';
  };
  for (const resource of resources.values()) {
    if (resource.kind === 'subnet') {
      const vcn = resources.get(resource.vcnKey ?? '');
      associate(resource.data.route_table_key ?? vcn?.data.default_route_table_key, resource, 'subnet');
    } else if (['igw', 'natgw', 'sgw'].includes(resource.kind)) {
      associate(resource.data.route_table_key, resource, 'gateway');
    } else if (resource.kind === 'attachment') {
      const details = object(resource.data.network_details);
      associate(resource.data.drg_route_table_key, resource, details.type === 'REMOTE_PEERING_CONNECTION' ? 'rpc-attachment' : 'drg-attachment');
      const vcn = resources.get(text(details.attached_resource_key));
      if (vcn?.kind === 'vcn') associate(details.route_table_key ?? vcn.data.default_route_table_key, vcn, 'vcn-ingress');
    }
  }
  const target = (key: string): Pick<RouteRule, 'targetKey' | 'target' | 'targetType' | 'nextHopKind' | 'flowTarget' | 'targetNodeId'> => {
    const resource = resources.get(key);
    const node = nodeFor(resource);
    const label = text(resource?.data.display_name) || key;
    const base = { targetKey: key, target: label, targetNodeId: node };
    if (!resource) return { ...base, nextHopKind: 'unresolved', targetType: 'External target' };
    if (resource.kind === 'firewall') return { ...base, nextHopKind: 'firewall', targetType: 'Private IP', flowTarget: text(resource.data.ipv4address) || undefined };
    if (resource.kind === 'nlb') return { ...base, nextHopKind: 'nlb', targetType: 'Network Load Balancer', flowTarget: node };
    if (resource.kind === 'attachment') return { ...base, nextHopKind: 'attachment', targetType: object(resource.data.network_details).type === 'REMOTE_PEERING_CONNECTION' ? 'RPC Attachment' : 'VCN Attachment', flowTarget: node };
    const kinds = { igw: 'Internet Gateway', natgw: 'NAT Gateway', sgw: 'Service Gateway', drg: 'Dynamic Routing Gateway' } as const;
    if (resource.kind === 'igw' || resource.kind === 'natgw' || resource.kind === 'sgw' || resource.kind === 'drg') return { ...base, nextHopKind: resource.kind, targetType: kinds[resource.kind], flowTarget: node };
    return { ...base, nextHopKind: 'unresolved', targetType: 'Unresolved target' };
  };
  for (const [key, table] of tables) {
    const resource = resources.get(key)!;
    for (const [ruleKey, rule] of entries(resource.data.route_rules)) {
      const destination = text(rule.destination);
      const service = rule.destination_type === 'SERVICE_CIDR_BLOCK';
      table.rules.push({
        id: ruleKey, provenance: 'configured', destination: service ? 'OSN Services' : destination,
        ...(!service ? { matchCidr: destination } : {}),
        ...target(text(rule.next_hop_drg_attachment_key ?? rule.network_entity_key ?? rule.network_entity_id)),
        routeType: 'Static',
      });
    }
    if (table.importDistributionKey) {
      const distribution = resources.get(table.importDistributionKey);
      const statements = entries(distribution?.data.statements).sort(([, a], [, b]) => Number(a.priority) - Number(b.priority));
      const advertised = new Set<string>();
      for (const [statementKey, statement] of statements) {
        if (statement.action !== 'ACCEPT') continue;
        const criteria = object(statement.match_criteria);
        const candidates = [...resources.values()].filter((entry) => entry.kind === 'attachment' && entry.drgKey === resource.drgKey && (
          criteria.match_type === 'MATCH_ALL'
          || (criteria.match_type === 'DRG_ATTACHMENT_ID' && entry.key === criteria.drg_attachment_key)
          || (criteria.match_type === 'DRG_ATTACHMENT_TYPE' && object(entry.data.network_details).type === criteria.attachment_type)
        ));
        for (const attachment of candidates) {
          const attached = resources.get(text(object(attachment.data.network_details).attached_resource_key));
          let prefixes: { id: string; cidr: string; provenance: RouteProvenance }[] = [];
          if (attached?.kind === 'vcn') {
            const details = object(attachment.data.network_details);
            prefixes = details.vcn_route_type === 'VCN_CIDRS'
              ? strings(attached.data.cidr_blocks).map((cidr) => ({ id: attached.key + '/' + cidr, cidr, provenance: 'derived-import' }))
              : entries(attached.data.subnets).map(([subnetKey, subnet]) => ({ id: subnetKey, cidr: text(subnet.cidr_block), provenance: 'derived-import' }));
            const ingress = resources.get(text(details.route_table_key ?? attached.data.default_route_table_key));
            for (const [ruleKey, rule] of entries(ingress?.data.route_rules)) {
              if (rule.destination_type !== 'SERVICE_CIDR_BLOCK') prefixes.push({ id: ruleKey, cidr: text(rule.destination), provenance: 'derived-import' });
            }
          } else if (attached?.kind === 'rpc') {
            const node = nodeFor(attached);
            const connection = model.remotePeeringConnections?.find((entry) => 'rpc-' + entry.id === node);
            prefixes = (connection?.remoteCidrs ?? []).map((cidr) => ({ id: attached.key + '/' + cidr, cidr, provenance: 'expected-remote' }));
          }
          for (const prefix of prefixes) {
            const identity = attachment.key + '/' + prefix.cidr;
            if (!prefix.cidr || advertised.has(identity)) continue;
            advertised.add(identity);
            table.rules.push({
              id: key + '/' + table.importDistributionKey + '/' + statementKey + '/' + prefix.id,
              provenance: prefix.provenance, destination: prefix.cidr, matchCidr: prefix.cidr,
              ...target(attachment.key), routeType: 'Dynamic', sourceAttachmentKey: attachment.key,
              importPriority: Number(statement.priority),
            });
          }
        }
      }
    }
    table.attachTo = table.associations[0]?.nodeId;
    table.attachExtra = [...new Set(table.associations.slice(1).map((item) => item.nodeId))];
    const notices: string[] = [];
    if (table.importDistributionKey) notices.push('Expected imports from ' + table.importDistributionKey + '; deployed learned routes are not available.');
    if (table.associations.length === 0) notices.push('No generated association maps to a visible diagram resource.');
    if (table.rules.some((rule) => rule.provenance === 'expected-remote')) notices.push('Remote prefixes are expected advertisements from this design.');
    if (table.rules.some((rule) => rule.nextHopKind === 'unresolved')) notices.push('External route targets require deployment dependency outputs.');
    if (notices.length) table.note = notices.join(' ');
  }
  return [...tables.values()];
}
