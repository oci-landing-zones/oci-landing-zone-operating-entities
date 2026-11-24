// Home and Primary are disjoint deployments derived from one Primary topology.
// contains: "verified": true
local render = import 'gen/landing_zone_multi.jsonnet';
local base = {
  region: 'eu-amsterdam-1', region_short_name: 'ams',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: { projects: { proj1: {} } } },
  remote_peering_connections: { other: {
    remote_cidrs: ['172.20.0.0/16'], peer_region_name: 'eu-paris-1',
    peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
    requestor_group_ocid: 'ocid1.group.oc1..requestor',
  } },
};
local check(cis, labels) =
  local config = base + {
    cis_level: cis,
    cost_governance: {
      enable_tags: labels, require_tag_values: labels, tag_resource_labels: labels,
      owner_email: 'owner@customer.test',
      cost_center_assignments: { CC12345: {} },
      cost_center_business_units: { CC12345: 'IT' },
    },
  };
  local complete = render(config);
  local home = render(config + {
    stack_scope: 'home', region: 'eu-frankfurt-1', region_short_name: 'fra',
    primary_region: config.region, primary_region_short_name: config.region_short_name,
  });
  local primary = render(config + { stack_scope: 'primary' });
  local security = 'security_cis%d.json' % cis;
  local observability = 'observability_cis%d.json' % cis;
  local home_topics = home[observability].notifications_configuration.topics;
  local primary_topics = primary[observability].notifications_configuration.topics;
  assert !std.objectHas(home, 'network.json');
  assert home['iam.json'] == complete['iam.json'];
  assert std.objectHas(home['iam.json'].policies_configuration.supplied_policies, 'PCY-AMS-LZ-HUB-RPC-OTHER-KEY');
  assert home['governance.json'] == complete['governance.json'];
  assert !std.objectHas(home, 'governance_pre.json');
  assert std.objectFields(home[security]) == ['cloud_guard_configuration'];
  assert home[security].cloud_guard_configuration.reporting_region == 'eu-frankfurt-1';
  assert !std.objectHas(primary, 'iam.json') && !std.objectHas(primary, 'governance.json');
  assert !std.objectHas(primary[security], 'cloud_guard_configuration');
  assert std.objectHas(primary[security], 'security_zones_configuration');
  assert !std.objectHas(primary[observability], 'home_region_events_configuration');
  assert primary[observability].service_connectors_configuration == complete[observability].service_connectors_configuration;
  assert primary['network.json'] == complete['network.json'];
  assert cis != 2 || primary[security].vaults_configuration == complete[security].vaults_configuration;
  assert std.length(std.objectFields(home_topics)) >= 1;
  assert std.length([key for key in std.objectFields(home_topics) if std.objectHas(primary_topics, key)]) == 0;
  assert home[observability].home_region_events_configuration == complete[observability].home_region_events_configuration;
  true;
assert std.all([check(cis, labels) for cis in [1, 2] for labels in [false, true]]);
local without_cloud_guard = base + { enable_cloud_guard: false, cis_level: 1 };
local home_without_cloud_guard = render(without_cloud_guard + {
  stack_scope: 'home', region: 'eu-frankfurt-1', region_short_name: 'fra',
  primary_region: base.region, primary_region_short_name: base.region_short_name,
});
assert !std.objectHas(home_without_cloud_guard, 'security_cis1.json');
assert std.objectFields(home_without_cloud_guard['observability_cis1.json'].notifications_configuration.topics) == ['NOTT-LZ-IAM-KEY'];
{ verified: true }
