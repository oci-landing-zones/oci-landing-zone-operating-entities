
local exacc_identity = import '../exacc_identity.libsonnet';

exacc_identity + {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {

          'CMP-LZ-SHARED-EXACC-KEY': {
                name: 'cmp-lz-shared-exacc',
                description: 'Shared ExaDB-C@C Platform.',
                parent_id: 'CMP-LZ-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                },
                children: {
                  'CMP-LZ-SHARED-EXACC-DB-KEY': {
                    name: 'cmp-lz-shared-exacc-db',
                    description: 'Shared ExaDB-C@C Platform, db compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                    },
                  },
                  'CMP-LZ-SHARED-EXACC-INFRA-KEY': {
                    name: 'cmp-lz-shared-exacc-infra',
                    description: 'Shared ExaDB-C@C Platform, infra compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PROD-EXACC-KEY': {
                name: 'cmp-lz-prod-exacc',
                description: 'Prod ExaDB-C@C Platform.',
                parent_id: 'CMP-LZ-PROD-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                },
                children: {
                  'CMP-LZ-PROD-EXACC-DB-KEY': {
                    name: 'cmp-lz-prod-exacc-db',
                    description: 'Prod ExaDB-C@C Platform, db compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                    },
                  },
                  'CMP-LZ-PROD-EXACC-INFRA-KEY': {
                    name: 'cmp-lz-prod-exacc-infra',
                    description: 'Prod ExaDB-C@C Platform, infra compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PREPROD-EXACC-KEY': {
                name: 'cmp-lz-preprod-exacc',
                description: 'Preprod ExaDB-C@C Platform.',
                parent_id: 'CMP-LZ-PREPROD-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                },
                children: {
                  'CMP-LZ-PREPROD-EXACC-DB-KEY': {
                    name: 'cmp-lz-preprod-exacc-db',
                    description: 'Preprod ExaDB-C@C Platform, db compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                    },
                  },
                  'CMP-LZ-PREPROD-EXACC-INFRA-KEY': {
                    name: 'cmp-lz-preprod-exacc-infra',
                    description: 'Preprod ExaDB-C@C Platform, infra compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PROD-PROJ1-DB-KEY': {
            name: 'cmp-lz-prod-proj1-db',
            description: 'Prod ExaDB-C@C env database layer.',
            parent_id: 'CMP-LZ-PROD-PROJ1-KEY',
            defined_tags: {
              'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
            },
          },

          'CMP-LZ-PREPROD-PROJ1-DB-KEY': {
            name: 'cmp-lz-preprod-proj1-db',
            description: 'Preprod ExaDB-C@C env database layer.',
            parent_id: 'CMP-LZ-PREPROD-PROJ1-KEY',
            defined_tags: {
              'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
            },
          },
        },
      },
}






 
