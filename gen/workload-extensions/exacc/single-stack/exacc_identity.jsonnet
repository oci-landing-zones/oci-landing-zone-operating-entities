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
              'CMP-LZ-PLATFORM-EXACC-KEY': {
                name: 'cmp-lz-exacc',
                description: 'ExaCC shared Platform',
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
          'CMP-LZ-PROD-KEY'+: {
            children+: {
              'CMP-LZ-PROD-PLATFORM-KEY'+: {
                children+: {
                  'CMP-LZ-PROD-PLATFORM-EXACC-KEY': {
                    name: 'cmp-lz-prod-exacc',
                    description: 'ExaCC Shared Platform',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                    },
                    children: {
                      'CMP-LZ-PROD-EXACC-DB-KEY': {
                        name: 'cmp-lz-prod-exacc-db',
                        description: 'Shared exacc Platform, db compartment',
                        defined_tags: {
                          'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                        },
                      },
                      'CMP-LZ-PROD-EXACC-INFRA-KEY': {
                        name: 'cmp-lz-prod-exacc-infra',
                        description: 'Shared exacc Platform, infra compartment',
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
                    name: 'cmp-lz-prod-exacc-db',
                    description: 'ExaCC Prod env database layer',
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
                  'CMP-LZ-PREPROD-PLATFORM-EXACC-KEY': {
                    name: 'cmp-lz-preprod-exacc',
                    description: 'ExaCC Shared Platform',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacc-admin',
                    },
                    children: {
                      'CMP-LZ-PREPROD-EXACC-DB-KEY': {
                        name: 'cmp-lz-preprod-exacc-db',
                        description: 'Shared exacc Platform, db compartment',
                        defined_tags: {
                          'tagns-lz-role.tag-lz-role': 'lz-exacc-db-admin',
                        },
                      },
                      'CMP-LZ-PREPROD-EXACC-INFRA-KEY': {
                        name: 'cmp-lz-preprod-exacc-infra',
                        description: 'Shared exacc Platform, infra compartment',
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
                    name: 'cmp-lz-preprod-exacc-db',
                    description: 'ExaCC PreProd env database layer',
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






 
