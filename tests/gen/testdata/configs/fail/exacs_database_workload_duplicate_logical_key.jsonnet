// ExaCS database-workload infrastructure logical keys must be unique across generated scopes.
// error_contains: exacs_database_workload.infrastructure contains duplicate logical key: infra_duplicate
local emails = {
  default: ['exacs-platform@example.com'],
  db_workloads: ['exacs-db@example.com'],
  infra_workloads: ['exacs-infra@example.com'],
  projects: ['exacs-projects@example.com'],
};
local platform(cidr) = {
  network: { vcn: cidr },
  extension: {
    type: 'exacs',
    params: {
      notification_emails: emails,
      exacs_database_workload: {
        infrastructure: {
          cloud_exadata_infrastructures: {
            infra_duplicate: { display_name: 'infra-duplicate', shape: 'Exadata.X11M' },
          },
        },
      },
    },
  },
};
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: { platforms: { exacs: platform('10.0.24.0/21') } },
    preprod: { platforms: { exacs: platform('10.0.32.0/21') } },
  },
}
