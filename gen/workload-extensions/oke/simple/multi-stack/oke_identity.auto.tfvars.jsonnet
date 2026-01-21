local oke_identity = import '../oke_identity.libsonnet';

oke_identity {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LZ-PROD-PLATFORM-OKE-KEY': {
        name: 'cmp-lz-prod-platform-oke',
        description: 'Platform compartment for oke Prod related resources',
        parent_id: 'CMP-LZ-PROD-PLATFORM-KEY',
      },
    },
  },
}
