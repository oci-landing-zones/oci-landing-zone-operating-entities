local base = import './templates/oe1_iam.json';

base + {
  identity_domain_groups_configuration+: {
    ignore_external_membership_updates: true,
  },
}
