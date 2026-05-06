local defaults = import '../../defaults.libsonnet';

local notification_emails = {
  default: ['exacc-platform-team@example.com'],
  db_workloads: ['exacc-db-team@example.com'],
  infra_workloads: ['exacc-infra-team@example.com'],
  projects: ['exacc-project-team@example.com'],
};

local shared_exacc_platform = {
  extension: {
    type: 'exacc',
    params: {
      notification_emails: {
        default: notification_emails.default,
        db_workloads: notification_emails.db_workloads,
        infra_workloads: notification_emails.infra_workloads,
      },
    },
  },
};

local env_exacc_platform(projects) = {
  extension: {
    type: 'exacc',
    params: {
      project_db_compartments: projects,
      notification_emails: {
        default: notification_emails.default,
        projects: notification_emails.projects,
      },
    },
  },
};

{
  notification_emails: notification_emails,

  hub_e_prod_preprod_exacc_config: defaults.hub_e {
    shared_platforms: {
      exacc: shared_exacc_platform,
    },
    environments+: {
      prod+: {
        platforms+: {
          exacc: env_exacc_platform(['proj1']),
        },
      },
      preprod+: {
        platforms+: {
          exacc: env_exacc_platform(['proj1']),
        },
      },
    },
  },
}
