local exacc_identity = import '../exacc_identity.libsonnet';

exacc_identity  {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LZ-EXACC-KEY': {
        name: 'cmp-lz-exacc',
        description: 'ExaCC shared Platform',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
        },
        parent_id: 'CMP-LZ-PLATFORM-KEY',
      },
      'CMP-LZ-EXACC-DB-KEY': {
        name: 'cmp-lz-exacc-db',
        description: 'Shared exacc Platform, db compartment',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
        },
        parent_id: 'CMP-LZ-EXACC-KEY',
      },
      'CMP-LZ-EXACC-INFRA-KEY': {
        name: 'cmp-lz-exacc-infra',
        description: 'Shared exacc Platform, infra compartment',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
        },
        parent_id: 'CMP-LZ-EXACC-KEY',
      },
      'CMP-LZ-PROD-EXACC-KEY': {
        name: 'cmp-lz-prod-exacc',
        description: 'ExaCC Shared Platform',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
        },
        parent_id: 'CMP-LZ-PROD-PLATFORM-KEY',
      },
      'CMP-LZ-PROD-EXACC-DB-KEY': {
        name: 'cmp-lz-prod-exacc-db',
        description: 'Shared exacc Platform, db compartment',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
        },
        parent_id: 'CMP-LZ-PROD-EXACC-KEY',
      },
      'CMP-LZ-PROD-EXACC-INFRA-KEY': {
        name: 'cmp-lz-prod-exacc-infra',
        description: 'Shared exacc Platform, infra compartment',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
        },
        parent_id: 'CMP-LZ-PROD-EXACC-KEY',
      },
      'CMP-LZ-PROD-PROJ1-DB-KEY': {
        name: 'cmp-lz-prod-proj1-db',
        description: 'ExaCC Prod env database layer',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
        },
        parent_id: 'CMP-LZ-PROD-PROJ1-KEY',
      },
      'CMP-LZ-PREPROD-PLATFORM-EXACC-KEY': {
        name: 'cmp-lz-preprod-exacc',
        description: 'ExaCC Shared Platform',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
        },
        parent_id: 'CMP-LZ-PREPROD-PLATFORM-KEY',
      },
      'CMP-LZ-PREPROD-EXACC-DB-KEY': {
        name: 'cmp-lz-preprod-exacc-db',
        description: 'Shared exacc Platform, db compartment',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
        },
        parent_id: 'CMP-LZ-PREPROD-EXACC-KEY',
      },
      'CMP-LZ-PREPROD-EXACC-INFRA-KEY': {
        name: 'cmp-lz-preprod-exacc-infra',
        description: 'Shared exacc Platform, infra compartment',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
        },
        parent_id: 'CMP-LZ-PREPROD-EXACC-KEY',
      },
      'CMP-LZ-PREPROD-PROJ1-DB-KEY': {
        name: 'cmp-lz-preprod-proj1-db',
        description: 'ExaCC PreProd env database layer',
        defined_tags: {
          'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
        },
        parent_id: 'CMP-LZ-PREPROD-PROJ1-KEY',
      },
    },
  },
}


