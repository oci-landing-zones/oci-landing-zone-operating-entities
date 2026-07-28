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
local has_substring(value, substring) =
  std.length(std.findSubstr(substring, value)) > 0;
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

local reference_failures = std.flattenArrays([
  [
    {
      owner: cluster_key,
      reference: reference,
      kind: dependency.kind,
    }
    for dependency in [
      {
        kind: 'compartment',
        values: [clusters[cluster_key].compartment_id],
        available: compartment_keys,
      },
      {
        kind: 'vcn',
        values: [clusters[cluster_key].networking.vcn_id],
        available: vcn_keys,
      },
      {
        kind: 'subnet',
        values:
          as_array(clusters[cluster_key].networking.api_endpoint_subnet_id)
          + as_array(clusters[cluster_key].networking.services_subnet_id),
        available: subnet_keys,
      },
      {
        kind: 'nsg',
        values: as_array(
          clusters[cluster_key].networking.api_endpoint_nsg_ids
        ),
        available: nsg_keys,
      },
    ]
    for reference in dependency.values
    if !std.member(dependency.available, reference)
  ]
  for cluster_key in std.objectFields(clusters)
]) + std.flattenArrays([
  [
    {
      owner: worker_key,
      reference: reference,
      kind: dependency.kind,
    }
    for dependency in [
      {
        kind: 'compartment',
        values: [workers[worker_key].compartment_id],
        available: compartment_keys,
      },
      {
        kind: 'cluster',
        values: [workers[worker_key].cluster_id],
        available: std.objectFields(clusters),
      },
      {
        kind: 'subnet',
        values:
          as_array(workers[worker_key].networking.workers_subnet_id)
          + (
            if std.objectHas(
              workers[worker_key].networking,
              'pods_subnet_id'
            ) then
              as_array(workers[worker_key].networking.pods_subnet_id)
            else []
          ),
        available: subnet_keys,
      },
      {
        kind: 'nsg',
        values:
          as_array(workers[worker_key].networking.workers_nsg_ids)
          + (
            if std.objectHas(workers[worker_key].networking, 'pods_nsg_ids')
            then as_array(workers[worker_key].networking.pods_nsg_ids)
            else []
          ),
        available: nsg_keys,
      },
    ]
    for reference in dependency.values
    if !std.member(dependency.available, reference)
  ]
  for worker_key in std.objectFields(workers)
]) + std.flattenArrays([
  [
    {
      owner: cluster_key,
      reference: reference,
      kind: dependency.kind,
    }
    for dependency in [
      {
        kind: 'compartment',
        values: [ocvs_clusters[cluster_key].compartment_id],
        available: compartment_keys,
      },
      {
        kind: 'vcn',
        values: [ocvs_clusters[cluster_key].networking.vcn_id],
        available: vcn_keys,
      },
      {
        kind: 'subnet',
        values: [ocvs_clusters[cluster_key].networking.subnet_id],
        available: subnet_keys,
      },
      {
        kind: 'nsg',
        values: values(ocvs_clusters[cluster_key].networking.nsgs),
        available: nsg_keys,
      },
      {
        kind: 'route_table',
        values: values(ocvs_clusters[cluster_key].networking.route_tables),
        available: route_table_keys,
      },
    ]
    for reference in dependency.values
    if !std.member(dependency.available, reference)
  ]
  for cluster_key in std.objectFields(ocvs_clusters)
]);

local qualifiers = ['ALPHA-PROD', 'BETA-PROD'];
local qualified_scope_failures = std.flattenArrays([
  [
    label
    for contract in [
      {
        label: '%s OKE cluster' % qualifier,
        values: std.objectFields(clusters),
        substring: qualifier,
      },
      {
        label: '%s OKE worker' % qualifier,
        values: std.objectFields(workers),
        substring: qualifier,
      },
      {
        label: '%s OCVS cluster' % qualifier,
        values: std.objectFields(ocvs_clusters),
        substring: qualifier,
      },
    ]
    if std.length([
      value
      for value in contract.values
      if has_substring(value, contract.substring)
    ]) == 0
  ] + [
    '%s %s compartment' % [qualifier, extension]
    for extension in ['EXACC', 'EXACS', 'OCVS', 'OKE']
    if std.length([
      key
      for key in compartment_keys
      if has_substring(key, qualifier) && has_substring(key, extension)
    ]) == 0
  ] + [
    '%s %s project database compartment' % [qualifier, extension]
    for extension in ['EXACC', 'EXACS']
    if !std.member(
      compartment_keys,
      'CMP-LZ-%s-PROJ1-%s-DB-KEY' % [qualifier, extension]
    )
  ]
  for qualifier in qualifiers
]);

local extension_vcns = [
  entry
  for entry in vcn_entries
  if has_substring(entry.category, 'exacs')
     || has_substring(entry.category, 'ocvs')
     || has_substring(entry.category, 'oke')
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
  if std.length(missing_extension_categories) > 0 then
    [{ missing_categories: missing_extension_categories }]
  else if std.length(
    duplicates([entry.key for entry in extension_vcns])
  ) > 0 then
    [{
      duplicate_vcn_keys:
        duplicates([entry.key for entry in extension_vcns]),
    }]
  else if std.length(
    duplicates([entry.dns for entry in extension_vcns])
  ) > 0 then
    [{
      duplicate_dns_labels:
        duplicates([entry.dns for entry in extension_vcns]),
    }]
  else [];
local observability = outputs['observability_cis2.json'];
local observability_text = std.manifestJson(observability);

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
    if has_substring(category, 'exacc')
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
  exadata_observability_failures: std.flattenArrays([
    [
      label
      for contract in [
        {
          label: '%s ExaCC observability' % qualifier,
          substring: '%s-EXACC' % qualifier,
        },
        {
          label: '%s ExaCS observability' % qualifier,
          substring: '%s-EXACS' % qualifier,
        },
      ]
      if !has_substring(observability_text, contract.substring)
    ] + (
      if !std.objectHas(
        observability.alarms_configuration.alarms,
        'AL-LZ-%s-CPUUTIL-KEY' % qualifier
      ) then ['%s ExaCC CPU alarm' % qualifier]
      else []
    )
    for qualifier in qualifiers
  ]),
}
