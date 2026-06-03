local notification_emails = {
  default: ['exacc-platform-team@example.com'],
  db_workloads: ['exacc-db-team@example.com'],
  infra_workloads: ['exacc-infra-team@example.com'],
  projects: ['exacc-project-team@example.com'],
};

local exacc_platform(projects=null, components=null, emails={}) = {
  [if components != null then 'publication_components']: components,
  extension: {
    type: 'exacc',
    params: {
      [if projects != null then 'project_db_compartments']: projects,
      notification_emails: {
        default: notification_emails.default,
      } + emails,
    },
  },
};

local infra_only = { infrastructure: true, database: false };
local db_only = { infrastructure: false, database: true };
local infra_and_db = { infrastructure: true, database: true };

local exacc_no_network_base = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      projects: { proj1: {} },
    },
    preprod: {
      projects: { proj1: {} },
    },
  },
};

{
  notification_emails: notification_emails,

  hub_e_prod_preprod_exacc_config: exacc_no_network_base {
    shared_platforms: {
      exacc: exacc_platform(
        projects={
          prod: ['proj1'],
          preprod: ['proj1'],
        },
        emails={
          db_workloads: notification_emails.db_workloads,
          infra_workloads: notification_emails.infra_workloads,
          projects: notification_emails.projects,
        }
      ),
    },
  },

  hub_e_prod_preprod_exacc_uc1_config: self.hub_e_prod_preprod_exacc_config,

  hub_e_prod_preprod_exacc_uc2_config: exacc_no_network_base {
    shared_platforms: {
      exacc: exacc_platform(
        components=infra_and_db,
        emails={
          db_workloads: notification_emails.db_workloads,
          infra_workloads: notification_emails.infra_workloads,
        }
      ),
    },
    environments+: {
      prod+: {
        platforms+: {
          exacc: exacc_platform(
            projects=['proj1'],
            components=infra_and_db,
            emails={
              infra_workloads: notification_emails.infra_workloads,
              db_workloads: notification_emails.db_workloads,
              projects: notification_emails.projects,
            }
          ),
        },
      },
      preprod+: {
        platforms+: {
          exacc: exacc_platform(
            projects=['proj1'],
            components=infra_and_db,
            emails={
              infra_workloads: notification_emails.infra_workloads,
              db_workloads: notification_emails.db_workloads,
              projects: notification_emails.projects,
            }
          ),
        },
      },
    },
  },

  hub_e_prod_preprod_exacc_uc3_config: exacc_no_network_base {
    environments+: {
      prod+: {
        platforms+: {
          exacc: exacc_platform(
            projects=['proj1'],
            components=infra_and_db,
            emails={
              infra_workloads: notification_emails.infra_workloads,
              db_workloads: notification_emails.db_workloads,
              projects: notification_emails.projects,
            }
          ),
        },
      },
      preprod+: {
        platforms+: {
          exacc: exacc_platform(
            projects=['proj1'],
            components=infra_and_db,
            emails={
              infra_workloads: notification_emails.infra_workloads,
              db_workloads: notification_emails.db_workloads,
              projects: notification_emails.projects,
            }
          ),
        },
      },
    },
  },
}
