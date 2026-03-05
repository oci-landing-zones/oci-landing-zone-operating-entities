local exacc_identity = import './exacc_identity.libsonnet';

exacc_identity {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LZ-PROD-PLATFORM-EXACC-KEY': {
        name: 'cmp-lz-exacc',
        description: 'ExaCC Shared Platform',
        parent_id: 'CMP-LZ-PLATFORM-KEY',
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
}






 