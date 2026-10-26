import { describe, expect, it } from 'vitest';
import { extractGeneratedResources } from './generatedResources';

const compartments = { compartments: {
  ROOT: { name: 'enclosing', children: {
    SECURITY: { name: 'security', children: { WORKLOAD: { name: 'workload' } } },
  } },
} };

const artifacts = () => ({
  'security.json': {
    vaults_configuration: { default_compartment_id: 'SECURITY', vaults: { 'arbitrary-vault-key': { name: 'renamed vault' } }, keys: { 'not-a-vault': { name: 'encryption key' } } },
    scanning_configuration: {
      default_compartment_id: 'SECURITY',
      host_recipes: { 'host-recipe': { name: 'host scanner' } },
      container_recipes: { 'container-recipe': { name: 'container scanner', compartment_id: 'WORKLOAD' } },
      host_targets: { 'not-a-recipe': { name: 'scan target', target_compartment_id: 'WORKLOAD' } },
    },
    security_zones_configuration: { recipes: { 'recipe-key': { name: 'shared policy recipe', compartment_id: 'SECURITY' } } },
  },
  'observability.json': {
    events_configuration: { default_compartment_id: 'ROOT', event_rules: { 'event-key': { event_display_name: 'resource change', compartment_id: 'WORKLOAD' } } },
    home_region_events_configuration: { default_compartment_id: 'TENANCY-ROOT', event_rules: { 'tenancy-event': { event_display_name: 'identity change' } } },
    notifications_configuration: { default_compartment_id: 'SECURITY', topics: { 'topic-key': { name: 'operations', subscriptions: [{ name: 'not a topic' }] } } },
    logging_configuration: {
      default_compartment_id: 'SECURITY',
      flow_logs: { 'flow-key': { log_group_id: 'unrelated-key', target_resource_type: 'subnet', target_compartment_ids: ['WORKLOAD'] } },
      log_groups: { 'unrelated-key': { name: 'custom flow group' }, 'unused-key': { name: 'application logs' } },
    },
    alarms_configuration: { default_compartment_id: 'SECURITY', alarms: { 'alarm-key': { display_name: 'not part of requested inventory' } } },
  },
});

