{
  groups_configuration+: {
    groups: {
      'GRP-LZ-PROD-PLATFORM-OKE-ADMINS-KEY': {
        name: 'grp-lz-prod-platform-oke-admins',
        description: 'Prod OKE Cluster Management Admin',
      },

      'GRP-LZ-PROD-PLATFORM-OKE-RBAC-ADMIN-KEY': {
        name: 'grp-lz-prod-platform-oke-rbac-admin',
        description: 'Prod OKE RBAC Admin',
      },

      'GRP-LZ-PROD-PLATFORM-OKE-RBAC-VIEWER-KEY': {
        name: 'grp-lz-prod-platform-oke-rbac-viewer',
        description: 'Prod OKE RBAC Viewer',
      },
    },
  },

  policies_configuration+: {
    supplied_policies+: {
      'PCY-LZ-PROD-PLATFORM-OKE-ADMINS-KEY': {
        name: 'pcy-lz-prod-platform-oke-admins',
        description: 'allow grp-lz-prod-platform-oke-admins to manage OKE resources',
        compartment_id: 'TENANCY-ROOT',

        statements: [
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to read all-resources in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-platform-oke",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to manage cluster-family in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-platform-oke",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to manage instance-family in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-platform-oke",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to use vnics in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-platform-oke",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to inspect compartments in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-platform-oke",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to read virtual-network-family in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-network",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to use subnets in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-network",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to use network-security-groups in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-network",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to use vnics in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-network",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-admins' to manage private-ips in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-network",
        ],
      },

      'PCY-LZ-PROD-PLATFORM-OKE-RBAC-ROLE-KEY': {
        name: 'pcy-lz-prod-platform-oke-rbac-roles',
        description: 'allow rbac roles to access OKE Prod Cluster',
        compartment_id: 'TENANCY-ROOT',

        statements: [
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-rbac-admin' to use cluster in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-platform-oke",
          "Allow group 'id_lz_common'/'grp-lz-prod-platform-oke-rbac-viewer' to use cluster in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-platform-oke",
        ],
      },

      'PCY-LZ-PROD-PLATFORM-OKE-VCN-CNI-KEY': {
        name: 'pcy-lz-prod-platform-oke-vcn-cni',
        description: '(unsafe) Grant OKE clusters tenancy wide permissions to use resource',
        compartment_id: 'TENANCY-ROOT',
        '//': 'This is potentially unsafe as it can be used for privilige escalation across environments. See https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengpodnetworking_topic-OCI_CNI_plugin.htm for restricting permissions.',

        statements: [
          "allow any-user to manage instances in tenancy where all { request.principal.type = 'cluster'}",
          "allow any-user to use private-ips in tenancy where all { request.principal.type = 'cluster'}",
          "allow any-user to use network-security-groups in tenancy where all { request.principal.type = 'cluster'}",
        ],
      },
    },
  },
}
