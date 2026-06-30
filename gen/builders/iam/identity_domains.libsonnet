// gen/builders/iam/identity_domains.libsonnet
// Identity domain groups and domain definitions for the IAM output.

{
  groups(ctx)::
    local n = ctx.n;
    local topo = ctx.topo;
    local desc = ctx.desc;
    local env_entries = ctx.env_entries;

    // --- Identity domain groups ---

    // Per-environment per-project admin groups
    local env_project_groups = std.foldl(
      function(acc, entry)
        local project_names = topo.project_names(entry);
        acc + std.foldl(
          function(gacc, proj_name)
            gacc + {
              [n.key_global('GRP', entry.key_segments + [proj_name, 'ADMIN'])]: {
                name: ctx.proj_grp_name(entry, proj_name),
                description: desc.group.project(ctx.env_desc(entry.env_name), proj_name, 'administration'),
              },
            },
          project_names,
          {}
        ),
      env_entries,
      {}
    );

    {
      default_identity_domain_id: 'COMMON-DOMAIN',
      ignore_external_membership_updates: true,
      groups: {
        [n.key_tenancy('GRP', ['AUDITORS', 'ADMIN'])]: {
          name: n.display_tenancy('GRP', ['AUDITORS', 'ADMIN']),
          description: desc.group.tenancy('audit and read-only'),
        },
        [n.key_tenancy('GRP', ['COST', 'ADMIN'])]: {
          name: n.display_tenancy('GRP', ['COST', 'ADMIN']),
          description: desc.group.tenancy('cost management'),
        },
        [n.key_tenancy('GRP', ['IAM', 'ADMIN'])]: {
          name: n.display_tenancy('GRP', ['IAM', 'ADMIN']),
          description: desc.group.tenancy('IAM administration'),
        },
        [n.key_global('GRP', ['NETWORK', 'ADMIN'])]: {
          name: n.display_global('GRP', ['NETWORK', 'ADMIN']),
          description: desc.group.landing_zone('shared', 'network administration'),
        },
      } + env_project_groups + {
        [n.key_global('GRP', ['SECURITY', 'ADMIN'])]: {
          name: n.display_global('GRP', ['SECURITY', 'ADMIN']),
          description: desc.group.landing_zone('shared', 'security administration'),
        },
        [n.key_tenancy('GRP', ['SECURITY', 'ADMIN'])]: {
          name: n.display_tenancy('GRP', ['SECURITY', 'ADMIN']),
          description: desc.group.tenancy('security service administration'),
        },
      },
    },

  domains(ctx)::
    // --- Identity domains ---
    {
      default_compartment_id: null,
      default_defined_tags: null,
      default_freeform_tags: null,
      identity_domains: {
        'COMMON-DOMAIN': {
          display_name: 'id_lz_common',
          description: 'One-OE LZ common Identity Domain',
          compartment_id: null,
          admin_email: null,
          admin_first_name: null,
          admin_last_name: null,
          admin_user_name: null,
          allow_signing_cert_public_access: false,
          home_region: null,
          is_hidden_on_login: false,
          is_notification_bypassed: false,
          is_primary_email_required: false,
          license_type: 'free',
          replica_region: null,
        },
      },
    },
}