describe('generated resource inventory', () => {
  it('uses canonical names, keys and owner inheritance for the six requested families', () => {
    const result = extractGeneratedResources(artifacts(), compartments);
    expect(result.compartments).toEqual([
      { key: 'TENANCY-ROOT', name: 'OCI Tenancy' },
      { key: 'ROOT', name: 'enclosing', parentKey: 'TENANCY-ROOT' },
      { key: 'SECURITY', name: 'security', parentKey: 'ROOT' },
      { key: 'WORKLOAD', name: 'workload', parentKey: 'SECURITY' },
    ]);
    expect(result.groups).toEqual([
      { id: 'events:TENANCY-ROOT', kind: 'events', compartmentKey: 'TENANCY-ROOT', items: [{ key: 'tenancy-event', name: 'identity change' }] },
      { id: 'events:WORKLOAD', kind: 'events', compartmentKey: 'WORKLOAD', items: [{ key: 'event-key', name: 'resource change' }] },
      { id: 'flowlogs:SECURITY', kind: 'flowlogs', compartmentKey: 'SECURITY', items: [{ key: 'unrelated-key', name: 'custom flow group' }] },
      { id: 'notifications:SECURITY', kind: 'notifications', compartmentKey: 'SECURITY', items: [{ key: 'topic-key', name: 'operations' }] },
      { id: 'scanning:SECURITY', kind: 'scanning', compartmentKey: 'SECURITY', items: [{ key: 'host-recipe', name: 'host scanner' }] },
      { id: 'scanning:WORKLOAD', kind: 'scanning', compartmentKey: 'WORKLOAD', items: [{ key: 'container-recipe', name: 'container scanner' }] },
      { id: 'securityrecipes:SECURITY', kind: 'securityrecipes', compartmentKey: 'SECURITY', items: [{ key: 'recipe-key', name: 'shared policy recipe' }] },
      { id: 'vault:SECURITY', kind: 'vault', compartmentKey: 'SECURITY', items: [{ key: 'arbitrary-vault-key', name: 'renamed vault' }] },
    ]);
  });

  it('reflects additions, renames and owner moves without a resource-name catalogue', () => {
    const files = artifacts();
    Object.assign(files['observability.json'].events_configuration.event_rules, {
      'new-unfamiliar-key': { display_name: 'new event', compartment_id: 'SECURITY' },
    });
    Object.assign(files['security.json'].vaults_configuration.vaults['arbitrary-vault-key'], { name: 'new vault name', compartment_id: 'WORKLOAD' });
    const result = extractGeneratedResources(files, compartments);
    expect(result.groups.find((group) => group.id === 'events:SECURITY')?.items).toEqual([{ key: 'new-unfamiliar-key', name: 'new event' }]);
    expect(result.groups.find((group) => group.id === 'vault:WORKLOAD')?.items).toEqual([{ key: 'arbitrary-vault-key', name: 'new vault name' }]);
    expect(result.groups.some((group) => group.id === 'vault:SECURITY')).toBe(false);
  });

  it('uses flow-log references and hosting compartments rather than names or monitored targets', () => {
    const files = artifacts();
    files['observability.json'].logging_configuration.flow_logs['flow-key'].target_compartment_ids = ['ROOT'];
    files['observability.json'].logging_configuration.log_groups['unrelated-key'].name = 'a completely different group name';
    const result = extractGeneratedResources(files, compartments);
    expect(result.groups.find((group) => group.kind === 'flowlogs')).toEqual({
      id: 'flowlogs:SECURITY', kind: 'flowlogs', compartmentKey: 'SECURITY',
      items: [{ key: 'unrelated-key', name: 'a completely different group name' }],
    });
  });

  it('excludes prerequisite variants and deduplicates the same actual resource across final artifacts', () => {
    const files = artifacts();
    const result = extractGeneratedResources({ ...files,
      'security_cis2_pre.json': { vaults_configuration: { default_compartment_id: 'SECURITY', vaults: { 'pre-only': { name: 'prerequisite only' } } } },
      'another-final.json': files['security.json'],
    }, compartments);
    expect(result.groups.find((group) => group.kind === 'vault')?.items).toEqual([{ key: 'arbitrary-vault-key', name: 'renamed vault' }]);
  });

  it('retains explicit compartment ancestry and accepts empty resource families', () => {
    const result = extractGeneratedResources({}, { default_parent_id: 'existing-parent', compartments: {
      TOP: { name: 'top', parent_id: 'explicit-parent', children: { CHILD: { name: 'child' } } },
    } });
    expect(result.compartments.slice(1)).toEqual([
      { key: 'TOP', name: 'top', parentKey: 'explicit-parent' },
      { key: 'CHILD', name: 'child', parentKey: 'TOP' },
    ]);
    expect(result.groups).toEqual([]);
  });

  it('rejects missing compartment owners and cyclic or incomplete ancestry before rendering', () => {
    const files = artifacts();
    expect(() => extractGeneratedResources(files, { compartments: { ROOT: { name: 'root' } } })).toThrow('unavailable for resource placement');
    expect(() => extractGeneratedResources(files, { compartments: {
      ROOT: { name: 'root', parent_id: 'SECURITY', children: { SECURITY: { name: 'security', children: { WORKLOAD: { name: 'workload' } } } } },
    } })).toThrow('cycle');
    expect(() => extractGeneratedResources(files, { compartments: {
      ROOT: { name: 'root', parent_id: 'missing', children: { SECURITY: { name: 'security', children: { WORKLOAD: { name: 'workload' } } } } },
    } })).toThrow('unavailable for resource placement');
    expect(() => extractGeneratedResources({}, { compartments: {
      FIRST: { name: 'first', children: { DUPLICATE: { name: 'one' } } },
      SECOND: { name: 'second', children: { DUPLICATE: { name: 'two' } } },
    } })).toThrow('defined more than once');
  });

  it('rejects unavailable ancestry, unowned resources and conflicting names', () => {
    expect(() => extractGeneratedResources({}, undefined)).toThrow('compartment inventory');
    expect(() => extractGeneratedResources({}, { compartments: [] })).toThrow('compartment inventory');
    expect(() => extractGeneratedResources({}, { compartments: { broken: {} } })).toThrow('has no name');
    expect(() => extractGeneratedResources({ 'final.json': { vaults_configuration: { vaults: { vault: { name: 'unowned' } } } } }, compartments)).toThrow('owning compartment');
    const files = artifacts();
    expect(() => extractGeneratedResources({ ...files, 'changed-final.json': {
      vaults_configuration: { default_compartment_id: 'SECURITY', vaults: { 'arbitrary-vault-key': { name: 'conflicting vault' } } },
    } }, compartments)).toThrow('conflicting names');
  });
});
