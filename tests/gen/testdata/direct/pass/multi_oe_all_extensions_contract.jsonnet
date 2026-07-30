// Two identical OE workload shapes remain isolated and produce deployable cross-file references.
// Breaking qualification, ownership, dependency wiring, or the pinned root contract makes a failure array non-empty.
// contains: "duplicate_stage_families": []
// contains: "unknown_orchestrator_families": []
// contains: "qualified_scope_failures": []
// contains: "unresolved_dependency_references": []
// contains: "network_identifier_collisions": []
// contains: "networkless_exacc_categories": []
// contains: "ocvs_name_override_failures": []
// contains: "exadata_observability_failures": []
local multi = import 'gen/landing_zone_multi.jsonnet';
local config = import 'tests/gen/testdata/contracts/multi_oe_all_extensions.jsonnet';
local outputs = multi(config);

// terraform-oci-modules-orchestrator v2.1.3, commit
// 34202e837e9df015ddaaa4fce0ab62bb6e3883de.
local orchestrator_root_families = [
  'alarms_configuration',
  'autonomous_databases_configuration',
  'bastions_configuration',
  'budgets_configuration',
  'cloud_exadata_database_configuration',
  'cloud_guard_configuration',
  'compartments_configuration',
  'dynamic_groups_configuration',
  'events_configuration',
  'groups_configuration',
  'home_region_events_configuration',
  'identity_domain_applications_configuration',
  'identity_domain_dynamic_groups_configuration',
  'identity_domain_groups_configuration',
  'identity_domain_identity_providers_configuration',
  'identity_domains_configuration',
  'instances_configuration',
  'logging_configuration',
  'network_configuration',
  'nlb_configuration',
  'notifications_configuration',
  'object_storage_configuration',
  'ocvs_configuration',
  'oke_clusters_configuration',
  'oke_workers_configuration',
  'policies_configuration',
  'scanning_configuration',
  'security_zones_configuration',
  'service_connectors_configuration',
  'storage_configuration',
  'streams_configuration',
  'tags_configuration',
  'vaults_configuration',
  'zpr_configuration',
];

local common_stage = [
  'governance.json',
  'iam.json',
  'network.json',
  'ocvs.json',
  'oke_clusters.json',
  'oke_workers.json',
];
local stages = [
  common_stage + ['observability_cis2_pre.json', 'security_cis2_pre.json'],
  common_stage + ['observability_cis2.json', 'security_cis2.json'],
];
local values(object) = [object[key] for key in std.objectFields(object)];
local as_array(value) =
  if std.type(value) == 'array' then value else [value];
local occurrences(items, item) =
  std.length([candidate for candidate in items if candidate == item]);
local duplicates(items) =
  std.uniq(std.sort([
    item
    for item in items
    if occurrences(items, item) > 1
  ]));
local stage_family_owners(stage) =
  local families = std.uniq(std.sort(std.flattenArrays([
    std.objectFields(outputs[file])
    for file in stage
  ])));
  {
    [family]: [
      file
      for file in stage
      if std.objectHas(outputs[file], family)
    ]
    for family in families
  };
local duplicate_stage_families = std.flattenArrays([
  [
    {
      family: family,
      owners: owners[family],
    }
    for family in std.objectFields(owners)
    if std.length(owners[family]) > 1
  ]
  for stage in stages
  for owners in [stage_family_owners(stage)]
]);
local emitted_families = std.uniq(std.sort(std.flattenArrays([
  std.objectFields(outputs[file])
  for file in std.objectFields(outputs)
])));

local collect_compartment_keys(compartments) =
  std.flattenArrays([
    [key] + collect_compartment_keys(
      if std.objectHas(compartments[key], 'children') then
        compartments[key].children
      else {}
    )
    for key in std.objectFields(compartments)
  ]);
local compartment_keys = collect_compartment_keys(
  outputs['iam.json'].compartments_configuration.compartments
);
local categories =
  outputs['network.json'].network_configuration.network_configuration_categories;
local vcn_entries = std.flattenArrays([
  [
    {
      category: category_key,
      key: vcn_key,
      dns: categories[category_key].vcns[vcn_key].dns_label,
      value: categories[category_key].vcns[vcn_key],
    }
    for vcn_key in std.objectFields(categories[category_key].vcns)
  ]
  for category_key in std.objectFields(categories)
]);
local vcn_keys = [entry.key for entry in vcn_entries];
local subnet_keys = std.flattenArrays([
  std.objectFields(entry.value.subnets)
  for entry in vcn_entries
]);
local nsg_keys = std.flattenArrays([
  std.objectFields(entry.value.network_security_groups)
  for entry in vcn_entries
]);
local route_table_keys = std.flattenArrays([
  std.objectFields(entry.value.route_tables)
  for entry in vcn_entries
]);
local clusters =
  outputs['oke_clusters.json'].oke_clusters_configuration.clusters;
local workers =
  outputs['oke_workers.json'].oke_workers_configuration.node_pools;
local ocvs_clusters =
  outputs['ocvs.json'].ocvs_configuration.ocvs_clusters;

