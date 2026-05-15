// IAM builder emits explicit identity-domain group membership drift handling
// contains: "ignore_external_membership_updates": true
local lz = import 'gen/landing_zone.libsonnet';

local result = lz({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
});

std.manifestJsonEx({
  ignore_external_membership_updates:
    result.iam.identity_domain_groups_configuration.ignore_external_membership_updates,
}, '  ')
