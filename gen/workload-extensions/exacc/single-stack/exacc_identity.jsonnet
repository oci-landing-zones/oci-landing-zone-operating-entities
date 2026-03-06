local one_oe = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_iam.json';
local exacc_identity = import '../exacc_identity.libsonnet';

one_oe + exacc_identity + {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LANDINGZONE-KEY'+: {
        children+: {
          'CMP-LZ-PROD-KEY'+: {
            children+: {
              'CMP-LZ-PROD-PLATFORM-KEY'+: {
                children+: {
                  'CMP-LZ-PROD-PLATFORM-EXACC-KEY': {
                    name: 'cmp-lz-exacc',
                    description: 'ExaCC Shared Platform',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                    },
                    children: {
                      'CMP-LZ-EXACC-DB-KEY': {
                        name: 'cmp-lz-exacc-db',
                        description: 'Shared exacc Platform, db compartment',
                        defined_tags: {
                          'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                        },
                      },
                      'CMP-LZ-EXACC-INFRA-KEY': {
                        name: 'cmp-lz-exacc-infra',
                        description: 'Shared exacc Platform, infra compartment',
                        defined_tags: {
                          'tagns-lz-role.tag-lz-role': 'lz-exacc-infra-admin',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}






 
