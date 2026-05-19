// EXACS placement matrix keeps shared, hybrid, and dedicated platform scopes distinct
local multi = import 'gen/landing_zone_multi.jsonnet';

local exacs_params(extra={}) = {
  notification_emails: {
    default: ['exacs-platform@example.com'],
    db_workloads: ['exacs-db@example.com'],
    infra_workloads: ['exacs-infra@example.com'],
    projects: ['exacs-projects@example.com'],
  },
} + extra;

local extension(params) = {
  extension: {
    type: 'exacs',
    params: params,
  },
};

local base_envs = {
  prod: {
    shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    projects: { proj1: {} },
  },
  preprod: {
    shared_project_network: { network: { vcn: '10.0.128.0/21' } },
    projects: { proj1: {} },
  },
};

local base_config = {
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: base_envs,
};

local shared_autonomous = multi(base_config {
  shared_platforms: {
    exacs: extension(exacs_params({
      project_db_compartments: {
        prod: ['proj1'],
        preprod: ['proj1'],
      },
    })) {
      network: { vcn: '10.0.24.0/21' },
    },
  },
});

local shared_vmc_only = multi(base_config {
  shared_platforms: {
    exacs: extension(exacs_params()) {
      network: { vcn: '10.0.24.0/21' },
    },
  },
});

local hybrid = multi(base_config {
  shared_platforms: {
    exacs: extension(exacs_params()),
  },
  environments+: {
    prod+: {
      platforms: {
        exacs: extension(exacs_params({
          project_db_compartments: ['proj1'],
        })) {
          network: { vcn: '10.0.24.0/21' },
        },
      },
    },
    preprod+: {
      platforms: {
        exacs: extension(exacs_params()) {
          network: { vcn: '10.0.32.0/21' },
        },
      },
    },
  },
});

local infra_only = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    exacs: extension(exacs_params()),
  },
});

local dedicated = multi(base_config {
  environments+: {
    prod+: {
      platforms: {
        exacs: extension(exacs_params({
          project_db_compartments: ['proj1'],
        })) {
          network: { vcn: '10.0.24.0/21' },
        },
      },
    },
    preprod+: {
      platforms: {
        exacs: extension(exacs_params()) {
          network: { vcn: '10.0.32.0/21' },
        },
      },
    },
  },
});

local lz_children(result) =
  result['iam.json'].compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;

local child_keys(parent) =
  if std.objectHas(parent, 'children') then std.sort(std.objectFields(parent.children)) else [];

local exacs_event_keys(result) =
  std.sort([
    key
    for key in std.objectFields(result['observability_cis1.json'].events_configuration.event_rules)
    if std.length(std.findSubstr('EXACS', key)) > 0
  ]);

local network_category_keys(result) =
  std.sort([
    key
    for key in std.objectFields(result['network.json'].network_configuration.network_configuration_categories)
    if std.length(std.findSubstr('exacs', key)) > 0
  ]);

local summarize(result) =
  local children = lz_children(result);
  local shared_platform = children['CMP-LZ-PLATFORM-KEY'];
  local platform_for(env_name) =
    local env_key = 'CMP-LZ-%s-KEY' % std.asciiUpper(env_name);
    local platform_key = 'CMP-LZ-%s-PLATFORM-KEY' % std.asciiUpper(env_name);
    if std.objectHas(children, env_key) && std.objectHas(children[env_key].children, platform_key)
    then children[env_key].children[platform_key]
    else {};
  local prod_platform = platform_for('prod');
  local preprod_platform = platform_for('preprod');
  local prod_project = children['CMP-LZ-PROD-KEY'].children['CMP-LZ-PROD-PROJECTS-KEY']
    .children['CMP-LZ-PROD-PROJ1-KEY'];
  {
    network_categories: network_category_keys(result),
    shared_platform_children: child_keys(shared_platform),
    shared_exacs_children:
      if std.objectHas(shared_platform, 'children') && std.objectHas(shared_platform.children, 'CMP-LZ-SHARED-EXACS-KEY')
      then child_keys(shared_platform.children['CMP-LZ-SHARED-EXACS-KEY'])
      else [],
    prod_platform_children: child_keys(prod_platform),
    prod_exacs_children:
      if std.objectHas(prod_platform, 'children') && std.objectHas(prod_platform.children, 'CMP-LZ-PROD-EXACS-KEY')
      then child_keys(prod_platform.children['CMP-LZ-PROD-EXACS-KEY'])
      else [],
    preprod_platform_children: child_keys(preprod_platform),
    preprod_exacs_children:
      if std.objectHas(preprod_platform, 'children') && std.objectHas(preprod_platform.children, 'CMP-LZ-PREPROD-EXACS-KEY')
      then child_keys(preprod_platform.children['CMP-LZ-PREPROD-EXACS-KEY'])
      else [],
    prod_project_children: child_keys(prod_project),
    exacs_event_rules: exacs_event_keys(result),
  };

local exacs_policy_statements(result) = std.flattenArrays([
  result['iam.json'].policies_configuration.supplied_policies[key].statements
  for key in std.objectFields(result['iam.json'].policies_configuration.supplied_policies)
  if std.length(std.findSubstr('EXACS', key)) > 0
]);

local count_statements(result, needle) = std.length([
  statement
  for statement in exacs_policy_statements(result)
  if std.length(std.findSubstr(needle, statement)) > 0
]);

{
  shared_autonomous: summarize(shared_autonomous),
  shared_vmc_only: summarize(shared_vmc_only),
  hybrid: summarize(hybrid),
  infra_only: summarize(infra_only) {
    exacs_group_keys: std.sort([
      key
      for key in std.objectFields(infra_only['iam.json'].identity_domain_groups_configuration.groups)
      if std.length(std.findSubstr('EXACS', key)) > 0
    ]),
    cloud_vmcluster_statement_count: count_statements(infra_only, 'cloud-vmclusters'),
    autonomous_vmcluster_statement_count: count_statements(infra_only, 'autonomous-vmclusters'),
  },
  dedicated: summarize(dedicated),
}