// Keys use type-specific prefixes, so a single set comparison proves that every
// cross-file reference resolves without repeatedly walking the generated graph.
local referenced_keys =
  [clusters[key].compartment_id for key in std.objectFields(clusters)]
  + [clusters[key].networking.vcn_id for key in std.objectFields(clusters)]
  + std.flattenArrays([
    as_array(clusters[key].networking.api_endpoint_subnet_id)
    + as_array(clusters[key].networking.services_subnet_id)
    + as_array(clusters[key].networking.api_endpoint_nsg_ids)
    for key in std.objectFields(clusters)
  ])
  + [workers[key].compartment_id for key in std.objectFields(workers)]
  + [workers[key].cluster_id for key in std.objectFields(workers)]
  + std.flattenArrays([
    as_array(workers[key].networking.workers_subnet_id)
    + (
      if std.objectHas(workers[key].networking, 'pods_subnet_id') then
        as_array(workers[key].networking.pods_subnet_id)
      else []
    )
    + as_array(workers[key].networking.workers_nsg_ids)
    + (
      if std.objectHas(workers[key].networking, 'pods_nsg_ids') then
        as_array(workers[key].networking.pods_nsg_ids)
      else []
    )
    for key in std.objectFields(workers)
  ])
  + [ocvs_clusters[key].compartment_id
     for key in std.objectFields(ocvs_clusters)]
  + [ocvs_clusters[key].networking.vcn_id
     for key in std.objectFields(ocvs_clusters)]
  + [ocvs_clusters[key].networking.subnet_id
     for key in std.objectFields(ocvs_clusters)]
  + std.flattenArrays([
    values(ocvs_clusters[key].networking.nsgs)
    + values(ocvs_clusters[key].networking.route_tables)
    for key in std.objectFields(ocvs_clusters)
  ]);
local available_keys =
  compartment_keys
  + vcn_keys
  + subnet_keys
  + nsg_keys
  + route_table_keys
  + std.objectFields(clusters);
local reference_failures =
  std.setDiff(std.set(referenced_keys), std.set(available_keys));

local qualifiers = ['ALPHA-PROD', 'BETA-PROD'];
local expected_qualified_keys = std.flattenArrays([
  [
    'CLR-FRA-LZ-%s-OKE-KEY' % qualifier,
    'NDP-FRA-LZ-%s-OKE-KEY' % qualifier,
    'SDDC-FRA-LZ-%s-OCVS-KEY' % qualifier,
  ]
  + [
    'CMP-LZ-%s-%s-KEY' % [qualifier, extension]
    for extension in ['EXACC', 'EXACS', 'OCVS', 'OKE']
  ]
  + [
    'CMP-LZ-%s-PROJ1-%s-DB-KEY' % [qualifier, extension]
    for extension in ['EXACC', 'EXACS']
  ]
  for qualifier in qualifiers
]);
local qualified_scope_failures = std.setDiff(
  std.set(expected_qualified_keys),
  std.set(
    std.objectFields(clusters)
    + std.objectFields(workers)
    + std.objectFields(ocvs_clusters)
    + compartment_keys
  )
);

local extension_vcns = [
  entry
  for entry in vcn_entries
  if std.length(std.findSubstr('exacs', entry.category)) > 0
     || std.length(std.findSubstr('ocvs', entry.category)) > 0
     || std.length(std.findSubstr('oke', entry.category)) > 0
];
local expected_extension_categories = [
  '%s-prod-platform-%s' % [oe, extension]
  for oe in ['alpha', 'beta']
  for extension in ['exacs', 'ocvs', 'oke']
];
local missing_extension_categories = [
  category
  for category in expected_extension_categories
  if std.length([
    entry
    for entry in extension_vcns
    if entry.category == category
  ]) == 0
];
local network_identifier_collisions =
  [{ missing_category: category } for category in missing_extension_categories]
  + [
    { duplicate_vcn_key: key }
    for key in duplicates([entry.key for entry in extension_vcns])
  ]
  + [
    { duplicate_dns_label: dns }
    for dns in duplicates([entry.dns for entry in extension_vcns])
  ];
local observability = outputs['observability_cis2.json'];
local expected_exadata_observability_keys = std.flattenArrays([
  [
    'AL-LZ-%s-CPUUTIL-KEY' % qualifier,
    'RUL-LZ-%s-NOTIFICATION-PLATFORM-EXACC-INFRA-KEY' % qualifier,
    'RUL-LZ-%s-EXACS-NOTIFICATION-PROJECTS-KEY' % qualifier,
    'NOTT-LZ-%s-EXACC-INFRA-WORKLOADS-KEY' % qualifier,
    'NOTT-LZ-%s-EXACS-PROJECTS-KEY' % qualifier,
  ]
  for qualifier in qualifiers
]);
local emitted_exadata_observability_keys =
  std.objectFields(observability.alarms_configuration.alarms)
  + std.objectFields(observability.events_configuration.event_rules)
  + std.objectFields(observability.notifications_configuration.topics);

{
  duplicate_stage_families: duplicate_stage_families,
  unknown_orchestrator_families: [
    family
    for family in emitted_families
    if !std.member(orchestrator_root_families, family)
  ],
  qualified_scope_failures: qualified_scope_failures,
  unresolved_dependency_references: reference_failures,
  network_identifier_collisions: network_identifier_collisions,
  networkless_exacc_categories: [
    category
    for category in std.objectFields(categories)
    if std.length(std.findSubstr('exacc', category)) > 0
  ],
  ocvs_name_override_failures:
    if std.sort([
         ocvs_clusters[key].sddc_display_name
         for key in std.objectFields(ocvs_clusters)
       ]) != ['sddc-al-p', 'sddc-be-p']
       || std.sort([
         ocvs_clusters[key].cluster_display_name
         for key in std.objectFields(ocvs_clusters)
       ]) != ['cluster-al-p', 'cluster-be-p']
    then ['explicit OCVS names were not preserved']
    else [],
  exadata_observability_failures: std.setDiff(
    std.set(expected_exadata_observability_keys),
    std.set(emitted_exadata_observability_keys)
  ),
}
