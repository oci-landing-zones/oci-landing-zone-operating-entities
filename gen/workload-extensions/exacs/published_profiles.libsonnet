local notification_emails = {
  default: ['exacs-platform-team@example.com'],
  db_workloads: ['exacs-db-team@example.com'],
  infra_workloads: ['exacs-infra-team@example.com'],
  projects: ['exacs-project-team@example.com'],
};

local exacs_params(projects=null) = {
  [if projects != null then 'project_db_compartments']: projects,
  notification_emails: notification_emails,
};

local exacs_extension(projects=null) = {
  extension: {
    type: 'exacs',
    params: exacs_params(projects),
  },
};

local env_exacs_platform(projects) = exacs_extension(projects);

local shared_exacs_platform = exacs_extension() {
  network: { vcn: '10.0.24.0/21' },
};

local prod_preprod_exacs_uc1_config(hub_kind) = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  hub: {
    kind: hub_kind,
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        exacs: env_exacs_platform(['proj1']),
      },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
      platforms: {
        exacs: env_exacs_platform(['proj1']),
      },
    },
  },
  shared_platforms: {
    exacs: shared_exacs_platform,
  },
};

{
  notification_emails: notification_emails,

  hub_a_prod_preprod_exacs_uc1_config: prod_preprod_exacs_uc1_config('hub_a'),
  hub_e_prod_preprod_exacs_uc1_config: prod_preprod_exacs_uc1_config('hub_e'),
}
