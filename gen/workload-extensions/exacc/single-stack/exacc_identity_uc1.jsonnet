local one_oe = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_iam.json';
local exacc_identity = import '../exacc_identity.libsonnet';

one_oe + exacc_identity + {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LANDINGZONE-KEY'+: {
        children+: {
          'CMP-LZ-PLATFORM-KEY'+: {
            children+: {
              'CMP-LZ-SHARED-EXACC-KEY': {
                name: 'cmp-lz-shared-exacc',
                description: 'shared ExaDB-C@C platform.',
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
            },
          },
          'CMP-LZ-PROD-KEY'+: {
            children+: {
              'CMP-LZ-PROD-PLATFORM-KEY'+: {
                children+: {
                  'CMP-LZ-PROD-EXACC-KEY': {
                    name: 'cmp-lz-prod-exacc',
                    description: 'prod ExaDB-C@C platform.',
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
                  
                },
              },
              'CMP-LZ-PROD-PROJECTS-KEY'+: {
                children+: {
                  'CMP-LZ-PROD-PROJ1-KEY'+: {
                   children+: {
                  'CMP-LZ-PROD-PROJ1-DB-KEY': {
                    name: 'cmp-lz-prod-proj1-db',
                    description: 'prod ExaDB-C@C env database layer.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                    }
                  }
                  }
               },
                
                },
              },
            },
          },
          'CMP-LZ-PREPROD-KEY'+: {
            children+: {
              'CMP-LZ-PREPROD-PLATFORM-KEY'+: {
                children+: {
                  'CMP-LZ-PREPROD-EXACC-KEY': {
                    name: 'cmp-lz-preprod-exacc',
                    description: 'preprod ExaDB-C@C platform.',
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
                  
                },
              },
                'CMP-LZ-PREPROD-PROJECTS-KEY'+: {
                children+: {
                  'CMP-LZ-PREPROD-PROJ1-KEY'+: {
                   children+: {
                  'CMP-LZ-PREPROD-PROJ1-DB-KEY': {
                    name: 'cmp-lz-preprod-proj1-db',
                    description: 'preprod ExaDB-C@C env database layer.',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                    }
                  }
                  }
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






 
