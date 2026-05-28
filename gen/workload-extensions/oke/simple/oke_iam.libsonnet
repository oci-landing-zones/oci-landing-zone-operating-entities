// OKE identity output builder.

local desc = import '../../../descriptions.libsonnet';

function(ctx) {
  local n = ctx.n,
  local root = self,
  local cmp_path = ctx.scope.compartment_path,
  local net_path = ctx.scope.network_compartment_path,

  groups_configuration+: {
    groups+: {
      [n.key_global('GRP', [ctx.env, 'PLATFORM', ctx.plat, 'ADMINS'])]: {
        name: root._group_names.admins,
        description: desc.group.platform(ctx.env_long_title, 'OKE', 'cluster management administration'),
      },
      [n.key_global('GRP', [ctx.env, 'PLATFORM', ctx.plat, 'RBAC-ADMIN'])]: {
        name: root._group_names.rbac_admin,
        description: desc.group.platform(ctx.env_long_title, 'OKE', 'Kubernetes RBAC administration'),
      },
      [n.key_global('GRP', [ctx.env, 'PLATFORM', ctx.plat, 'RBAC-VIEWER'])]: {
        name: root._group_names.rbac_viewer,
        description: desc.group.platform(ctx.env_long_title, 'OKE', 'Kubernetes RBAC viewer'),
      },
    },
  },

  policies_configuration+: {
    supplied_policies+: {
      [n.key_global('PCY', [ctx.env, 'PLATFORM', ctx.plat, 'ADMINS'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['admins']),
        description: desc.policy.grants(
          root._group_names.admins,
          'OKE platform administration access',
          'the %s environment OKE platform and network compartments' % ctx.env_long_title
        ),
        compartment_id: 'TENANCY-ROOT',

        statements: [
          "allow group 'id_lz_common'/'%s' to read all-resources in compartment %s" % [root._group_names.admins, cmp_path],
          "allow group 'id_lz_common'/'%s' to manage cluster-family in compartment %s" % [root._group_names.admins, cmp_path],
          "allow group 'id_lz_common'/'%s' to manage instance-family in compartment %s" % [root._group_names.admins, cmp_path],
          "allow group 'id_lz_common'/'%s' to use vnics in compartment %s" % [root._group_names.admins, cmp_path],
          "allow group 'id_lz_common'/'%s' to inspect compartments in compartment %s" % [root._group_names.admins, cmp_path],
          "allow group 'id_lz_common'/'%s' to read virtual-network-family in compartment %s" % [root._group_names.admins, net_path],
          "allow group 'id_lz_common'/'%s' to use subnets in compartment %s" % [root._group_names.admins, net_path],
          "allow group 'id_lz_common'/'%s' to use network-security-groups in compartment %s" % [root._group_names.admins, net_path],
          "allow group 'id_lz_common'/'%s' to use vnics in compartment %s" % [root._group_names.admins, net_path],
          "allow group 'id_lz_common'/'%s' to manage private-ips in compartment %s" % [root._group_names.admins, net_path],
        ],
      },

      [n.key_global('PCY', [ctx.env, 'PLATFORM', ctx.plat, 'RBAC-ROLE'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['rbac-roles']),
        description: desc.policy.grants(
          'OKE RBAC administrator and viewer groups',
          'Kubernetes cluster access',
          'the %s environment OKE platform compartment' % ctx.env_long_title
        ),
        compartment_id: 'TENANCY-ROOT',

        statements: [
          "allow group 'id_lz_common'/'%s' to use cluster in compartment %s" % [root._group_names.rbac_admin, cmp_path],
          "allow group 'id_lz_common'/'%s' to use cluster in compartment %s" % [root._group_names.rbac_viewer, cmp_path],
        ],
      },

      [n.key_global('PCY', [ctx.env, 'PLATFORM', ctx.plat, 'VCN-CNI'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['vcn-cni']),
        description: desc.policy.unsafe_grants(
          'OKE clusters',
          'tenancy-wide VCN CNI permissions for instance, private IP, and network security group resources'
        ),
        compartment_id: 'TENANCY-ROOT',
        '//': 'This is potentially unsafe as it can be used for privilege escalation across environments. See https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengpodnetworking_topic-OCI_CNI_plugin.htm for restricting permissions.',

        statements: [
          "allow any-user to manage instances in tenancy where all { request.principal.type = 'cluster'}",
          "allow any-user to use private-ips in tenancy where all { request.principal.type = 'cluster'}",
          "allow any-user to use network-security-groups in tenancy where all { request.principal.type = 'cluster'}",
        ],
      },
    },
  },

  _group_names:: {
    admins: n.display_global('grp', ctx.display_segments + ['admins']),
    rbac_admin: n.display_global('grp', ctx.display_segments + ['rbac-admin']),
    rbac_viewer: n.display_global('grp', ctx.display_segments + ['rbac-viewer']),
  },
}
