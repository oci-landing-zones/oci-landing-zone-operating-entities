import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { extractFoundationResources, foundationResourcesByRegion } from './foundationInventory';

const artifacts = {
  'iam.json': { compartments_configuration: { compartments: { root: {} } } },
  'governance.json': { tags_configuration: { namespaces: { roles: {} } }, budgets_configuration: { budgets: {} } },
  'network.json': { network_configuration: { network_configuration_categories: { shared: { vcns: { hub: {} } } } } },
  'security_cis1.json': { cloud_guard_configuration: { reporting_region: 'eu-frankfurt-1' }, security_zones_configuration: { security_zones: { root: {} } }, scanning_configuration: { host_recipes: { host: {} } } },
  'security_cis1_pre.json': { vaults_configuration: { vaults: { stale: {} } } },
  'observability_cis1.json': {
    home_region_events_configuration: { event_rules: { iam: { destination_topic_ids: ['home'] } } },
    events_configuration: { event_rules: { network: {} } },
    notifications_configuration: { topics: { home: {}, network: {} } },
    logging_configuration: { log_groups: { group: {} } },
    service_connectors_configuration: { service_connectors: { logs: {} }, buckets: { logs: {} } },
    alarms_configuration: { alarms: { network: {} } },
  },
};

describe('Foundation resources from deployment JSON', () => {
  it('shows only real nonempty final collections and separates Home notifications', () => {
    const inventory = extractFoundationResources(artifacts);
    expect(inventory.home).toEqual(['iam', 'governance', 'cloudguard', 'events', 'notifications']);
    expect(inventory.regional).toEqual(['networking', 'securityzones', 'scanning', 'events', 'notifications', 'logging', 'alarms', 'serviceconnectors', 'buckets']);
    expect(inventory.regional).not.toContain('vault');
    expect(inventory.home).not.toContain('budgets');
    expect(JSON.stringify(inventory)).not.toMatch(/data|observability/);
  });

  it('does not infer resources from empty configuration blocks or reference IDs', () => {
    expect(extractFoundationResources({ 'network.json': { network_configuration: { default_compartment_id: 'CMP-KEY' } }, 'security_cis2.json': { vaults_configuration: { vaults: {}, keys: {} }, security_zones_configuration: {} } })).toEqual({ home: [], regional: [] });
  });

  it('includes selected Vault, Bastion, OKE and budget resources', () => {
    const inventory = extractFoundationResources({ 'security_cis2.json': { vaults_configuration: { vaults: { actual: {} } }, bastions_configuration: { bastions: { actual: {} } } }, 'oke.json': { oke_configuration: { actual: { cluster_configuration: { name: 'cluster' } } } }, 'governance.json': { budgets_configuration: { budgets: { actual: {} } } } });
    expect(inventory.home).toEqual(['budgets']);
    expect(inventory.regional).toEqual(['vault', 'bastion', 'oke']);
  });

  it('maps Primary and linked Secondary snapshots to their own regions without inventing DR resources', () => {
    const foundation = { ...emptyLzModel().foundation, tenancyHomeRegion: 'eu-madrid-1', drRegion: 'eu-amsterdam-1' };
    const primary = extractFoundationResources(artifacts);
    const dr = { home: [], regional: ['vault'] } as const;
    expect(foundationResourcesByRegion([{ foundation, resources: primary }])).not.toHaveProperty('eu-amsterdam-1');
    const mapped = foundationResourcesByRegion([{ foundation, resources: primary }, { foundation: { ...foundation, stackScope: 'regional', homeRegion: foundation.region, region: 'eu-amsterdam-1' }, resources: { home: [...dr.home], regional: [...dr.regional] } }]);
    expect(mapped['eu-amsterdam-1']).toEqual(['vault']);
    expect(mapped['eu-madrid-1']).toEqual(primary.home);
    expect(mapped['eu-frankfurt-1']).toEqual(primary.regional);
  });
});
