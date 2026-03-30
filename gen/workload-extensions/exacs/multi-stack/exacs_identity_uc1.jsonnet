local exacs_identity = import '../exacs_identity.libsonnet';

exacs_identity + {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {

          'CMP-LZ-SHARED-EXACS-KEY': {
                name: 'cmp-lz-shared-exacs',
                description: 'ExaCC shared Platform',
                parent_id: 'CMP-LZ-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacs-admin',
                },
                children: {
                  'CMP-LZ-SHARED-EXACS-DB-KEY': {
                    name: 'cmp-lz-shared-exacs-db',
                    description: 'Shared exacs Platform, db compartment',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
                    },
                  },
                  'CMP-LZ-SHARED-EXACS-INFRA-KEY': {
                    name: 'cmp-lz-shared-exacs-infra',
                    description: 'Shared exacs Platform, infra compartment',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PROD-EXACS-KEY': {
                name: 'cmp-lz-prod-exacs',
                description: 'Prod Exacs Platform',
                parent_id: 'CMP-LZ-PROD-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacs-admin',
                },
                children: {
                  'CMP-LZ-PROD-EXACS-DB-KEY': {
                    name: 'cmp-lz-prod-exacs-db',
                    description: 'Prod Exacs Platform, db compartment',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
                    },
                  },
                  'CMP-LZ-PROD-EXACS-INFRA-KEY': {
                    name: 'cmp-lz-prod-exacs-infra',
                    description: 'Prod Exacs Platform, infra compartment',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PREPROD-EXACS-KEY': {
                name: 'cmp-lz-preprod-exacs',
                description: 'Preprod exacs Platform',
                parent_id: 'CMP-LZ-PREPROD-PLATFORM-KEY',

                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacs-admin',
                },
                children: {
                  'CMP-LZ-PREPROD-EXACS-DB-KEY': {
                    name: 'cmp-lz-preprod-exacs-db',
                    description: 'Preprod exacs Platform, db compartment',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
                    },
                  },
                  'CMP-LZ-PREPROD-EXACS-INFRA-KEY': {
                    name: 'cmp-lz-preprod-exacs-infra',
                    description: 'Preprod exacs Platform, infra compartment',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-infra-admin',
                    },
                  },
                },
              
            
          },

          'CMP-LZ-PROD-PROJ1-DB-KEY': {
            name: 'cmp-lz-prod-proj1-db',
            description: 'Prod ExaCC env database layer',
            parent_id: 'CMP-LZ-PROD-PROJ1-KEY',
            defined_tags: {
              'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
            },
          },

          'CMP-LZ-PREPROD-PROJ1-DB-KEY': {
            name: 'cmp-lz-preprod-proj1-db',
            description: 'Preprod ExaCC env database layer',
            parent_id: 'CMP-LZ-PREPROD-PROJ1-KEY',
            defined_tags: {
              'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
            },
          },
        },
      },
}






 
