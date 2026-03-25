local one_oe = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_iam.json';
local exacs_identity = import '../exacs_identity.libsonnet';

one_oe + exacs_identity + {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LANDINGZONE-KEY'+: {
        children+: {
          'CMP-LZ-PLATFORM-KEY'+: {
            children+: {
              'CMP-LZ-EXACS-KEY': {
                name: 'cmp-lz-exacs',
                description: 'ExaCC shared Platform',
                defined_tags: {
                  'tagns-lz-role.tag-lz-role': 'lz-exacs-admin',
                },
                children: {
                  'CMP-LZ-EXACS-DB-KEY': {
                    name: 'cmp-lz-exacs-db',
                    description: 'Shared exacs Platform, db compartment',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
                    },
                  },
                  'CMP-LZ-EXACS-INFRA-KEY': {
                    name: 'cmp-lz-exacs-infra',
                    description: 'Shared exacs Platform, infra compartment',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-infra-admin',
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
                  'CMP-LZ-PROD-EXACS-KEY': {
                    name: 'cmp-lz-prod-exacs',
                    description: 'ExaCC Shared Platform',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-admin',
                    },
                    children: {
                      'CMP-LZ-PROD-EXACS-DB-KEY': {
                        name: 'cmp-lz-prod-exacs-db',
                        description: 'Shared exacs Platform, db compartment',
                        defined_tags: {
                          'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
                        },
                      },
                      'CMP-LZ-PROD-EXACS-INFRA-KEY': {
                        name: 'cmp-lz-prod-exacs-infra',
                        description: 'Shared exacs Platform, infra compartment',
                        defined_tags: {
                          'tagns-lz-role.tag-lz-role': 'lz-exacs-infra-admin',
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
                    description: 'ExaCC Prod env database layer',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
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
                  'CMP-LZ-PREPROD-EXACS-KEY': {
                    name: 'cmp-lz-preprod-exacs',
                    description: 'ExaCC Shared Platform',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-admin',
                    },
                    children: {
                      'CMP-LZ-PREPROD-EXACS-DB-KEY': {
                        name: 'cmp-lz-preprod-exacs-db',
                        description: 'Shared exacs Platform, db compartment',
                        defined_tags: {
                          'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
                        },
                      },
                      'CMP-LZ-PREPROD-EXACS-INFRA-KEY': {
                        name: 'cmp-lz-preprod-exacs-infra',
                        description: 'Shared exacs Platform, infra compartment',
                        defined_tags: {
                          'tagns-lz-role.tag-lz-role': 'lz-exacs-infra-admin',
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
                    description: 'ExaCC PreProd env database layer',
                    defined_tags: {
                      'tagns-lz-role.tag-lz-role': 'lz-exacs-db-admin',
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






 
