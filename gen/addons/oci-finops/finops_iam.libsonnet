{
  compartments_configuration+: {
    compartments+: {
      'CMP-LANDINGZONE-KEY'+: {
        children+: {
          'CMP-LZ-PLATFORM-KEY'+: {
            children+: {
              'CMP-LZ-PLATFORM-FINOPS-KEY': {
                name: 'cmp-lz-platform-finops',
                description: 'FinOps Platform Environment',
              },
            },
          },
        },
      },
    },
  },

  dynamic_groups_configuration+: {
    dynamic_groups+: {
      'DG-LZ-PLATFORM-FINOPS-ADB-KEY': {
        name: 'dg-lz-platform-finops-adb',
        description: 'Dynamic group for Autonomous Databases in the lz-platform-finops compartment.',
        matching_rule: "ALL {resource.type = 'autonomousdatabase', resource.compartment.id = 'CMP-LZ-PLATFORM-FINOPS-KEY'}",
      },
    },
  },

  identity_domain_groups_configuration+: {
    default_identity_domain_id: 'COMMON-DOMAIN',

    groups+: {
      'GRP-LZ-PLATFORM-FINOPS-ADMINS-KEY': {
        name: 'grp-lz-platform-finops-admins',
        description: 'One-OE Landing Zone, Shared FinOps platform administration group.',
      },
    },
  },

  policies_configuration+: {
    supplied_policies+: {
      'PCY-LZ-FINOPS-ADB-RP-KEY': {
        name: 'pcy-lz-finops-adb-rp',
        description: 'Policy to allow ADB resource principal to access object storage reports.',
        compartment_id: 'TENANCY-ROOT',

        statements: [
          'define tenancy reporting as ocid1.tenancy.oc1..aaaaaaaaned4fkpkisbwjlr56u7cj63lf3wffbilvqknstgtvzub7vhqkggq',
          'endorse dynamic-group dg-lz-platform-finops-adb to read objects in tenancy reporting',
        ],
      },

      'PCY-LZ-FINOPS-ADMIN-KEY': {
        name: 'pcy-lz-finops-administration',
        description: 'Policy to allow FinOps admins to manage FinOps platform resources.',
        compartment_id: 'TENANCY-ROOT',

        statements: [
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to read virtual-network-family in compartment cmp-landingzone:cmp-lz-network",
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to use subnets in compartment cmp-landingzone:cmp-lz-network",
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to use network-security-groups in compartment cmp-landingzone:cmp-lz-platform:cmp-lz-platform-finops",
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to manage private-ips in compartment cmp-landingzone:cmp-lz-network",
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to manage autonomous-database-family in compartment cmp-landingzone:cmp-lz-platform:cmp-lz-platform-finops",
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to manage bastion-family in compartment cmp-landingzone:cmp-lz-platform:cmp-lz-platform-finops",
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to manage data-safe-family in compartment cmp-landingzone:cmp-lz-platform:cmp-lz-platform-finops",
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to manage vaults in compartment cmp-landingzone:cmp-lz-platform:cmp-lz-platform-finops",
          "allow group 'id_lz_common'/'grp-lz-platform-finops-admins' to manage secret-family in compartment cmp-landingzone:cmp-lz-platform:cmp-lz-platform-finops",
        ],
      },
    },
  },
}
