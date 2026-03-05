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
      },
    },
  },
}






 