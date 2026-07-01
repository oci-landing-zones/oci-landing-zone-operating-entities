// OKE identity output builder.

local desc = import '../../../descriptions.libsonnet';

function(ctx) {
  local n = ctx.n,
  local root = self,
  local cmp_path = ctx.scope.compartment_path,
  local net_path = ctx.scope.network_compartment_path,
  // Policies attached to their target compartment must use its short name, not a root-relative path.
  local cmp_name = ctx.scope.compartment_name,
  local net_name =
    if ctx.scope.scope_type == 'shared' then n.display_global('cmp', ['network'])
    else n.display_global('cmp', [ctx.env, 'network']),
  local security_cmp_name = n.display_global('cmp', ['security']),
  local hub_network_cmp_name = n.display_global('cmp', ['network']),

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

      [n.key_global('PCY', [ctx.env, 'PLATFORM', ctx.plat, 'SERVICE', 'NETWORK'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['service', 'network']),
        description: desc.policy.unsafe_grants(
          'OKE clusters',
          'network and load balancer permissions for OKE-managed resources'
        ),
        compartment_id: ctx.scope.network_compartment_key,

        statements: [
          "allow any-user to use private-ips in compartment %s where all { request.principal.type = 'cluster' }" % net_name,
          "allow any-user to manage network-security-groups in compartment %s where all { request.principal.type = 'cluster' }" % net_name,
          "allow any-user to manage vcns in compartment %s where all { request.principal.type = 'cluster' }" % net_name,
          "allow any-user to manage load-balancers in compartment %s where all { request.principal.type = 'cluster' }" % net_name,
          "allow any-user to manage network-load-balancers in compartment %s where all { request.principal.type = 'cluster' }" % net_name,
        ],
      },

      [n.key_global('PCY', ['OKE', 'SERVICE', 'NETWORK', 'HUB'])]: {
        name: n.display_global('pcy', ['oke', 'service', 'network', 'hub']),
        description: desc.policy.grants(
          'OKE clusters',
          'network and load balancer permissions for OKE-managed public load balancers',
          'the Landing Zone shared hub network compartment'
        ),
        compartment_id: n.key_global('CMP', ['NETWORK']),

        statements: [
          "allow any-user to manage public-ips in compartment %s where all { request.principal.type = 'cluster' }" % hub_network_cmp_name,
          "allow any-user to use private-ips in compartment %s where all { request.principal.type = 'cluster' }" % hub_network_cmp_name,
          "allow any-user to manage floating-ips in compartment %s where all { request.principal.type = 'cluster' }" % hub_network_cmp_name,
          "allow any-user to manage network-security-groups in compartment %s where all { request.principal.type = 'cluster' }" % hub_network_cmp_name,
          "allow any-user to manage vcns in compartment %s where all { request.principal.type = 'cluster' }" % hub_network_cmp_name,
          "allow any-user to manage load-balancers in compartment %s where all { request.principal.type = 'cluster' }" % hub_network_cmp_name,
          "allow any-user to manage network-load-balancers in compartment %s where all { request.principal.type = 'cluster' }" % hub_network_cmp_name,
        ],
      },

      [n.key_global('PCY', [ctx.env, 'PLATFORM', ctx.plat, 'SERVICE', 'COMPUTE'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['service', 'compute']),
        description: desc.policy.grants(
          'OKE clusters',
          'compute permissions for OKE-managed resources',
          'the %s environment OKE platform compartment' % ctx.env_long_title
        ),
        compartment_id: ctx.cmp_key,

        statements: [
          "allow any-user to manage instances in compartment %s where all { request.principal.type = 'cluster' }" % cmp_name,
          "allow any-user to read instance-images in compartment %s where all { request.principal.type = 'cluster' }" % cmp_name,
        ],
      },

      [n.key_global('PCY', ['OKE', 'SERVICE', 'SECURITY'])]: {
        name: n.display_global('pcy', ['oke', 'service', 'security']),
        description: desc.policy.grants(
          'OKE clusters, node pools, and the Block Storage service',
          'key and certificate authority permissions for OKE-managed resources and persistent volumes',
          'the Landing Zone shared security compartment'
        ),
        compartment_id: n.key_global('CMP', ['SECURITY']),

        statements: [
          "allow any-user to use keys in compartment %s where all { request.principal.type = 'cluster' }" % security_cmp_name,
          "allow any-user to use key-delegate in compartment %s where all { request.principal.type = 'nodepool' }" % security_cmp_name,
          "allow any-user to use key-delegate in compartment %s where all { request.principal.type = 'cluster' }" % security_cmp_name,
          "allow any-user to manage certificate-authority-family in compartment %s where all { request.principal.type = 'cluster' }" % security_cmp_name,
          'allow service blockstorage to use keys in compartment %s' % security_cmp_name,
        ],
      },

      [n.key_global('PCY', [ctx.env, 'PLATFORM', ctx.plat, 'SERVICE', 'STORAGE'])]: {
        name: n.display_global('pcy', ctx.display_segments + ['service', 'storage']),
        description: desc.policy.grants(
          'OKE clusters',
          'persistent volume, backup, and file storage permissions',
          'the %s environment OKE platform compartment' % ctx.env_long_title
        ),
        compartment_id: ctx.cmp_key,

        statements: [
          "allow any-user to manage volume-backups in compartment %s where all { request.principal.type = 'cluster' }" % cmp_name,
          "allow any-user to use volumes in compartment %s where all { request.principal.type = 'cluster' }" % cmp_name,
          "allow any-user to manage file-family in compartment %s where all { request.principal.type = 'cluster' }" % cmp_name,
        ],
      },

      [n.key_global('PCY', ['OKE', 'SERVICE', 'TAGGING'])]: {
        name: n.display_global('pcy', ['oke', 'service', 'tagging']),
        description: desc.policy.grants(
          'OKE clusters',
          'tag namespace permissions for OKE-managed resources',
          'the Landing Zone role tag namespace'
        ),
        compartment_id: 'TENANCY-ROOT',

        statements: [
          "allow any-user to use tag-namespaces in tenancy where all { request.principal.type = 'cluster', target.tag-namespace.name = 'tagns-lz-role' }",
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
