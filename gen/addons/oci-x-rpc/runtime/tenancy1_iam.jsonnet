local base = import './templates/connectivity-hub_iam.json';

base + {
  identity_domain_groups_configuration+: {
    ignore_external_membership_updates: true,
  },
}
