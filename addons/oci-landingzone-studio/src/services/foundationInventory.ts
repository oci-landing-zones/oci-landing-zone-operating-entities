import type { DiagramNode, FoundationConfig } from '../model/types';

type FoundationResource = NonNullable<DiagramNode['foundationResource']>;
export interface FoundationResourceInventory { home: FoundationResource[]; regional: FoundationResource[] }
export type FoundationResourcesByRegion = Record<string, FoundationResource[]>;
const ORDER: FoundationResource[] = ['iam', 'governance', 'budgets', 'cloudguard', 'networking', 'securityzones', 'vault', 'scanning', 'bastion', 'events', 'notifications', 'logging', 'alarms', 'serviceconnectors', 'buckets', 'oke'];
type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {};
const populated = (value: unknown) => Object.keys(object(value)).length > 0;

/** Read final deployment collections, never inferred services or pre-phase placeholders. */
export function extractFoundationResources(artifacts: Record<string, unknown>): FoundationResourceInventory {
  const documents = Object.entries(artifacts).filter(([name]) => !name.endsWith('_pre.json')).map(([, value]) => object(value));
  const home = new Set<FoundationResource>();
  const regional = new Set<FoundationResource>();
  const homeTopics = new Set(documents.flatMap((doc) => Object.values(object(object(doc.home_region_events_configuration).event_rules))
    .flatMap((rule) => Array.isArray(object(rule).destination_topic_ids) ? object(rule).destination_topic_ids as unknown[] : []).filter((id): id is string => typeof id === 'string')));
  for (const doc of documents) {
    if (['compartments_configuration', 'identity_domains_configuration', 'identity_domain_groups_configuration', 'policies_configuration'].some((key) => {
      const config = object(doc[key]);
      return ['compartments', 'identity_domains', 'groups', 'supplied_policies'].some((collection) => populated(config[collection]));
    })) home.add('iam');
    if (populated(object(doc.tags_configuration).namespaces)) home.add('governance');
    if (populated(object(doc.budgets_configuration).budgets)) home.add('budgets');
    if (populated(doc.cloud_guard_configuration)) home.add('cloudguard');
    const network = object(doc.network_configuration);
    if (populated(network.vcns) || Object.values(object(network.network_configuration_categories)).some((category) => populated(object(category).vcns))) regional.add('networking');
    const collections: [FoundationResource, string, string[]][] = [
      ['securityzones', 'security_zones_configuration', ['recipes', 'security_zones']],
      ['vault', 'vaults_configuration', ['vaults', 'keys']],
      ['scanning', 'scanning_configuration', ['host_recipes', 'host_targets', 'container_recipes', 'container_targets']],
      ['bastion', 'bastions_configuration', ['bastions']],
      ['logging', 'logging_configuration', ['log_groups', 'flow_logs', 'service_logs']],
      ['alarms', 'alarms_configuration', ['alarms']],
      ['serviceconnectors', 'service_connectors_configuration', ['service_connectors']],
      ['buckets', 'service_connectors_configuration', ['buckets']],
    ];
    for (const [resource, config, keys] of collections) if (keys.some((key) => populated(object(doc[config])[key]))) regional.add(resource);
    if (Object.values(object(doc.oke_configuration)).some((cluster) => populated(object(cluster).cluster_configuration))) regional.add('oke');
    if (populated(object(doc.home_region_events_configuration).event_rules)) home.add('events');
    if (populated(object(doc.events_configuration).event_rules)) regional.add('events');
    for (const key of Object.keys(object(object(doc.notifications_configuration).topics))) (homeTopics.has(key) ? home : regional).add('notifications');
  }
  return { home: ORDER.filter((kind) => home.has(kind)), regional: ORDER.filter((kind) => regional.has(kind)) };
}

/** Each linked configuration contributes only resources it actually generates. */
export function foundationResourcesByRegion(snapshots: { foundation: FoundationConfig; resources: FoundationResourceInventory }[]): FoundationResourcesByRegion {
  const byRegion: FoundationResourcesByRegion = {};
  const add = (region: string | undefined, resources: FoundationResource[]) => {
    if (region) byRegion[region] = [...new Set([...(byRegion[region] ?? []), ...resources])];
  };
  for (const { foundation, resources } of snapshots) {
    if (foundation.stackScope !== 'regional') add(foundation.tenancyHomeRegion, resources.home);
    add(foundation.region, resources.regional);
  }
  return byRegion;
}
