
local exacc_identity = import '../exacc_identity.libsonnet';

exacc_identity + {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {

          'CMP-LZ-SHARED-EXACC-KEY': {
                name: 'cmp-lz-shared-exacc',
                description: 'shared ExaDB-C@C platform.',
                parent_id: 'CMP-LZ-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                },
                children: {
                  'CMP-LZ-SHARED-EXACC-DB-KEY': {
                    name: 'cmp-lz-shared-exacc-db',
                    description: 'shared ExaDB-C@C platform, db compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                    },
                  },
                  'CMP-LZ-SHARED-EXACC-INFRA-KEY': {
                    name: 'cmp-lz-shared-exacc-infra',
                    description: 'shared ExaDB-C@C platform, infra compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PROD-EXACC-KEY': {
                name: 'cmp-lz-prod-exacc',
                description: 'prod ExaDB-C@C platform.',
                parent_id: 'CMP-LZ-PROD-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                },
                children: {
                  'CMP-LZ-PROD-EXACC-DB-KEY': {
                    name: 'cmp-lz-prod-exacc-db',
                    description: 'prod ExaDB-C@C platform, db compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                    },
                  },
                  'CMP-LZ-PROD-EXACC-INFRA-KEY': {
                    name: 'cmp-lz-prod-exacc-infra',
                    description: 'prod ExaDB-C@C platform, infra compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PREPROD-EXACC-KEY': {
                name: 'cmp-lz-preprod-exacc',
                description: 'preprod ExaDB-C@C platform.',
                parent_id: 'CMP-LZ-PREPROD-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                },
                children: {
                  'CMP-LZ-PREPROD-EXACC-DB-KEY': {
                    name: 'cmp-lz-preprod-exacc-db',
                    description: 'preprod ExaDB-C@C platform, db compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                    },
                  },
                  'CMP-LZ-PREPROD-EXACC-INFRA-KEY': {
                    name: 'cmp-lz-preprod-exacc-infra',
                    description: 'preprod ExaDB-C@C platform, infra compartment.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PROD-PROJ1-DB-KEY': {
            name: 'cmp-lz-prod-proj1-db',
            description: 'prod ExaDB-C@C env database layer.',
            parent_id: 'CMP-LZ-PROD-PROJ1-KEY',
            defined_tags: {
              'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
            },
          },

          'CMP-LZ-PREPROD-PROJ1-DB-KEY': {
            name: 'cmp-lz-preprod-proj1-db',
            description: 'preprod ExaDB-C@C env database layer.',
            parent_id: 'CMP-LZ-PREPROD-PROJ1-KEY',
            defined_tags: {
              'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
            },
          },
        },
      },
}






 
