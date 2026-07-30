// OKE identity output builder.

local desc = import '../../../descriptions.libsonnet';

function(ctx) {
  local n = ctx.n,
  local root = self,
  local cmp_path = ctx.scope.compartment_path,
  local net_path = ctx.scope.network_compartment_path,
  // Policies attached to their target compartment must use its short name, not a root-relative path.
  local cmp_name = ctx.scope.compartment_name,
  // Policies target the owning OKE compartment. Principal/target compartment
  // equality ensures that only the cluster or node pool in that compartment
  // can use them, without relying on the platform tag or literal OCIDs.
  local cluster_compartment_source_conditions = [
    "request.principal.type = 'cluster'",
    'request.principal.compartment.id = target.compartment.id',
  ],
  local nodepool_compartment_source_conditions = [
    "request.principal.type = 'nodepool'",
    'request.principal.compartment.id = target.compartment.id',
  ],
  groups_configuration+: {
    groups+: {
      [n.key_global('GRP', ctx.key_segments + ['ADMINS'])]: {
        name: root._group_names.admins,
        description: desc.group.platform(ctx.env_long_title, 'OKE', 'cluster management administration'),
      },
      [n.key_global('GRP', ctx.key_segments + ['RBAC-ADMIN'])]: {
        name: root._group_names.rbac_admin,
        description: desc.group.platform(ctx.env_long_title, 'OKE', 'Kubernetes RBAC administration'),
      },
      [n.key_global('GRP', ctx.key_segments + ['RBAC-VIEWER'])]: {
        name: root._group_names.rbac_viewer,
        description: desc.group.platform(ctx.env_long_title, 'OKE', 'Kubernetes RBAC viewer'),
      },
    },
  },

  policies_configuration+: {
    supplied_policies+: {
      [n.key_global('PCY', ctx.key_segments + ['ADMINS'])]: {
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
          "allow group 'id_lz_common'/'%s' to use compute-capacity-reservations in compartment %s" % [root._group_names.admins, cmp_path],
        ],
      },

      [n.key_global('PCY', ctx.key_segments + ['RBAC-ROLE'])]: {
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

    } + {

      [n.key_global('PCY', ctx.key_segments + ['SERVICE', 'COMPUTE'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['service', 'compute']),
        description: desc.policy.grants(
          'OKE service, clusters, and node pools',
          'compute and capacity-reservation permissions for OKE-managed resources',
          'the %s environment OKE platform compartment' % ctx.env_long_title
        ),
        compartment_id: ctx.cmp_key,

        statements: [
          "allow any-user to manage instances in compartment %s where all { %s }" % [
            cmp_name,
            std.join(', ', cluster_compartment_source_conditions),
          ],
          "allow any-user to read instance-images in compartment %s where all { %s }" % [
            cmp_name,
            std.join(', ', cluster_compartment_source_conditions),
          ],
          "allow service oke to use compute-capacity-reservations in compartment %s" % cmp_name,
          "allow any-user to use compute-capacity-reservations in compartment %s where all { %s }" % [
            cmp_name,
            std.join(', ', nodepool_compartment_source_conditions),
          ],
        ],
      },

    } + (if ctx.public_load_balancer || ctx.cis_level == 2 then {
      [n.key_global('PCY', ctx.key_segments + ['SERVICE', 'SECURITY'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['service', 'security']),
        description: desc.policy.grants(
          'security administrators and the OKE platform resource principals',
          'the enabled platform-scoped certificate and CIS2 encryption-key permissions',
          'the %s environment OKE platform compartment' % ctx.env_long_title
        ),
        compartment_id: ctx.cmp_key,

        statements: (if ctx.public_load_balancer then [
          "allow group 'id_lz_common'/'%s' to manage leaf-certificate-family in compartment %s" % [
            n.display_global('grp', ['security', 'admin']),
            cmp_name,
          ],
          // OKE's OCI Certificates integration requires the aggregate leaf
          // certificate family grant. The owning platform compartment is the
          // target boundary and must contain only certificates approved for
          // its cluster.
          "allow any-user to manage leaf-certificate-family in compartment %s where all { %s }" % [
            cmp_name,
            "request.principal.type = 'cluster'",
          ],
        ] else []) + (if ctx.cis_level == 2 then [
          // The platform compartment contains one OKE cluster and one
          // cluster-specific key. Compartment placement is the target boundary;
          // no key OCID or target-key tag condition is required.
          "allow group 'id_lz_common'/'%s' to manage keys in compartment %s" % [
            n.display_global('grp', ['security', 'admin']),
            cmp_name,
          ],
          "allow any-user to use keys in compartment %s where all { %s }" % [
            cmp_name,
            std.join(', ', cluster_compartment_source_conditions),
          ],
          "allow any-user to use key-delegate in compartment %s where all { %s }" % [
            cmp_name,
            std.join(', ', nodepool_compartment_source_conditions),
          ],
        ] else []),
      },
    } else {}) + {

      [n.key_global('PCY', ctx.key_segments + ['SERVICE', 'STORAGE'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['service', 'storage']),
        description: desc.policy.grants(
          'OKE clusters',
          if ctx.create_fss then
            'persistent volume, backup, and file storage permissions'
          else
            'persistent volume and backup permissions',
          'the %s environment OKE platform compartment' % ctx.env_long_title
        ),
        compartment_id: ctx.cmp_key,

        statements: [
          "allow any-user to manage volume-backups in compartment %s where all { %s }" % [
            cmp_name,
            std.join(', ', cluster_compartment_source_conditions),
          ],
          "allow any-user to use volumes in compartment %s where all { %s }" % [
            cmp_name,
            std.join(', ', cluster_compartment_source_conditions),
          ],
        ] + (if ctx.create_fss then [
          "allow any-user to manage file-family in compartment %s where all { %s }" % [
            cmp_name,
            std.join(', ', cluster_compartment_source_conditions),
          ],
        ] else []),
      },

    },
  },

  _group_names:: {
    admins: n.display_global('grp', ctx.display_segments + ['admins']),
    rbac_admin: n.display_global('grp', ctx.display_segments + ['rbac-admin']),
    rbac_viewer: n.display_global('grp', ctx.display_segments + ['rbac-viewer']),
  },
}
